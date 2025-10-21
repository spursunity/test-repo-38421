/**
 * Система логирования для игры
 */
class GameLogger {
  constructor() {
    this.logs = []
    this.maxLogs = 1000
    this.isProduction = import.meta.env.PROD
  }

  /**
   * Добавление лога
   * @param {string} level - Уровень: info, warn, error
   * @param {string} message - Сообщение
   * @param {*} data - Дополнительные данные
   */
  log(level, message, data = null) {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      data,
      url: window.location.href
    }

    this.logs.push(entry)

    // Ограничиваем размер массива логов
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }

    // В production отправляем error в мониторинг
    if (this.isProduction && level === 'error') {
      this.sendToMonitoring(entry)
    }

    // Дублируем в консоль
    console[level](message, data)
  }

  info(message, data) {
    this.log('info', message, data)
  }

  warn(message, data) {
    this.log('warn', message, data)
  }

  error(message, data) {
    this.log('error', message, data)
  }

  /**
   * Отправка критических ошибок в систему мониторинга
   * @param {object} entry - Запись лога
   */
  sendToMonitoring(entry) {
    // TODO: Интеграция с Sentry, LogRocket и т.д.
    console.log('[MONITORING]', entry)
  }

  /**
   * Получение всех логов
   * @returns {Array}
   */
  getLogs() {
    return this.logs
  }

  /**
   * Очистка логов
   */
  clear() {
    this.logs = []
  }

  /**
   * Экспорт логов в JSON
   * @returns {string}
   */
  exportLogs() {
    return JSON.stringify(this.logs, null, 2)
  }
}

// Singleton instance
export const logger = new GameLogger()

/**
 * Performance Monitor
 */
class PerformanceMonitor {
  constructor() {
    this.metrics = {}
  }

  /**
   * Начало измерения
   * @param {string} name - Название операции
   */
  startMeasure(name) {
    this.metrics[name] = {
      start: performance.now()
    }
  }

  /**
   * Завершение измерения
   * @param {string} name - Название операции
   * @returns {number} - Длительность в мс
   */
  endMeasure(name) {
    if (!this.metrics[name]) {
      logger.warn(`Метрика ${name} не была начата`)
      return 0
    }

    const duration = performance.now() - this.metrics[name].start
    this.metrics[name].duration = duration

    // Предупреждение о медленных операциях
    if (duration > 500) {
      logger.warn(`Медленная операция: ${name}`, { duration: `${duration.toFixed(2)}ms` })
    }

    return duration
  }

  /**
   * Получение всех метрик
   * @returns {object}
   */
  getMetrics() {
    return this.metrics
  }
}

export const perfMonitor = new PerformanceMonitor()
