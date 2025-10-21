import { logger } from '../utils/logger.js'

export class TurnIndicator {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`)
    }
    this.currentPlayer = null
    this.currentUserId = null
    this.player1Id = null
    this.player2Id = null
    this.player1Score = 0
    this.player2Score = 0
    this.gameStatus = 'waiting'
    this.render()
  }

  updateGameState(gameState) {
    logger.info('Обновление индикатора хода', { gameState })
    this.currentPlayer = gameState.current_player
    this.player1Id = gameState.player1_id
    this.player2Id = gameState.player2_id
    this.player1Score = gameState.player1_score || 0
    this.player2Score = gameState.player2_score || 0
    this.gameStatus = gameState.status
    this.render()
  }

  setCurrentUser(userId) {
    this.currentUserId = userId
    this.render()
  }

  isCurrentUserTurn() {
    if (!this.currentUserId || !this.currentPlayer) {
      return false
    }
    if (this.currentPlayer === 1 && this.currentUserId === this.player1Id) {
      return true
    }
    if (this.currentPlayer === 2 && this.currentUserId === this.player2Id) {
      return true
    }
    return false
  }

  getCurrentUserPlayerNumber() {
    if (!this.currentUserId) return null
    if (this.currentUserId === this.player1Id) return 1
    if (this.currentUserId === this.player2Id) return 2
    return null
  }

  render() {
    const userPlayerNumber = this.getCurrentUserPlayerNumber()
    const isMyTurn = this.isCurrentUserTurn()

    let statusText = ''
    let statusClass = ''

    if (this.gameStatus === 'waiting') {
      statusText = 'Ожидание второго игрока...'
      statusClass = 'turn-indicator--waiting'
    } else if (this.gameStatus === 'finished') {
      statusText = 'Игра завершена'
      statusClass = 'turn-indicator--finished'
    } else if (this.gameStatus === 'active') {
      if (isMyTurn) {
        statusText = 'Ваш ход!'
        statusClass = 'turn-indicator--your-turn'
      } else {
        statusText = 'Ход соперника'
        statusClass = 'turn-indicator--opponent-turn'
      }
    }

    this.container.innerHTML = `
      <div class="turn-indicator ${statusClass}">
        <div class="turn-indicator__status">
          ${statusText}
        </div>
        ${this.gameStatus === 'active' || this.gameStatus === 'finished' ? `
          <div class="turn-indicator__scores">
            <div class="turn-indicator__player ${userPlayerNumber === 1 ? 'turn-indicator__player--you' : ''}">
              <span class="turn-indicator__player-label">
                Игрок 1 ${userPlayerNumber === 1 ? '(Вы)' : ''}
              </span>
              <span class="turn-indicator__score ${this.currentPlayer === 1 ? 'turn-indicator__score--active' : ''}">
                ${this.player1Score}
              </span>
            </div>
            <div class="turn-indicator__separator">:</div>
            <div class="turn-indicator__player ${userPlayerNumber === 2 ? 'turn-indicator__player--you' : ''}">
              <span class="turn-indicator__player-label">
                Игрок 2 ${userPlayerNumber === 2 ? '(Вы)' : ''}
              </span>
              <span class="turn-indicator__score ${this.currentPlayer === 2 ? 'turn-indicator__score--active' : ''}">
                ${this.player2Score}
              </span>
            </div>
          </div>
        ` : ''}
      </div>
    `
  }

  destroy() {
    this.container.innerHTML = ''
  }
}
