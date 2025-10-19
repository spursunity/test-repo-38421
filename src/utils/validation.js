/**
 * Валидация длины слова
 * @param {number} length - Длина слова
 * @returns {{valid: boolean, error?: string}}
 */
export function validateWordLength(length) {
  if (typeof length !== 'number' || !Number.isInteger(length)) {
    return { valid: false, error: 'Длина должна быть целым числом' }
  }
  if (length < 5 || length > 8) {
    return { valid: false, error: 'Длина слова должна быть от 5 до 8 букв' }
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
  if (row < 0 || row > 4 || col < 0 || col > 4) {
    return { valid: false, error: 'Координаты должны быть в диапазоне 0-4' }
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
  if (trimmed.length < 5 || trimmed.length > 8) {
    return { valid: false, error: 'Длина слова должна быть от 5 до 8 символов' }
  }

  // Проверка на кириллицу
  const cyrillicRegex = /^[А-ЯЁ]+$/i
  if (!cyrillicRegex.test(trimmed)) {
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}
