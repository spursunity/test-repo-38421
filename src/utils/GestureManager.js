/**
 * Менеджер жестов для мобильных устройств
 * Обрабатывает swipe, double-tap, long-press и pinch жесты
 */
export class GestureManager {
  constructor() {
    this.touchStartX = 0
    this.touchStartY = 0
    this.touchStartTime = 0
    this.lastTap = 0
    this.tapTimeout = null
    this.longPressTimeout = null
    this.isLongPress = false
    this.isDragging = false
    
    // Настройки жестов
    this.config = {
      swipeThreshold: 50, // Минимальное расстояние для свайпа
      swipeMaxTime: 300, // Максимальное время для свайпа (мс)
      doubleTapDelay: 300, // Задержка между тапами для double-tap
      longPressDelay: 500, // Время удержания для long-press
      pinchThreshold: 10 // Минимальное изменение для pinch
    }
    
    // Колбеки для различных жестов
    this.handlers = {
      swipeLeft: [],
      swipeRight: [],
      swipeUp: [],
      swipeDown: [],
      doubleTap: [],
      longPress: [],
      tap: [],
      pinchIn: [],
      pinchOut: []
    }
  }

  /**
   * Инициализация менеджера жестов для элемента
   */
  init(element) {
    if (!element) {
      console.warn('GestureManager: Элемент не найден')
      return
    }

    // Предотвращаем стандартное поведение
    element.style.touchAction = 'manipulation'
    
    // Touch события
    element.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false })
    element.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false })
    element.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false })
    
    // Pointer события для лучшей совместимости
    element.addEventListener('pointerdown', this.handlePointerDown.bind(this), { passive: false })
    element.addEventListener('pointermove', this.handlePointerMove.bind(this), { passive: false })
    element.addEventListener('pointerup', this.handlePointerUp.bind(this), { passive: false })
    
    console.log('GestureManager инициализирован для элемента:', element)
  }

  /**
   * Добавление обработчика для жеста
   */
  on(gesture, callback) {
    if (this.handlers[gesture]) {
      this.handlers[gesture].push(callback)
    } else {
      console.warn(`GestureManager: Неизвестный жест "${gesture}"`)
    }
  }

  /**
   * Удаление обработчика жеста
   */
  off(gesture, callback) {
    if (this.handlers[gesture]) {
      const index = this.handlers[gesture].indexOf(callback)
      if (index > -1) {
        this.handlers[gesture].splice(index, 1)
      }
    }
  }

  /**
   * Вызов всех обработчиков для жеста
   */
  trigger(gesture, data = {}) {
    if (this.handlers[gesture]) {
      this.handlers[gesture].forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error(`GestureManager: Ошибка в обработчике ${gesture}:`, error)
        }
      })
    }
  }

  /**
   * Обработка начала касания
   */
  handleTouchStart(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      this.touchStartX = touch.clientX
      this.touchStartY = touch.clientY
      this.touchStartTime = Date.now()
      this.isDragging = false
      this.isLongPress = false

      // Запускаем таймер для long-press
      this.longPressTimeout = setTimeout(() => {
        if (!this.isDragging) {
          this.isLongPress = true
          this.trigger('longPress', {
            x: this.touchStartX,
            y: this.touchStartY,
            target: event.target
          })
          
          // Вибрация для обратной связи (если поддерживается)
          if (navigator.vibrate) {
            navigator.vibrate(50)
          }
        }
      }, this.config.longPressDelay)
    }
  }

  /**
   * Обработка движения касания
   */
  handleTouchMove(event) {
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const deltaX = Math.abs(touch.clientX - this.touchStartX)
      const deltaY = Math.abs(touch.clientY - this.touchStartY)
      
      // Если движение превышает порог, это не tap и не long-press
      if (deltaX > 10 || deltaY > 10) {
        this.isDragging = true
        clearTimeout(this.longPressTimeout)
      }
    }
  }

  /**
   * Обработка окончания касания
   */
  handleTouchEnd(event) {
    clearTimeout(this.longPressTimeout)
    
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0]
      const touchEndTime = Date.now()
      const touchDuration = touchEndTime - this.touchStartTime
      
      const deltaX = touch.clientX - this.touchStartX
      const deltaY = touch.clientY - this.touchStartY
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      
      // Если это был long-press, не обрабатываем дальше
      if (this.isLongPress) {
        return
      }
      
      // Проверяем, является ли это свайпом
      if (distance > this.config.swipeThreshold && touchDuration < this.config.swipeMaxTime) {
        const direction = this.getSwipeDirection(deltaX, deltaY)
        this.trigger(`swipe${direction}`, {
          startX: this.touchStartX,
          startY: this.touchStartY,
          endX: touch.clientX,
          endY: touch.clientY,
          distance: distance,
          duration: touchDuration,
          target: event.target
        })
        return
      }
      
      // Проверяем, является ли это tap или double-tap
      if (distance < 10 && touchDuration < 200) {
        const currentTime = Date.now()
        
        // Проверяем double-tap
        if (currentTime - this.lastTap < this.config.doubleTapDelay) {
          clearTimeout(this.tapTimeout)
          this.trigger('doubleTap', {
            x: touch.clientX,
            y: touch.clientY,
            target: event.target
          })
          this.lastTap = 0
        } else {
          // Откладываем single tap, чтобы дождаться возможного double-tap
          this.tapTimeout = setTimeout(() => {
            this.trigger('tap', {
              x: touch.clientX,
              y: touch.clientY,
              target: event.target
            })
          }, this.config.doubleTapDelay)
          this.lastTap = currentTime
        }
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
    // Обрабатываем только если это касание, а не мышь
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
   * Очистка всех таймеров и обработчиков
   */
  destroy() {
    clearTimeout(this.longPressTimeout)
    clearTimeout(this.tapTimeout)
    
    // Очищаем все обработчики
    Object.keys(this.handlers).forEach(gesture => {
      this.handlers[gesture] = []
    })
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
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0
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
    return { x: event.clientX, y: event.clientY }
  },

  /**
   * Вычисление расстояния между двумя точками
   */
  getDistance(point1, point2) {
    const deltaX = point2.x - point1.x
    const deltaY = point2.y - point1.y
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  },

  /**
   * Предотвращение стандартного поведения браузера для жестов
   */
  preventGestureDefaults(element) {
    element.style.touchAction = 'manipulation'
    element.style.userSelect = 'none'
    element.style.webkitUserSelect = 'none'
    element.style.webkitTouchCallout = 'none'
  },

  /**
   * Добавление визуальной обратной связи при касании
   */
  addTouchFeedback(element, className = 'touch-active') {
    let activeTimeout = null
    
    const addActive = () => {
      element.classList.add(className)
      clearTimeout(activeTimeout)
    }
    
    const removeActive = () => {
      activeTimeout = setTimeout(() => {
        element.classList.remove(className)
      }, 150)
    }
    
    element.addEventListener('touchstart', addActive, { passive: true })
    element.addEventListener('touchend', removeActive, { passive: true })
    element.addEventListener('touchcancel', removeActive, { passive: true })
  }
}
