import { initAuth, supabase } from './services/supabase.js'
import { createGame, joinGame, revealCell, validateGuess, getGameState } from './services/gameService.js'
import { realtimeManager } from './services/realtimeService.js'
import { GameGrid } from './components/GameGrid.js'
import { GuessInput } from './components/GuessInput.js'
import { TurnIndicator } from './components/TurnIndicator.js'
import { GameOverScreen } from './components/GameOverScreen.js'
import { logger, perfMonitor } from './utils/logger.js'
import { handleError, GameError } from './utils/errorHandler.js'

/**
 * Главный класс приложения
 */
export class App {
  constructor() {
    this.state = {
      currentUser: null,
      roomId: null,
      gameState: null,
      isLoading: false
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
    this.ui.createGameBtn?.addEventListener('click', () => {
      this.handleCreateGame()
    })

    this.ui.joinGameBtn?.addEventListener('click', () => {
      this.handleJoinGame()
    })

    this.ui.copyRoomIdBtn?.addEventListener('click', () => {
      this.copyRoomId()
    })

    window.addEventListener('beforeunload', () => {
      this.cleanup()
    })
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
    logger.info('Создание новой игры')

    try {
      this.showLoading('Создание игры...')

      const wordLength = parseInt(this.ui.wordLengthSelect?.value || '5')
      const result = await createGame(wordLength)
      this.state.roomId = result.roomId

      logger.info('Игра создана', { roomId: this.state.roomId })

      this.subscribeToRoom(this.state.roomId)
      await this.loadGameState()
      this.showGameScreen()
      this.hideLoading()
      this.displayRoomId(this.state.roomId)

    } catch (error) {
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

    this.components.gameGrid.updateBoard(gameState.board_state)
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

      if (navigator.clipboard) {
        navigator.clipboard.writeText(url).then(() => {
          this.showNotification('Ссылка скопирована в буфер обмена!')
        }).catch(() => {
          this.showNotification(`Поделитесь ссылкой: ${url}`)
        })
      } else {
        this.showNotification(`Поделитесь ссылкой: ${url}`)
      }
    }
  }

  copyRoomId() {
    if (this.state.roomId) {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(this.state.roomId).then(() => {
          this.showNotification('ID комнаты скопирован!')
        })
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
    const gameError = handleError(error)
    const message = context ? `${context}: ${gameError.message}` : gameError.message
    this.showError(message)
    logger.error(context, { error: gameError })
  }

  cleanup() {
    logger.info('Очистка ресурсов приложения')
    realtimeManager.unsubscribeAll()
  }
}
