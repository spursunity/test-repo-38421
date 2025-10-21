import { GAME_CONFIG, VALIDATION_CONFIG } from '../config/constants.js'

/**
 * Валидация длины слова
 * @param {number} length - Длина слова
 * @returns {{valid: boolean, error?: string}}
 */
export function validateWordLength(length) {
  if (typeof length !== 'number' || !Number.isInteger(length)) {
    return { valid: false, error: 'Длина должна быть целым числом' }
  }
  if (length < GAME_CONFIG.MIN_WORD_LENGTH || length > GAME_CONFIG.MAX_WORD_LENGTH) {
    return { 
      valid: false, 
      error: `Длина слова должна быть от ${GAME_CONFIG.MIN_WORD_LENGTH} до ${GAME_CONFIG.MAX_WORD_LENGTH} букв` 
    }
  }
  return { valid: true }
}

/**
 * Валидация координат клетки
 * @param {number} row - Номер строки
 * @param {number} col - Номер столбца
 * @returns {{valid: boolean, error?: string}}
 */
export function validateCellCoordinates(row, col) {
  if (!Number.isInteger(row) || !Number.isInteger(col)) {
    return { valid: false, error: 'Координаты должны быть целыми числами' }
  }
  if (row < GAME_CONFIG.MIN_ROW || row > GAME_CONFIG.MAX_ROW || 
      col < GAME_CONFIG.MIN_COL || col > GAME_CONFIG.MAX_COL) {
    return { 
      valid: false, 
      error: `Координаты должны быть в диапазоне ${GAME_CONFIG.MIN_ROW}-${GAME_CONFIG.MAX_ROW}` 
    }
  }
  return { valid: true }
}

/**
 * Валидация ввода слова игроком
 * @param {string} word - Введенное слово
 * @returns {{valid: boolean, normalized?: string, error?: string}}
 */
export function validateGuessInput(word) {
  if (!word || typeof word !== 'string') {
    return { valid: false, error: 'Слово не может быть пустым' }
  }

  const trimmed = word.trim()
  if (trimmed.length < GAME_CONFIG.MIN_WORD_LENGTH || trimmed.length > GAME_CONFIG.MAX_WORD_LENGTH) {
    return { 
      valid: false, 
      error: `Длина слова должна быть от ${GAME_CONFIG.MIN_WORD_LENGTH} до ${GAME_CONFIG.MAX_WORD_LENGTH} символов` 
    }
  }

  // Проверка на кириллицу
  if (!VALIDATION_CONFIG.REGEX.WORD.test(trimmed)) {
    return { valid: false, error: 'Слово должно содержать только русские буквы' }
  }

  return {
    valid: true,
    normalized: trimmed.toUpperCase()
  }
}

/**
 * Валидация UUID
 * @param {string} uuid - UUID строка
 * @returns {boolean}
 */
export function validateUUID(uuid) {
  if (!uuid || typeof uuid !== 'string') {
    return false
  }
  return VALIDATION_CONFIG.REGEX.UUID.test(uuid)
}

/**
 * Санитизация строки для предотвращения XSS
 * @param {string} input - Входная строка
 * @returns {string} Безопасная строка
 */
export function sanitizeString(input) {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Удаляем HTML теги и опасные символы
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
}

/**
 * Валидация ID комнаты с санитизацией
 * @param {string} roomId - ID комнаты
 * @returns {{valid: boolean, sanitized?: string, error?: string}}
 */
export function validateAndSanitizeRoomId(roomId) {
  if (!roomId || typeof roomId !== 'string') {
    return { valid: false, error: 'ID комнаты не может быть пустым' }
  }
  
  const sanitized = sanitizeString(roomId)
  
  if (sanitized.length !== VALIDATION_CONFIG.ROOM_ID_LENGTH) {
    return { valid: false, error: 'Некорректная длина ID комнаты' }
  }
  
  if (!validateUUID(sanitized)) {
    return { valid: false, error: 'Некорректный формат ID комнаты' }
  }
  
  return {
    valid: true,
    sanitized: sanitized
  }
}

/**
 * Валидация никнейма с санитизацией
 * @param {string} nickname - Никнейм пользователя
 * @returns {{valid: boolean, sanitized?: string, error?: string}}
 */
export function validateAndSanitizeNickname(nickname) {
  if (!nickname || typeof nickname !== 'string') {
    return { valid: false, error: 'Никнейм не может быть пустым' }
  }
  
  const sanitized = sanitizeString(nickname)
  
  if (sanitized.length < VALIDATION_CONFIG.MIN_NICKNAME_LENGTH || 
      sanitized.length > VALIDATION_CONFIG.MAX_NICKNAME_LENGTH) {
    return { 
      valid: false, 
      error: `Длина никнейма должна быть от ${VALIDATION_CONFIG.MIN_NICKNAME_LENGTH} до ${VALIDATION_CONFIG.MAX_NICKNAME_LENGTH} символов` 
    }
  }
  
  if (!VALIDATION_CONFIG.REGEX.SAFE_STRING.test(sanitized)) {
    return { valid: false, error: 'Никнейм содержит недопустимые символы' }
  }
  
  return {
    valid: true,
    sanitized: sanitized
  }
}

/**
 * Общая функция валидации входных данных
 * @param {Object} data - Объект с данными для валидации
 * @param {Object} rules - Правила валидации
 * @returns {{valid: boolean, errors: Array<string>, sanitized?: Object}}
 */
export function validateInput(data, rules) {
  const errors = []
  const sanitized = {}
  
  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field]
    
    if (rule.required && (!value || (typeof value === 'string' && !value.trim()))) {
      errors.push(`${field} обязательно для заполнения`)
      continue
    }
    
    if (value) {
      if (rule.type === 'string') {
        const sanitizedValue = sanitizeString(value)
        sanitized[field] = sanitizedValue
        
        if (rule.minLength && sanitizedValue.length < rule.minLength) {
          errors.push(`${field} должно содержать минимум ${rule.minLength} символов`)
        }
        if (rule.maxLength && sanitizedValue.length > rule.maxLength) {
          errors.push(`${field} должно содержать максимум ${rule.maxLength} символов`)
        }
        if (rule.pattern && !rule.pattern.test(sanitizedValue)) {
          errors.push(`${field} имеет неправильный формат`)
        }
      } else if (rule.type === 'number') {
        const numValue = Number(value)
        if (isNaN(numValue)) {
          errors.push(`${field} должно быть числом`)
        } else {
          sanitized[field] = numValue
          if (rule.min !== undefined && numValue < rule.min) {
            errors.push(`${field} должно быть не менее ${rule.min}`)
          }
          if (rule.max !== undefined && numValue > rule.max) {
            errors.push(`${field} должно быть не более ${rule.max}`)
          }
        }
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
    sanitized: errors.length === 0 ? sanitized : undefined
  }
}