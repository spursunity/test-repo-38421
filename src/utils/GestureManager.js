/**
 * Константы для настройки жестов
 * Значения основаны на рекомендациях iOS/Android HIG
 */
const GESTURE_CONFIG = {
  // Минимальное расстояние для свайпа (px) - достаточно для уверенного распознавания
  SWIPE_THRESHOLD: 50,
  // Максимальное время для свайпа (мс) - соответствует быстрому жесту
  SWIPE_MAX_TIME: 300,
  // Задержка между тапами для double-tap (мс) - стандарт для touch устройств
  DOUBLE_TAP_DELAY: 300,
  // Время удержания для long-press (мс) - соответствует стандартам iOS/Android
  LONG_PRESS_DELAY: 500,
  // Минимальное изменение для pinch (px) - чувствительность pinch-жестов
  PINCH_THRESHOLD: 10,
  // Максимальное отклонение для tap (px) - погрешность пальца
  TAP_MAX_DEVIATION: 10,
  // Максимальное время для tap (мс) - отличие от long-press
  TAP_MAX_DURATION: 200,
  // Минимальное движение для начала dragging (px)
  DRAG_THRESHOLD: 10,
  // Время для visual feedback (мс)
  FEEDBACK_DURATION: 150,
  // Сила вибрации (мс)
  VIBRATION_DURATION: 50
}

/**
 * Утилита для debouncing частых вызовов
 */
class Debouncer {
  constructor() {
    this.timers = new Map()
  }

  debounce(key, callback, delay = 100) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }
    
    const timerId = setTimeout(() => {
      callback()
      this.timers.delete(key)
    }, delay)
    
    this.timers.set(key, timerId)
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }
}

/**
 * Менеджер жестов для мобильных устройств
 * Обрабатывает swipe, double-tap, long-press жесты с оптимизацией производительности
 */
export class GestureManager {
  constructor(config = {}) {
    // Состояние касания
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchStartTime = 0
    this.lastTap = 0
    this.tapTimeout = null
    this.longPressTimeout = null
    this.isLongPress = false
    this.isDragging = false
    this.isDestroyed = false
    
    // Конфигурация с возможностью переопределения
    this.config = { ...GESTURE_CONFIG, ...config }
    
    // Debouncer для оптимизации частых вызовов
    this.debouncer = new Debouncer()
    
    // Колбеки для различных жестов
    this.handlers = {
      swipeLeft: [],
      swipeRight: [],
      swipeUp: [],
      swipeDown: [],
      doubleTap: [],
      longPress: [],
      tap: []
    }

    // Связанные методы для правильного удаления event listeners
    this.boundHandlers = {
      touchStart: this.handleTouchStart.bind(this),
      touchMove: this.handleTouchMove.bind(this),
      touchEnd: this.handleTouchEnd.bind(this),
      pointerDown: this.handlePointerDown.bind(this),
      pointerMove: this.handlePointerMove.bind(this),
      pointerUp: this.handlePointerUp.bind(this)
    }

    // Элементы, к которым привязаны обработчики
    this.attachedElements = new WeakSet()
  }

  /**
   * Инициализация менеджера жестов для элемента
   * @param {HTMLElement} element - DOM элемент
   * @returns {boolean} - успешность инициализации
   */
  init(element) {
    if (!this.validateElement(element)) {
      return false
    }

    if (this.attachedElements.has(element)) {
      console.warn('GestureManager: Элемент уже инициализирован')
      return true
    }

    try {
      this.setupTouchEvents(element)
      this.attachedElements.add(element)
      
      console.log('GestureManager успешно инициализирован для элемента')
      return true
    } catch (error) {
      console.error('GestureManager: Ошибка инициализации:', error)
      return false
    }
  }

  /**
   * Валидация DOM элемента
   */
  validateElement(element) {
    if (!element) {
      console.error('GestureManager: Элемент не найден')
      return false
    }

    if (!(element instanceof HTMLElement)) {
      console.error('GestureManager: Переданный объект не является DOM элементом')
      return false
    }

    if (this.isDestroyed) {
      console.error('GestureManager: Менеджер был уничтожен, создайте новый экземпляр')
      return false
    }

    return true
  }

  /**
   * Настройка touch событий для элемента
   */
  setupTouchEvents(element) {
    // Настройки для предотвращения стандартного поведения
    element.style.touchAction = 'manipulation'
    
    // Touch события - используем passive где это возможно
    element.addEventListener('touchstart', this.boundHandlers.touchStart, { 
      passive: true // Можем использовать passive для touchstart
    })
    element.addEventListener('touchmove', this.boundHandlers.touchMove, { 
      passive: true // Passive для лучшей производительности
    })
    element.addEventListener('touchend', this.boundHandlers.touchEnd, { 
      passive: true 
    })
    
    // Pointer события для лучшей совместимости (только если поддерживается)
    if ('PointerEvent' in window) {
      element.addEventListener('pointerdown', this.boundHandlers.pointerDown, { passive: true })
      element.addEventListener('pointermove', this.boundHandlers.pointerMove, { passive: true })
      element.addEventListener('pointerup', this.boundHandlers.pointerUp, { passive: true })
    }
  }

  /**
   * Удаление event listeners с элемента
   */
  removeEventListeners(element) {
    if (!element) return

    element.removeEventListener('touchstart', this.boundHandlers.touchStart)
    element.removeEventListener('touchmove', this.boundHandlers.touchMove)
    element.removeEventListener('touchend', this.boundHandlers.touchEnd)
    
    if ('PointerEvent' in window) {
      element.removeEventListener('pointerdown', this.boundHandlers.pointerDown)
      element.removeEventListener('pointermove', this.boundHandlers.pointerMove)
      element.removeEventListener('pointerup', this.boundHandlers.pointerUp)
    }
  }

  /**
   * Добавление обработчика для жеста
   * @param {string} gesture - тип жеста
   * @param {function} callback - функция обратного вызова
   * @returns {boolean} - успешность добавления
   */
  on(gesture, callback) {
    if (!this.validateGestureHandler(gesture, callback)) {
      return false
    }

    this.handlers[gesture].push(callback)
    return true
  }

  /**
   * Удаление обработчика жеста
   * @param {string} gesture - тип жеста
   * @param {function} callback - функция обратного вызова
   * @returns {boolean} - успешность удаления
   */
  off(gesture, callback) {
    if (!this.handlers[gesture]) {
      console.warn(`GestureManager: Неизвестный жест "${gesture}"`)
      return false
    }

    const index = this.handlers[gesture].indexOf(callback)
    if (index > -1) {
      this.handlers[gesture].splice(index, 1)
      return true
    }
    
    return false
  }

  /**
   * Валидация обработчика жеста
   */
  validateGestureHandler(gesture, callback) {
    if (!this.handlers[gesture]) {
      console.error(`GestureManager: Неизвестный жест "${gesture}"`)
      console.log('Доступные жесты:', Object.keys(this.handlers))
      return false
    }

    if (typeof callback !== 'function') {
      console.error('GestureManager: Callback должен быть функцией')
      return false
    }

    return true
  }

  /**
   * Безопасный вызов всех обработчиков для жеста
   */
  trigger(gesture, data = {}) {
    if (this.isDestroyed || !this.handlers[gesture]) {
      return
    }

    // Используем debouncing для частых жестов как swipeUp
    if (['swipeUp', 'swipeDown'].includes(gesture)) {
      this.debouncer.debounce(gesture, () => {
        this.executeHandlers(gesture, data)
      }, 200) // 200ms debounce для swipe up/down
    } else {
      this.executeHandlers(gesture, data)
    }
  }

  /**
   * Выполнение обработчиков жеста
   */
  executeHandlers(gesture, data) {
    this.handlers[gesture].forEach((callback, index) => {
      try {
        callback(data)
      } catch (error) {
        console.error(`GestureManager: Ошибка в обработчике ${gesture}[${index}]:`, error)
        // Логируем детальную информацию об ошибке
        if (error.stack) {
          console.error('Stack trace:', error.stack)
        }
      }
    })
  }

  /**
   * Обработка начала касания
   */
  handleTouchStart(event) {
    if (this.isDestroyed || event.touches.length !== 1) {
      return
    }

    const touch = event.touches[0]
    this.touchStartX = touch.clientX
    this.touchStartY = touch.clientY
    this.touchStartTime = performance.now() // Используем performance.now() для точности
    this.isDragging = false
    this.isLongPress = false

    // Очищаем предыдущие таймеры
    this.clearTimeouts()

    // Запускаем таймер для long-press
    this.longPressTimeout = setTimeout(() => {
      if (!this.isDragging && !this.isDestroyed) {
        this.isLongPress = true
        this.trigger('longPress', {
          x: this.touchStartX,
          y: this.touchStartY,
          target: event.target,
          timestamp: performance.now()
        })
        
        // Вибрация для обратной связи (с проверкой поддержки)
        this.triggerVibration()
      }
    }, this.config.LONG_PRESS_DELAY)
  }

  /**
   * Обработка движения касания
   */
  handleTouchMove(event) {
    if (this.isDestroyed || event.touches.length !== 1) {
      return
    }

    const touch = event.touches[0]
    const deltaX = Math.abs(touch.clientX - this.touchStartX)
    const deltaY = Math.abs(touch.clientY - this.touchStartY)
    
    // Если движение превышает порог, это не tap и не long-press
    if (deltaX > this.config.DRAG_THRESHOLD || deltaY > this.config.DRAG_THRESHOLD) {
      this.isDragging = true
      this.clearTimeouts()
    }
  }

  /**
   * Обработка окончания касания
   */
  handleTouchEnd(event) {
    if (this.isDestroyed) {
      return
    }

    this.clearTimeouts()
    
    if (event.changedTouches.length !== 1) {
      return
    }

    const touch = event.changedTouches[0]
    const touchEndTime = performance.now()
    const touchDuration = touchEndTime - this.touchStartTime
    
    const deltaX = touch.clientX - this.touchStartX
    const deltaY = touch.clientY - this.touchStartY
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    
    // Если это был long-press, не обрабатываем дальше
    if (this.isLongPress) {
      return
    }
    
    // Проверяем, является ли это свайпом
    if (distance > this.config.SWIPE_THRESHOLD && touchDuration < this.config.SWIPE_MAX_TIME) {
      const direction = this.getSwipeDirection(deltaX, deltaY)
      this.trigger(`swipe${direction}`, {
        startX: this.touchStartX,
        startY: this.touchStartY,
        endX: touch.clientX,
        endY: touch.clientY,
        distance: distance,
        duration: touchDuration,
        target: event.target,
        timestamp: touchEndTime
      })
      return
    }
    
    // Проверяем, является ли это tap или double-tap
    if (distance < this.config.TAP_MAX_DEVIATION && touchDuration < this.config.TAP_MAX_DURATION) {
      const currentTime = performance.now()
      
      // Проверяем double-tap
      if (currentTime - this.lastTap < this.config.DOUBLE_TAP_DELAY) {
        clearTimeout(this.tapTimeout)
        this.trigger('doubleTap', {
          x: touch.clientX,
          y: touch.clientY,
          target: event.target,
          timestamp: currentTime
        })
        this.lastTap = 0
      } else {
        // Откладываем single tap, чтобы дождаться возможного double-tap
        this.tapTimeout = setTimeout(() => {
          if (!this.isDestroyed) {
            this.trigger('tap', {
              x: touch.clientX,
              y: touch.clientY,
              target: event.target,
              timestamp: currentTime
            })
          }
        }, this.config.DOUBLE_TAP_DELAY)
        this.lastTap = currentTime
      }
    }
  }

  /**
   * Определение направления свайпа
   */
  getSwipeDirection(deltaX, deltaY) {
    const absDeltaX = Math.abs(deltaX)
    const absDeltaY = Math.abs(deltaY)
    
    if (absDeltaX > absDeltaY) {
      return deltaX > 0 ? 'Right' : 'Left'
    } else {
      return deltaY > 0 ? 'Down' : 'Up'
    }
  }

  /**
   * Обработка Pointer events (для лучшей совместимости)
   */
  handlePointerDown(event) {
    if (event.pointerType === 'touch') {
      this.handleTouchStart({
        touches: [event],
        target: event.target
      })
    }
  }

  handlePointerMove(event) {
    if (event.pointerType === 'touch') {
      this.handleTouchMove({
        touches: [event]
      })
    }
  }

  handlePointerUp(event) {
    if (event.pointerType === 'touch') {
      this.handleTouchEnd({
        changedTouches: [event],
        target: event.target
      })
    }
  }

  /**
   * Очистка всех таймеров
   */
  clearTimeouts() {
    if (this.longPressTimeout) {
      clearTimeout(this.longPressTimeout)
      this.longPressTimeout = null
    }
    if (this.tapTimeout) {
      clearTimeout(this.tapTimeout)
      this.tapTimeout = null
    }
  }

  /**
   * Вызов вибрации с проверкой поддержки
   */
  triggerVibration() {
    if (navigator.vibrate && typeof navigator.vibrate === 'function') {
      try {
        navigator.vibrate(this.config.VIBRATION_DURATION)
      } catch (error) {
        // Игнорируем ошибки вибрации
      }
    }
  }

  /**
   * Получение текущей конфигурации
   */
  getConfig() {
    return { ...this.config }
  }

  /**
   * Обновление конфигурации
   * @param {object} newConfig - новые настройки
   */
  updateConfig(newConfig) {
    if (typeof newConfig === 'object' && newConfig !== null) {
      this.config = { ...this.config, ...newConfig }
      return true
    }
    return false
  }

  /**
   * Проверка состояния менеджера
   */
  isActive() {
    return !this.isDestroyed
  }

  /**
   * Очистка всех ресурсов и обработчиков
   */
  destroy() {
    if (this.isDestroyed) {
      return
    }

    // Очищаем таймеры
    this.clearTimeouts()
    
    // Очищаем debouncer
    this.debouncer.clear()
    
    // Очищаем все обработчики
    Object.keys(this.handlers).forEach(gesture => {
      this.handlers[gesture] = []
    })

    // Помечаем как уничтоженный
    this.isDestroyed = true
    
    console.log('GestureManager успешно уничтожен')
  }
}

/**
 * Утилитарные функции для работы с жестами
 */
export const GestureUtils = {
  /**
   * Проверка поддержки touch событий
   */
  isTouchDevice() {
    return (
      'ontouchstart' in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0
    )
  },

  /**
   * Проверка поддержки Pointer Events
   */
  supportsPointerEvents() {
    return 'PointerEvent' in window
  },

  /**
   * Получение координат касания из события
   */
  getTouchCoords(event) {
    if (event.touches && event.touches.length > 0) {
      return {
        x: event.touches[0].clientX,
        y: event.touches[0].clientY
      }
    }
    return {
      x: event.clientX || 0,
      y: event.clientY || 0
    }
  },

  /**
   * Вычисление расстояния между двумя точками
   */
  getDistance(point1, point2) {
    if (!point1 || !point2) {
      return 0
    }
    
    const deltaX = point2.x - point1.x
    const deltaY = point2.y - point1.y
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  },

  /**
   * Предотвращение стандартного поведения браузера для жестов
   */
  preventGestureDefaults(element) {
    if (!(element instanceof HTMLElement)) {
      console.warn('GestureUtils.preventGestureDefaults: переданный объект не является DOM элементом')
      return false
    }

    element.style.touchAction = 'manipulation'
    element.style.userSelect = 'none'
    element.style.webkitUserSelect = 'none'
    element.style.webkitTouchCallout = 'none'
    element.style.webkitTapHighlightColor = 'transparent'
    
    return true
  },

  /**
   * Добавление визуальной обратной связи при касании
   */
  addTouchFeedback(element, className = 'touch-active') {
    if (!(element instanceof HTMLElement)) {
      console.warn('GestureUtils.addTouchFeedback: переданный объект не является DOM элементом')
      return null
    }

    let activeTimeout = null
    
    const addActive = () => {
      element.classList.add(className)
      if (activeTimeout) {
        clearTimeout(activeTimeout)
      }
    }
    
    const removeActive = () => {
      if (activeTimeout) {
        clearTimeout(activeTimeout)
      }
      activeTimeout = setTimeout(() => {
        element.classList.remove(className)
      }, GESTURE_CONFIG.FEEDBACK_DURATION)
    }
    
    // Используем passive события для лучшей производительности
    element.addEventListener('touchstart', addActive, { passive: true })
    element.addEventListener('touchend', removeActive, { passive: true })
    element.addEventListener('touchcancel', removeActive, { passive: true })

    // Возвращаем функцию для удаления обработчиков
    return () => {
      element.removeEventListener('touchstart', addActive)
      element.removeEventListener('touchend', removeActive)
      element.removeEventListener('touchcancel', removeActive)
      
      if (activeTimeout) {
        clearTimeout(activeTimeout)
      }
    }
  },

  /**
   * Проверка, находится ли точка внутри элемента
   */
  isPointInElement(x, y, element) {
    if (!(element instanceof HTMLElement)) {
      return false
    }

    const rect = element.getBoundingClientRect()
    return (
      x >= rect.left &&
      x <= rect.right &&
      y >= rect.top &&
      y <= rect.bottom
    )
  },

  /**
   * Получение размера touch target
   */
  getTouchTargetSize(element) {
    if (!(element instanceof HTMLElement)) {
      return null
    }

    const rect = element.getBoundingClientRect()
    return {
      width: rect.width,
      height: rect.height,
      area: rect.width * rect.height
    }
  },

  /**
   * Проверка соответствия touch target рекомендациям (минимум 48x48px)
   */
  isAccessibleTouchTarget(element) {
    const size = this.getTouchTargetSize(element)
    if (!size) return false

    const MIN_SIZE = 48 // Минимальный рекомендуемый размер в px
    return size.width >= MIN_SIZE && size.height >= MIN_SIZE
  }
}