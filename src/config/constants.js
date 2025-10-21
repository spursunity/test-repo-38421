/**
 * Конфигурационные константы приложения
 * Централизованное место для всех магических чисел и настроек
 */

/**
 * Настройки игрового процесса
 */
export const GAME_CONFIG = {
  // Длина слова
  MIN_WORD_LENGTH: 5,
  MAX_WORD_LENGTH: 8,
  DEFAULT_WORD_LENGTH: 5,
  
  // Размеры игрового поля
  GRID_SIZE: 5,
  MIN_ROW: 0,
  MAX_ROW: 4,
  MIN_COL: 0,
  MAX_COL: 4,
  
  // Статусы игры
  GAME_STATUS: {
    WAITING: 'waiting',
    ACTIVE: 'active',
    FINISHED: 'finished',
    CANCELLED: 'cancelled'
  },
  
  // Номера игроков
  PLAYERS: {
    PLAYER_1: 1,
    PLAYER_2: 2
  }
}

/**
 * Настройки UI и UX
 */
export const UI_CONFIG = {
  // Таймауты уведомлений
  NOTIFICATION_TIMEOUT: 3000,
  ERROR_TIMEOUT: 5000,
  SUCCESS_TIMEOUT: 2000,
  
  // Анимации
  FADE_DURATION: 300,
  SLIDE_DURATION: 250,
  
  // Дебаунсинг
  DEBOUNCE_DELAY: 300,
  CLICK_DEBOUNCE: 100,
  INPUT_DEBOUNCE: 500,
  
  // Z-index уровни
  Z_INDEX: {
    MODAL: 1000,
    OVERLAY: 999,
    NOTIFICATION: 1001,
    TOOLTIP: 500
  }
}

/**
 * Настройки сети и API
 */
export const NETWORK_CONFIG = {
  // Retry настройки
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000,
  BACKOFF_MULTIPLIER: 2,
  
  // Таймауты запросов
  REQUEST_TIMEOUT: 10000,
  REALTIME_TIMEOUT: 30000,
  
  // Интервалы опроса
  POLLING_INTERVAL: 5000,
  HEARTBEAT_INTERVAL: 30000
}

/**
 * Валидация и ограничения
 */
export const VALIDATION_CONFIG = {
  // Длина ID комнаты (UUID)
  ROOM_ID_LENGTH: 36,
  
  // Минимальная длина никнейма
  MIN_NICKNAME_LENGTH: 2,
  MAX_NICKNAME_LENGTH: 20,
  
  // Регулярные выражения
  REGEX: {
    UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    WORD: /^[а-яё]+$/i,
    SAFE_STRING: /^[a-zA-Zа-яёА-ЯЁ0-9\s-_]+$/
  }
}

/**
 * Текстовые сообщения
 */
export const MESSAGES = {
  ERRORS: {
    NETWORK_ERROR: 'Ошибка сети. Проверьте подключение к интернету.',
    ROOM_NOT_FOUND: 'Комната не найдена. Проверьте правильность ID.',
    GAME_FULL: 'В игре уже максимальное количество игроков.',
    INVALID_MOVE: 'Недопустимый ход. Попробуйте еще раз.',
    SESSION_EXPIRED: 'Сессия истекла. Перезагрузите страницу.',
    VALIDATION_ERROR: 'Некорректные данные. Проверьте ввод.'
  },
  
  SUCCESS: {
    GAME_CREATED: 'Игра создана успешно!',
    PLAYER_JOINED: 'Противник присоединился! Игра начинается!',
    WORD_GUESSED: 'Правильно! Вы угадали слово!',
    ROOM_COPIED: 'ID комнаты скопирован в буфер обмена!'
  },
  
  INFO: {
    WAITING_PLAYER: 'Ожидание второго игрока...',
    YOUR_TURN: 'Ваш ход',
    OPPONENT_TURN: 'Ход противника',
    GAME_OVER: 'Игра окончена'
  }
}

/**
 * Настройки для разработки/отладки
 */
export const DEBUG_CONFIG = {
  // Включить логирование
  ENABLE_LOGGING: process.env.NODE_ENV !== 'production',
  
  // Уровни логирования
  LOG_LEVELS: {
    ERROR: 0,
    WARN: 1,
    INFO: 2,
    DEBUG: 3
  },
  
  // Показывать производительность
  SHOW_PERFORMANCE: process.env.NODE_ENV === 'development'
}