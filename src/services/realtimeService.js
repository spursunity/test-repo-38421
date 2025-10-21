import { supabase } from './supabase.js'
import { logger } from '../utils/logger.js'
import { handleError } from '../utils/errorHandler.js'

/**
 * Менеджер Realtime подписок
 */
class RealtimeManager {
  constructor() {
    this.channels = new Map()
    this.eventHandlers = new Map()
  }

  /**
   * Подписка на обновления игровой комнаты
   * @param {string} roomId - UUID комнаты
   * @param {object} callbacks - Объект с callback функциями
   * @returns {string} - ID канала
   */
  subscribeToRoom(roomId, callbacks = {}) {
    // Если уже подписаны на эту комнату, отписываемся
    if (this.channels.has(roomId)) {
      logger.warn('Уже подписаны на эту комнату, переподписка', { roomId })
      this.unsubscribeFromRoom(roomId)
    }

    logger.info('Подписка на комнату', { roomId })

    const channel = supabase
      .channel(`game_room:${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'game_rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          this.handleGameUpdate(roomId, payload, callbacks)
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          logger.info('Подписка активна', { roomId })
        } else if (status === 'CHANNEL_ERROR') {
          logger.error('Ошибка канала', { roomId, error: err })
          if (callbacks.onError) {
            callbacks.onError(handleError(err))
          }
        } else if (status === 'TIMED_OUT') {
          logger.error('Таймаут подписки', { roomId })
          if (callbacks.onError) {
            callbacks.onError(new Error('Realtime subscription timed out'))
          }
        } else if (status === 'CLOSED') {
          logger.info('Канал закрыт', { roomId })
        }
      })

    this.channels.set(roomId, channel)
    this.eventHandlers.set(roomId, callbacks)

    return roomId
  }

  /**
   * Обработка обновлений игры
   */
  handleGameUpdate(roomId, payload, callbacks) {
    logger.info('Получено обновление игры', {
      roomId,
      eventType: payload.eventType,
      table: payload.table
    })

    const { eventType, new: newRecord, old: oldRecord } = payload

    try {
      // Общий callback на любое изменение
      if (callbacks.onGameUpdate) {
        callbacks.onGameUpdate(newRecord, oldRecord, eventType)
      }

      // Специфичные callbacks
      if (eventType === 'UPDATE' && newRecord) {
        // Проверяем, присоединился ли второй игрок
        if (!oldRecord.player2_id && newRecord.player2_id) {
          logger.info('Второй игрок присоединился', { roomId })
          if (callbacks.onPlayerJoined) {
            callbacks.onPlayerJoined(newRecord)
          }
        }

        // Проверяем, открыта ли новая клетка
        if (JSON.stringify(oldRecord.board_state) !== JSON.stringify(newRecord.board_state)) {
          logger.info('Доска обновлена', { roomId })
          if (callbacks.onCellRevealed) {
            callbacks.onCellRevealed(newRecord)
          }
        }

        // Проверяем, завершилась ли игра
        if (oldRecord.status === 'active' && newRecord.status === 'finished') {
          logger.info('Игра завершена', { roomId, winner: newRecord.winner })
          if (callbacks.onGameFinished) {
            callbacks.onGameFinished(newRecord)
          }
        }
      }

      if (eventType === 'DELETE') {
        logger.warn('Игра удалена', { roomId })
        // Автоматически отписываемся
        this.unsubscribeFromRoom(roomId)
      }
    } catch (error) {
      logger.error('Ошибка обработки Realtime события', {
        roomId,
        error: error.message
      })
      if (callbacks.onError) {
        callbacks.onError(handleError(error))
      }
    }
  }

  /**
   * Отписка от комнаты
   */
  async unsubscribeFromRoom(roomId) {
    const channel = this.channels.get(roomId)
    if (!channel) {
      logger.warn('Канал не найден для отписки', { roomId })
      return
    }

    logger.info('Отписка от комнаты', { roomId })
    await supabase.removeChannel(channel)
    this.channels.delete(roomId)
    this.eventHandlers.delete(roomId)
  }

  /**
   * Отписка от всех каналов
   */
  async unsubscribeAll() {
    logger.info('Отписка от всех каналов', { count: this.channels.size })
    const unsubscribePromises = Array.from(this.channels.keys()).map(roomId =>
      this.unsubscribeFromRoom(roomId)
    )
    await Promise.all(unsubscribePromises)
  }

  /**
   * Проверка активной подписки
   */
  isSubscribed(roomId) {
    return this.channels.has(roomId)
  }

  /**
   * Получение всех активных подписок
   */
  getActiveSubscriptions() {
    return Array.from(this.channels.keys())
  }
}

// Singleton instance
export const realtimeManager = new RealtimeManager()

/**
 * Хелпер для простой подписки с обработкой ошибок
 */
export function subscribeToGameUpdates(roomId, onUpdate) {
  realtimeManager.subscribeToRoom(roomId, {
    onGameUpdate: (newRecord) => {
      onUpdate(newRecord)
    },
    onError: (error) => {
      console.error('Realtime error:', error)
    }
  })

  // Возвращаем функцию для отписки
  return () => realtimeManager.unsubscribeFromRoom(roomId)
}
