/**
 * Класс для игровых ошибок
 */
export class GameError extends Error {
  constructor(code, message, details = null) {
    super(message)
    this.name = 'GameError'
    this.code = code
    this.details = details
  }
}

/**
 * Маппинг кодов ошибок на человеко-читаемые сообщения
 */
const ERROR_MESSAGES = {
  // Клиентские ошибки
  INVALID_INPUT: 'Некорректный ввод данных',
  NOT_YOUR_TURN: 'Сейчас не ваш ход',
  CELL_ALREADY_REVEALED: 'Эта клетка уже открыта',
  ROOM_NOT_FOUND: 'Игровая комната не найдена',
  ROOM_FULL: 'В комнате уже два игрока',
  ROOM_ALREADY_ACTIVE: 'Игра уже началась',
  NOT_A_PLAYER: 'Вы не являетесь участником этой игры',
  CANNOT_JOIN_OWN_GAME: 'Нельзя присоединиться к своей игре',
  INVALID_COORDINATES: 'Некорректные координаты клетки',
  GAME_NOT_FOUND_OR_INACTIVE: 'Игра не найдена или неактивна',

  // Серверные ошибки
  DATABASE_ERROR: 'Ошибка базы данных',
  AUTHENTICATION_FAILED: 'Ошибка аутентификации',
  INTERNAL_ERROR: 'Внутренняя ошибка сервера',

  // Прочие
  UNKNOWN_ERROR: 'Произошла неизвестная ошибка',
  NETWORK_ERROR: 'Ошибка сети, проверьте подключение',
  TIMEOUT_ERROR: 'Превышено время ожидания'
}

/**
 * Обработчик ошибок
 * @param {Error} error - Объект ошибки
 * @returns {GameError}
 */
export function handleError(error) {
  console.error('Game error:', error)

  // Если уже GameError, возвращаем как есть
  if (error instanceof GameError) {
    return error
  }

  // Специфичные ошибки Supabase
  if (error.code === 'PGRST116') {
    return new GameError('NOT_FOUND', ERROR_MESSAGES.ROOM_NOT_FOUND)
  }

  if (error.message?.includes('JWT') || error.message?.includes('auth')) {
    return new GameError('AUTH_ERROR', ERROR_MESSAGES.AUTHENTICATION_FAILED)
  }

  // Сетевые ошибки
  if (error.message?.includes('network') || error.message?.includes('Failed to fetch')) {
    return new GameError('NETWORK_ERROR', ERROR_MESSAGES.NETWORK_ERROR)
  }

  if (error.message?.includes('timeout')) {
    return new GameError('TIMEOUT_ERROR', ERROR_MESSAGES.TIMEOUT_ERROR)
  }

  // Ошибки из RPC функций
  if (error.message) {
    for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
      if (error.message.includes(code)) {
        return new GameError(code, message, error.message)
      }
    }
  }

  // Общая ошибка
  return new GameError('UNKNOWN_ERROR', ERROR_MESSAGES.UNKNOWN_ERROR, error.message)
}

/**
 * Retry стратегия для сетевых ошибок
 * @param {Function} operation - Асинхронная операция
 * @param {number} maxRetries - Максимальное количество попыток
 * @param {number} delay - Задержка между попытками (мс)
 * @returns {Promise}
 */
export async function retryOperation(operation, maxRetries = 3, delay = 1000) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxRetries) {
        throw error
      }

      // Проверяем, является ли ошибка сетевой
      const gameError = handleError(error)
      if (gameError.code === 'NETWORK_ERROR' || gameError.code === 'TIMEOUT_ERROR') {
        console.log(`Retry attempt ${attempt}/${maxRetries} after ${delay}ms`)
        await new Promise(resolve => setTimeout(resolve, delay * attempt))
        continue
      }

      // Если ошибка не сетевая, не повторяем
      throw error
    }
  }
}

/**
 * Отображение ошибки пользователю (заглушка для UI)
 * @param {GameError} error - Объект ошибки
 */
export function showErrorToUser(error) {
  // Эта функция будет реализована в компонентах UI
  console.error('USER ERROR:', error.message)
  // TODO: показать уведомление в UI
}
