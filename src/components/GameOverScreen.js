import { logger } from '../utils/logger.js'

export class GameOverScreen {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`)
    }
    this.isVisible = false
    this.onNewGame = null
    this.onShareRoom = null
    this.gameResult = {
      winner: null,
      word: null,
      player1Score: 0,
      player2Score: 0,
      currentUserId: null,
      player1Id: null,
      player2Id: null
    }
  }

  show(result) {
    logger.info('Показ экрана завершения игры', { result })
    this.gameResult = { ...this.gameResult, ...result }
    this.isVisible = true
    this.render()
  }

  hide() {
    logger.info('Скрытие экрана завершения игры')
    this.isVisible = false
    this.container.innerHTML = ''
  }

  getResultType() {
    const { winner, currentUserId, player1Id, player2Id } = this.gameResult
    if (!winner) return 'draw'
    const userPlayerNumber = currentUserId === player1Id ? 1 : currentUserId === player2Id ? 2 : null
    if (winner === userPlayerNumber) {
      return 'you'
    } else {
      return 'opponent'
    }
  }

  render() {
    if (!this.isVisible) {
      return
    }

    const resultType = this.getResultType()

    let title = ''
    let emoji = ''
    let className = ''

    switch (resultType) {
      case 'you':
        title = 'Поздравляем! Вы победили! 🎉'
        emoji = '🏆'
        className = 'game-over--win'
        break
      case 'opponent':
        title = 'Противник победил'
        emoji = '😔'
        className = 'game-over--lose'
        break
      case 'draw':
        title = 'Ничья'
        emoji = '🤝'
        className = 'game-over--draw'
        break
    }

    this.container.innerHTML = `
      <div class="game-over-overlay">
        <div class="game-over ${className}">
          <div class="game-over__emoji">${emoji}</div>
          <h2 class="game-over__title">${title}</h2>
          <div class="game-over__word">
            <span class="game-over__word-label">Загаданное слово:</span>
            <span class="game-over__word-value">${this.gameResult.word || '???'}</span>
          </div>
          <div class="game-over__scores">
            <div class="game-over__score-item">
              <span class="game-over__score-label">Игрок 1</span>
              <span class="game-over__score-value">${this.gameResult.player1Score}</span>
            </div>
            <div class="game-over__score-separator">:</div>
            <div class="game-over__score-item">
              <span class="game-over__score-label">Игрок 2</span>
              <span class="game-over__score-value">${this.gameResult.player2Score}</span>
            </div>
          </div>
          <div class="game-over__actions">
            <button id="new-game-btn" class="game-over__btn game-over__btn--primary">
              Новая игра
            </button>
            <button id="share-room-btn" class="game-over__btn game-over__btn--secondary">
              Пригласить друга
            </button>
          </div>
        </div>
      </div>
    `

    this.attachEventListeners()
  }

  attachEventListeners() {
    const newGameBtn = this.container.querySelector('#new-game-btn')
    const shareRoomBtn = this.container.querySelector('#share-room-btn')

    if (newGameBtn) {
      newGameBtn.addEventListener('click', () => {
        logger.info('Нажата кнопка "Новая игра"')
        if (this.onNewGame) {
          this.onNewGame()
        }
        this.hide()
      })
    }

    if (shareRoomBtn) {
      shareRoomBtn.addEventListener('click', () => {
        logger.info('Нажата кнопка "Пригласить друга"')
        if (this.onShareRoom) {
          this.onShareRoom()
        }
      })
    }
  }

  setNewGameHandler(callback) {
    this.onNewGame = callback
  }

  setShareRoomHandler(callback) {
    this.onShareRoom = callback
  }

  isOpen() {
    return this.isVisible
  }

  destroy() {
    this.hide()
    this.onNewGame = null
    this.onShareRoom = null
  }
}
