import { supabase } from './supabase.js'
import { validateWordLength, validateGuessInput, validateCellCoordinates, validateUUID } from '../utils/validation.js'
import { handleError, retryOperation, GameError } from '../utils/errorHandler.js'
import { logger, perfMonitor } from '../utils/logger.js'

/**
 * Создание новой игры
 * @param {number} wordLength - Длина слова (5-8)
 * @returns {Promise<{roomId: string, wordLength: number}>}
 */
export async function createGame(wordLength = 5) {
  // Валидация
  const validation = validateWordLength(wordLength)
  if (!validation.valid) {
    throw new GameError('INVALID_INPUT', validation.error)
  }

  logger.info('Создание игры', { wordLength })
  perfMonitor.startMeasure('create_game')

  try {
    const operation = async () => {
      const { data, error } = await supabase.rpc('create_game', {
        p_word_length: wordLength
      })
      if (error) throw error
      return data
    }

    const result = await retryOperation(operation)
    perfMonitor.endMeasure('create_game')
    logger.info('Игра создана', { roomId: result.room_id })

    return {
      roomId: result.room_id,
      wordLength: result.word_length
    }
  } catch (error) {
    perfMonitor.endMeasure('create_game')
    const gameError = handleError(error)
    logger.error('Ошибка создания игры', { error: gameError.message })
    throw gameError
  }
}

/**
 * Присоединение к игре
 * @param {string} roomId - UUID комнаты
 * @returns {Promise<{success: boolean, firstPlayer?: number}>}
 */
export async function joinGame(roomId) {
  // Валидация UUID
  if (!validateUUID(roomId)) {
    throw new GameError('INVALID_INPUT', 'Некорректный ID комнаты')
  }

  logger.info('Присоединение к игре', { roomId })
  perfMonitor.startMeasure('join_game')

  try {
    const operation = async () => {
      const { data, error } = await supabase.rpc('join_game', {
        p_room_id: roomId
      })
      if (error) throw error
      return data
    }

    const result = await retryOperation(operation)
    perfMonitor.endMeasure('join_game')

    if (!result.success) {
      throw new GameError(result.error, result.error)
    }

    logger.info('Присоединились к игре', { roomId, firstPlayer: result.first_player })

    return {
      success: true,
      firstPlayer: result.first_player
    }
  } catch (error) {
    perfMonitor.endMeasure('join_game')
    const gameError = handleError(error)
    logger.error('Ошибка присоединения', { roomId, error: gameError.message })
    throw gameError
  }
}

/**
 * Открытие клетки
 * @param {string} roomId - UUID комнаты
 * @param {number} row - Строка (0-4)
 * @param {number} col - Столбец (0-4)
 * @returns {Promise<{cell: object, revealedCells: number}>}
 */
export async function revealCell(roomId, row, col) {
  // Валидация
  if (!validateUUID(roomId)) {
    throw new GameError('INVALID_INPUT', 'Некорректный ID комнаты')
  }

  const coordValidation = validateCellCoordinates(row, col)
  if (!coordValidation.valid) {
    throw new GameError('INVALID_INPUT', coordValidation.error)
  }

  logger.info('Открытие клетки', { roomId, row, col })
  perfMonitor.startMeasure('reveal_cell')

  try {
    const operation = async () => {
      const { data, error } = await supabase.rpc('reveal_cell', {
        p_room_id: roomId,
        p_row: row,
        p_col: col
      })
      if (error) throw error
      return data
    }

    const result = await retryOperation(operation)
    perfMonitor.endMeasure('reveal_cell')

    if (!result.success) {
      throw new GameError(result.error, result.error)
    }

    logger.info('Клетка открыта', { cell: result.cell, revealedCells: result.revealed_cells })

    return {
      cell: result.cell,
      revealedCells: result.revealed_cells
    }
  } catch (error) {
    perfMonitor.endMeasure('reveal_cell')
    const gameError = handleError(error)
    logger.error('Ошибка открытия клетки', { roomId, row, col, error: gameError.message })
    throw gameError
  }
}

/**
 * Проверка угаданного слова
 * @param {string} roomId - UUID комнаты
 * @param {string} guessedWord - Введенное слово
 * @returns {Promise<{correct: boolean, winner?: number, word?: string, nextPlayer?: number}>}
 */
export async function validateGuess(roomId, guessedWord) {
  // Валидация
  if (!validateUUID(roomId)) {
    throw new GameError('INVALID_INPUT', 'Некорректный ID комнаты')
  }

  const wordValidation = validateGuessInput(guessedWord)
  if (!wordValidation.valid) {
    throw new GameError('INVALID_INPUT', wordValidation.error)
  }

  const normalized = wordValidation.normalized

  logger.info('Проверка слова', { roomId, word: normalized })
  perfMonitor.startMeasure('validate_guess')

  try {
    const operation = async () => {
      const { data, error } = await supabase.rpc('validate_guess', {
        p_room_id: roomId,
        p_guessed_word: normalized
      })
      if (error) throw error
      return data
    }

    const result = await retryOperation(operation)
    perfMonitor.endMeasure('validate_guess')

    if (result.success === false) {
      throw new GameError(result.error, result.error)
    }

    if (result.correct) {
      logger.info('Слово угадано!', { winner: result.winner, word: result.word })
      return {
        correct: true,
        winner: result.winner,
        word: result.word
      }
    } else {
      logger.info('Слово неправильное', { nextPlayer: result.next_player })
      return {
        correct: false,
        nextPlayer: result.next_player
      }
    }
  } catch (error) {
    perfMonitor.endMeasure('validate_guess')
    const gameError = handleError(error)
    logger.error('Ошибка проверки слова', { roomId, error: gameError.message })
    throw gameError
  }
}

/**
 * Получение состояния игры
 * @param {string} roomId - UUID комнаты
 * @returns {Promise<object>}
 */
export async function getGameState(roomId) {
  if (!validateUUID(roomId)) {
    throw new GameError('INVALID_INPUT', 'Некорректный ID комнаты')
  }

  logger.info('Получение состояния игры', { roomId })

  try {
    const { data, error } = await supabase
      .from('game_rooms_safe')
      .select('*')
      .eq('id', roomId)
      .single()

    if (error) throw error

    if (!data) {
      throw new GameError('ROOM_NOT_FOUND', 'Игра не найдена')
    }

    return data
  } catch (error) {
    const gameError = handleError(error)
    logger.error('Ошибка получения состояния', { roomId, error: gameError.message })
    throw gameError
  }
}
