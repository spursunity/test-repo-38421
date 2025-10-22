import { initAuth, supabase } from './services/supabase.js'
import { createGame, joinGame, revealCell, validateGuess, getGameState } from './services/gameService.js'
import { realtimeManager } from './services/realtimeService.js'
import { GameGrid } from './components/GameGrid.js'
import { GuessInput } from './components/GuessInput.js'
import { TurnIndicator } from './components/TurnIndicator.js'
import { GameOverScreen } from './components/GameOverScreen.js'
import { logger, perfMonitor } from './utils/logger.js'
import { handleError, GameError } from './utils/errorHandler.js'
import { GestureManager, GestureUtils } from './utils/GestureManager.js'

/**
 * Утилита для debouncing частых операций
 */
class AppDebouncer {
  constructor() {
    this.timers = new Map()
  }

  debounce(key, callback, delay = 300) {
    if (this.timers.has(key)) {
      clearTimeout(this.timers.get(key))
    }
    
    const timerId = setTimeout(() => {
      try {
        callback()
      } catch (error) {
        logger.error(`AppDebouncer: Ошибка в debounced операции ${key}:`, error)
      } finally {
        this.timers.delete(key)
      }
    }, delay)
    
    this.timers.set(key, timerId)
  }

  clear() {
    this.timers.forEach(timer => clearTimeout(timer))
    this.timers.clear()
  }
}

/**
 * Менеджер контекстных меню для очистки event listeners
 */
class ContextMenuManager {
  constructor() {
    this.activeMenu = null
    this.closeHandler = null
  }

  show(x, y, actions) {
    // Очищаем предыдущее меню
    this.hide()

    const menu = this.createMenu(x, y, actions)
    document.body.appendChild(menu)
    this.activeMenu = menu

    // Настраиваем закрытие меню
    this.setupCloseHandler()
  }

  createMenu(x, y, actions) {
    const menu = document.createElement('div')
    menu.className = 'context-menu'
    
    // Проверяем границы экрана и корректируем позицию
    const menuWidth = 200
    const menuHeight = actions.length * 40 + 16
    
    let posX = Math.max(10, Math.min(x, window.innerWidth - menuWidth - 10))
    let posY = Math.max(10, Math.min(y, window.innerHeight - menuHeight - 10))
    
    // Если меню в центре, сдвигаем его вверх
    const isCentered = Math.abs(x - window.innerWidth / 2) < 50 && Math.abs(y - window.innerHeight / 2) < 50
    if (isCentered) {
      posY = Math.max(10, y - menuHeight - 20)
    }
    
    menu.style.cssText = `
      position: fixed;
      left: ${posX}px;
      top: ${posY}px;
      z-index: 10001;
    `

    actions.forEach((action, index) => {
      const item = document.createElement('div')
      item.className = 'context-menu-item'
      item.textContent = action.text
      
      // Добавляем CSS классы из стилей
      if (action.destructive) {
        item.classList.add('context-menu-item--destructive')
      }
      
      const clickHandler = () => {
        try {
          action.action()
        } catch (error) {
          logger.error(`Ошибка в действии контекстного меню:`, error)
        } finally {
          this.hide()
        }
      }
      
      item.addEventListener('click', clickHandler)
      
      // Добавляем touch feedback
      if (GestureUtils.isTouchDevice()) {
        GestureUtils.addTouchFeedback(item)
      }
      
      menu.appendChild(item)
    })

    return menu
  }

  setupCloseHandler() {
    // Откладываем настройку, чтобы события клика по меню отработали
    setTimeout(() => {
      this.closeHandler = (event) => {
        if (this.activeMenu && !this.activeMenu.contains(event.target)) {
          this.hide()
        }
      }
      document.addEventListener('click', this.closeHandler)
      document.addEventListener('touchstart', this.closeHandler, { passive: true })
    }, 100)
  }

  hide() {
    if (this.activeMenu) {
      this.activeMenu.remove()
      this.activeMenu = null
    }
    
    if (this.closeHandler) {
      document.removeEventListener('click', this.closeHandler)
      document.removeEventListener('touchstart', this.closeHandler)
      this.closeHandler = null
    }
  }
}

/**
 * Главный класс приложения
 */
export class App {
  constructor() {
    this.state = {
      currentUser: null,
      roomId: null,
      gameState: null,
      isLoading: false,
      isCreatingGame: false // Новый флаг для предотвращения двойного создания
    }

    this.components = {
      gameGrid: null,
      guessInput: null,
      turnIndicator: null,
      gameOverScreen: null
    }

    this.ui = {
      loadingOverlay: document.getElementById('loading-overlay'),
      errorMessage: document.getElementById('error-message'),
      menuScreen: document.getElementById('menu-screen'),
      gameScreen: document.getElementById('game-screen'),
      createGameBtn: document.getElementById('create-game-btn'),
      joinGameBtn: document.getElementById('join-game-btn'),
      roomIdInput: document.getElementById('room-id-input'),
      roomIdDisplay: document.getElementById('room-id-display'),
      copyRoomIdBtn: document.getElementById('copy-room-id-btn'),
      wordLengthSelect: document.getElementById('word-length-select')
    }

    // Инициализируем менеджеры
    this.gestureManager = new GestureManager()
    this.debouncer = new AppDebouncer()
    this.contextMenuManager = new ContextMenuManager()
  }

  async init() {
    logger.info('Инициализация приложения')
    perfMonitor.startMeasure('app_init')

    try {
      this.showLoading('Инициализация...')

      this.state.currentUser = await initAuth()
      logger.info('Пользователь аутентифицирован', { userId: this.state.currentUser.id })

      this.initComponents()
      this.attachEventListeners()
      this.initGestures()
      this.checkUrlParams()

      this.hideLoading()
      perfMonitor.endMeasure('app_init')
      logger.info('Приложение инициализировано')

    } catch (error) {
      perfMonitor.endMeasure('app_init')
      this.handleError(error, 'Ошибка инициализации приложения')
    }
  }

  initComponents() {
    logger.info('Инициализация компонентов')

    this.components.gameGrid = new GameGrid('game-grid-container')
    this.components.guessInput = new GuessInput('guess-input-container')
    this.components.turnIndicator = new TurnIndicator('turn-indicator-container')
    this.components.gameOverScreen = new GameOverScreen('game-over-container')

    this.components.gameGrid.setCellClickHandler((row, col) => {
      this.handleCellClick(row, col)
    })

    this.components.guessInput.setSubmitHandler((word) => {
      this.handleGuessSubmit(word)
    })

    this.components.gameOverScreen.setNewGameHandler(() => {
      this.handleNewGame()
    })

    this.components.gameOverScreen.setShareRoomHandler(() => {
      this.handleShareRoom()
    })
  }

  attachEventListeners() {
    // Обработчик для создания игры с проверкой цели
    this.ui.createGameBtn?.addEventListener('click', (event) => {
      // Проверяем, что событие произошло именно от кнопки, а не всплыло от select
      if (event.target === this.ui.createGameBtn || this.ui.createGameBtn.contains(event.target)) {
        event.stopPropagation() // Предотвращаем всплытие
        this.handleCreateGame()
      }
    })

    // Обработчик для присоединения к игре с аналогичной проверкой
    this.ui.joinGameBtn?.addEventListener('click', (event) => {
      if (event.target === this.ui.joinGameBtn || this.ui.joinGameBtn.contains(event.target)) {
        event.stopPropagation()
        this.handleJoinGame()
      }
    })

    this.ui.copyRoomIdBtn?.addEventListener('click', () => {
      this.copyRoomId()
    })

    // Специальные обработчики для select элементов
    if (this.ui.wordLengthSelect) {
      // Предотвращаем случайное создание игры при клике на select
      this.ui.wordLengthSelect.addEventListener('click', (event) => {
        event.stopPropagation()
        logger.info('Select клик перехвачен и остановлен')
      })

      // Предотвращаем touch события на select элементах
      this.ui.wordLengthSelect.addEventListener('touchstart', (event) => {
        event.stopPropagation()
        logger.info('Select touchstart перехвачен')
      }, { passive: false })

      this.ui.wordLengthSelect.addEventListener('touchend', (event) => {
        event.stopPropagation()
        logger.info('Select touchend перехвачен')
      }, { passive: false })

      // Логирование изменений в select
      this.ui.wordLengthSelect.addEventListener('change', (event) => {
        logger.info('Изменение длины слова:', event.target.value)
      })
    }

    // Аналогичная защита для input элементов
    if (this.ui.roomIdInput) {
      this.ui.roomIdInput.addEventListener('click', (event) => {
        event.stopPropagation()
      })

      this.ui.roomIdInput.addEventListener('touchstart', (event) => {
        event.stopPropagation()
      }, { passive: false })

      this.ui.roomIdInput.addEventListener('touchend', (event) => {
        event.stopPropagation()
      }, { passive: false })
    }

    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
  }

  /**
   * Инициализация жестов для мобильных устройств
   */
  initGestures() {
    if (!GestureUtils.isTouchDevice()) {
      logger.info('Это не touch-устройство, жесты отключены')
      return
    }

    logger.info('Инициализация жестов для touch-устройства')

    // Инициализируем жесты для основного контейнера
    const success = this.gestureManager.init(document.body)
    if (!success) {
      logger.error('Не удалось инициализировать GestureManager')
      return
    }

    // Обработка swipe-жестов
    this.setupSwipeGestures()

    // Обработка tap-жестов
    this.setupTapGestures()

    // Обработка long-press жестов
    this.setupLongPressGestures()

    // Добавляем visual feedback для всех кликабельных элементов
    this.addTouchFeedback()
  }

  /**
   * Настройка swipe-жестов с debouncing
   */
  setupSwipeGestures() {
    // Swipe влево - открыть меню / вернуться назад
    this.gestureManager.on('swipeLeft', (data) => {
      logger.info('Swipe влево обнаружен', data)
      
      // Если мы на экране игры, возвращаемся в меню
      if (this.ui.gameScreen?.style.display !== 'none') {
        this.showBackToMenuConfirmation()
      }
    })

    // Swipe вправо - открыть информацию о комнате
    this.gestureManager.on('swipeRight', (data) => {
      logger.info('Swipe вправо обнаружен', data)
      
      // Показываем информацию о комнате и ссылку для приглашения
      if (this.state.roomId) {
        this.handleShareRoom()
      }
    })

    // Swipe вверх - обновить состояние игры (с debouncing)
    this.gestureManager.on('swipeUp', (data) => {
      logger.info('Swipe вверх обнаружен', data)
      
      // Обновляем состояние игры с debouncing
      if (this.state.roomId && this.ui.gameScreen?.style.display !== 'none') {
        this.debouncer.debounce('loadGameState', () => {
          this.showNotification('Обновление игры...')
          this.loadGameState()
        }, 500)
      }
    })

    // Swipe вниз - скрыть клавиатуру / свернуть открытое меню
    this.gestureManager.on('swipeDown', (data) => {
      logger.info('Swipe вниз обнаружен', data)
      
      // Сначала проверяем, если есть открытое контекстное меню
      if (this.contextMenuManager.activeMenu) {
        this.contextMenuManager.hide()
        return
      }
      
      // Убираем фокус с input элементов для скрытия клавиатуры
      const activeElement = document.activeElement
      if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
        activeElement.blur()
        this.showNotification('Клавиатура скрыта')
      }
    })
  }

  /**
   * Настройка tap-жестов
   */
  setupTapGestures() {
    // Double-tap на комнате - скопировать ID
    this.gestureManager.on('doubleTap', (data) => {
      logger.info('Double-tap обнаружен', data)
      
      // Если double-tap на room info, копируем ID
      const roomInfo = data.target?.closest('.room-info')
      if (roomInfo && this.state.roomId) {
        this.copyRoomId()
        return
      }

      // Если double-tap на экране меню, создаем быструю игру
      const menuScreen = data.target?.closest('.menu-screen')
      if (menuScreen && this.ui.menuScreen?.style.display !== 'none') {
        // Проверяем, что double-tap не на form элементах
        const isFormElement = data.target?.closest('select, input, textarea, button')
        if (!isFormElement) {
          this.showNotification('Быстрое создание игры...')
          this.handleCreateGame()
        }
      }
    })
  }

  /**
   * Настройка long-press жестов
   */
  setupLongPressGestures() {
    // Long-press на клетке - показать информацию
    this.gestureManager.on('longPress', (data) => {
      logger.info('Long-press обнаружен', data)
      
      // Проверяем, что long-press на клетке игрового поля
      const gameCell = data.target?.closest('.game-cell')
      if (gameCell) {
        this.showCellInfo(gameCell)
        return
      }

      // Long-press на комнате - показать контекстное меню
      const roomInfo = data.target?.closest('.room-info')
      if (roomInfo && this.state.roomId) {
        this.showRoomContextMenu(data.x, data.y)
        return
      }

      // Long-press на поле ввода - очистить
      const input = data.target?.closest('input[type="text"]')
      if (input && input.value) {
        this.showInputContextMenu(input, data.x, data.y)
      }
    })
  }

  /**
   * Добавление visual feedback для touch-взаимодействия
   */
  addTouchFeedback() {
    // Добавляем feedback для кнопок (но не для form элементов)
    const buttons = document.querySelectorAll('button, .menu-btn, .game-cell')
    buttons.forEach(button => {
      // Пропускаем form элементы
      if (!button.closest('select, input, textarea')) {
        const cleanup = GestureUtils.addTouchFeedback(button, 'touch-active')
        GestureUtils.preventGestureDefaults(button)
        
        // Проверяем accessibility
        if (!GestureUtils.isAccessibleTouchTarget(button)) {
          logger.warn('Элемент не соответствует рекомендациям accessibility:', button)
        }
      }
    })
  }

  /**
   * Показ информации о клетке
   */
  showCellInfo(cellElement) {
    const row = cellElement.dataset.row
    const col = cellElement.dataset.col
    const isRevealed = cellElement.classList.contains('game-cell--revealed')
    const letter = cellElement.textContent?.trim() || ''
    
    let message = `Клетка (${parseInt(row) + 1}, ${parseInt(col) + 1})`
    
    if (isRevealed) {
      message += letter ? ` - буква: ${letter}` : ' - пустая'
    } else {
      message += ' - скрыта'
    }
    
    this.showNotification(message)
  }

  /**
   * Показ контекстного меню для комнаты
   */
  showRoomContextMenu(x, y) {
    const actions = [
      {
        text: 'Копировать ID',
        action: () => this.copyRoomId()
      },
      {
        text: 'Поделиться ссылкой',
        action: () => this.handleShareRoom()
      },
      {
        text: 'Обновить состояние',
        action: () => {
          this.debouncer.debounce('refreshGameState', () => {
            this.loadGameState()
          }, 100)
        }
      }
    ]
    
    this.contextMenuManager.show(x, y, actions)
  }

  /**
   * Показ контекстного меню для input
   */
  showInputContextMenu(inputElement, x, y) {
    const actions = [
      {
        text: 'Очистить',
        action: () => {
          inputElement.value = ''
          inputElement.focus()
          this.showNotification('Поле очищено')
        }
      },
      {
        text: 'Вставить из буфера',
        action: async () => {
          try {
            // Проверяем поддержку clipboard API
            if (!navigator.clipboard || !navigator.clipboard.readText) {
              throw new Error('Clipboard API не поддерживается')
            }
            
            const text = await navigator.clipboard.readText()
            if (text) {
              inputElement.value = text
              this.showNotification('Текст вставлен')
            } else {
              this.showNotification('Буфер обмена пуст')
            }
          } catch (error) {
            logger.error('Ошибка при чтении из буфера обмена:', error)
            this.showNotification('Не удалось получить данные из буфера')
          }
        }
      }
    ]
    
    this.contextMenuManager.show(x, y, actions)
  }

  /**
   * Показ подтверждения возврата в меню
   */
  showBackToMenuConfirmation() {
    const actions = [
      {
        text: 'Да, выйти в меню',
        action: () => {
          this.handleNewGame()
        },
        destructive: true
      },
      {
        text: 'Отмена',
        action: () => {
          // Просто закрываем меню
        }
      }
    ]

    // Показываем меню в центре экрана
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    
    this.contextMenuManager.show(centerX, centerY, actions)
  }

  checkUrlParams() {
    const urlParams = new URLSearchParams(window.location.search)
    const roomId = urlParams.get('room')

    if (roomId) {
      logger.info('Обнаружен roomId в URL', { roomId })
      if (this.ui.roomIdInput) {
        this.ui.roomIdInput.value = roomId
      }
      this.handleJoinGame()
    }
  }

  async handleCreateGame() {
    // Предотвращаем случайное двойное создание игры
    if (this.state.isCreatingGame) {
      logger.warn('Игра уже создаётся, пропускаем повторный вызов')
      return
    }

    this.state.isCreatingGame = true
    
    // Сбрасываем флаг через короткое время
    setTimeout(() => {
      this.state.isCreatingGame = false
    }, 2000)

    logger.info('Создание новой игры')

    try {
      this.showLoading('Создание игры...')

      const wordLength = parseInt(this.ui.wordLengthSelect?.value || '5')
      logger.info('Используемая длина слова:', wordLength)
      
      const result = await createGame(wordLength)
      this.state.roomId = result.roomId

      logger.info('Игра создана', { roomId: this.state.roomId })

      this.subscribeToRoom(this.state.roomId)
      await this.loadGameState()
      this.showGameScreen()
      this.hideLoading()
      this.displayRoomId(this.state.roomId)

    } catch (error) {
      this.state.isCreatingGame = false
      this.handleError(error, 'Не удалось создать игру')
    }
  }

  async handleJoinGame() {
    const roomId = this.ui.roomIdInput?.value.trim()

    if (!roomId) {
      this.showError('Введите ID комнаты')
      return
    }

    logger.info('Присоединение к игре', { roomId })

    try {
      this.showLoading('Присоединение к игре...')

      const result = await joinGame(roomId)
      this.state.roomId = roomId

      logger.info('Присоединились к игре', { roomId, firstPlayer: result.firstPlayer })

      this.subscribeToRoom(this.state.roomId)
      await this.loadGameState()
      this.showGameScreen()
      this.hideLoading()

    } catch (error) {
      this.handleError(error, 'Не удалось присоединиться к игре')
    }
  }

  subscribeToRoom(roomId) {
    logger.info('Подписка на Realtime обновления', { roomId })

    realtimeManager.subscribeToRoom(roomId, {
      onGameUpdate: (newRecord) => {
        this.handleGameUpdate(newRecord)
      },
      onPlayerJoined: (newRecord) => {
        logger.info('Второй игрок присоединился!')
        this.showNotification('Противник присоединился! Игра начинается!')
        this.handleGameUpdate(newRecord)
      },
      onCellRevealed: (newRecord) => {
        this.handleGameUpdate(newRecord)
      },
      onGameFinished: (newRecord) => {
        this.handleGameFinished(newRecord)
      },
      onError: (error) => {
        this.handleError(error, 'Ошибка Realtime подписки')
      }
    })
  }

  handleGameUpdate(gameState) {
    logger.info('Обновление игры', { gameState })
    this.state.gameState = gameState

    // Поддержка разных структур данных
    const boardData = gameState.board_state ||
      (gameState.field_state?.grid) ||
      gameState.field_state

    if (!boardData) {
      logger.error('Не найдено поле с данными доски', { gameState })
      return
    }

    this.components.gameGrid.updateBoard(boardData)
    this.components.turnIndicator.setCurrentUser(this.state.currentUser.id)
    this.components.turnIndicator.updateGameState(gameState)

    const isMyTurn = this.components.turnIndicator.isCurrentUserTurn()
    const isActive = gameState.status === 'active'

    this.components.gameGrid.setInteractive(isMyTurn && isActive)
    this.components.guessInput.setEnabled(isMyTurn && isActive)

    if (isMyTurn && isActive) {
      this.components.guessInput.focus()
    }
  }

  async loadGameState() {
    try {
      const gameState = await getGameState(this.state.roomId)
      this.handleGameUpdate(gameState)
    } catch (error) {
      this.handleError(error, 'Ошибка загрузки состояния игры')
    }
  }

  async handleCellClick(row, col) {
    logger.info('Обработка клика по клетке', { row, col })

    try {
      this.showLoading('Открытие клетки...')
      await revealCell(this.state.roomId, row, col)
      this.components.gameGrid.highlightCell(row, col)
      this.hideLoading()
    } catch (error) {
      this.handleError(error, 'Не удалось открыть клетку')
    }
  }

  async handleGuessSubmit(word) {
    logger.info('Обработка попытки угадать слово', { word })

    try {
      this.showLoading('Проверка слова...')
      const result = await validateGuess(this.state.roomId, word)

      if (result.correct) {
        this.showNotification(`Правильно! Слово было: ${result.word}`)
      } else {
        this.showNotification('Неправильно! Ход переходит к сопернику')
      }

      this.hideLoading()
    } catch (error) {
      this.handleError(error, 'Ошибка проверки слова')
    }
  }

  handleGameFinished(gameState) {
    logger.info('Игра завершена', { gameState })

    const userPlayerNumber = this.components.turnIndicator.getCurrentUserPlayerNumber()

    this.components.gameOverScreen.show({
      winner: gameState.winner,
      word: gameState.word,
      player1Score: gameState.player1_score,
      player2Score: gameState.player2_score,
      currentUserId: this.state.currentUser.id,
      player1Id: gameState.player1_id,
      player2Id: gameState.player2_id
    })
  }

  handleNewGame() {
    window.location.reload()
  }

  handleShareRoom() {
    if (this.state.roomId) {
      const url = `${window.location.origin}${window.location.pathname}?room=${this.state.roomId}`

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(() => {
          this.showNotification('Ссылка скопирована в буфер обмена!')
        }).catch((error) => {
          logger.error('Ошибка копирования ссылки:', error)
          this.showNotification(`Поделитесь ссылкой: ${url}`)
        })
      } else {
        this.showNotification(`Поделитесь ссылкой: ${url}`)
      }
    }
  }

  copyRoomId() {
    if (this.state.roomId) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(this.state.roomId).then(() => {
          this.showNotification('ID комнаты скопирован!')
        }).catch((error) => {
          logger.error('Ошибка копирования ID комнаты:', error)
          this.showNotification(`ID комнаты: ${this.state.roomId}`)
        })
      } else {
        this.showNotification(`ID комнаты: ${this.state.roomId}`)
      }
    }
  }

  displayRoomId(roomId) {
    if (this.ui.roomIdDisplay) {
      this.ui.roomIdDisplay.textContent = roomId
    }
  }

  showGameScreen() {
    if (this.ui.menuScreen) {
      this.ui.menuScreen.style.display = 'none'
    }
    if (this.ui.gameScreen) {
      this.ui.gameScreen.style.display = 'block'
    }
  }

  showLoading(message = 'Загрузка...') {
    if (this.ui.loadingOverlay) {
      this.ui.loadingOverlay.style.display = 'flex'
      const loadingText = this.ui.loadingOverlay.querySelector('.loading-text')
      if (loadingText) {
        loadingText.textContent = message
      }
    }
  }

  hideLoading() {
    if (this.ui.loadingOverlay) {
      this.ui.loadingOverlay.style.display = 'none'
    }
  }

  showError(message) {
    if (this.ui.errorMessage) {
      this.ui.errorMessage.textContent = message
      this.ui.errorMessage.style.display = 'block'

      setTimeout(() => {
        if (this.ui.errorMessage) {
          this.ui.errorMessage.style.display = 'none'
        }
      }, 5000)
    }
  }

  showNotification(message) {
    const notification = document.createElement('div')
    notification.className = 'notification notification--show'
    notification.textContent = message
    document.body.appendChild(notification)

    setTimeout(() => {
      notification.classList.add('notification--show')
    }, 100)

    setTimeout(() => {
      notification.classList.remove('notification--show')
      setTimeout(() => notification.remove(), 300)
    }, 3000)
  }

  handleError(error, context = '') {
    this.hideLoading()
    
    // Подробное логирование ошибки
    const gameError = handleError(error)
    const message = context ? `${context}: ${gameError.message}` : gameError.message
    
    logger.error(`Ошибка в приложении: ${context}`, {
      error: gameError,
      originalError: error,
      stack: error?.stack,
      context,
      userState: {
        roomId: this.state.roomId,
        isLoading: this.state.isLoading
      }
    })
    
    this.showError(message)
  }

  cleanup() {
    logger.info('Очистка ресурсов приложения')
    
    // Очищаем Realtime подписки
    realtimeManager.unsubscribeAll()
    
    // Очищаем жесты
    if (this.gestureManager && this.gestureManager.isActive()) {
      this.gestureManager.destroy()
    }
    
    // Очищаем debouncer
    if (this.debouncer) {
      this.debouncer.clear()
    }
    
    // Очищаем контекстное меню
    if (this.contextMenuManager) {
      this.contextMenuManager.hide()
    }
  }
}