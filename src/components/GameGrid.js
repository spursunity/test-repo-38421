import { validateCellCoordinates } from '../utils/validation.js'
import { logger } from '../utils/logger.js'

/**
 * Компонент игровой сетки
 */
export class GameGrid {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`)
    }
    this.boardState = this.createEmptyBoard()
    this.isInteractive = false
    this.onCellClick = null
    this.render()
  }

  createEmptyBoard() {
    return Array.from({ length: 5 }, (_, row) =>
      Array.from({ length: 5 }, (_, col) => ({
        row,
        col,
        letter: null,
        revealed: false
      }))
    )
  }

  updateBoard(newBoardState) {
    logger.info('Обновление доски', { boardState: newBoardState })

    if (Array.isArray(newBoardState)) {
      this.boardState = newBoardState.map((row, rowIdx) =>
        row.map((cell, colIdx) => ({
          row: rowIdx,
          col: colIdx,
          letter: cell.letter,
          revealed: cell.revealed
        }))
      )
    }
    this.render()
  }

  setCellClickHandler(callback) {
    this.onCellClick = callback
  }

  setInteractive(interactive) {
    this.isInteractive = interactive
    this.render()
  }

  handleCellClick(row, col) {
    const validation = validateCellCoordinates(row, col)
    if (!validation.valid) {
      logger.warn('Некорректные координаты клетки', { row, col })
      return
    }

    const cell = this.boardState[row][col]
    if (cell.revealed) {
      logger.info('Клетка уже открыта', { row, col })
      return
    }

    if (!this.isInteractive) {
      logger.info('Доска неактивна', { row, col })
      return
    }

    logger.info('Клик по клетке', { row, col })
    if (this.onCellClick) {
      this.onCellClick(row, col)
    }
  }

  render() {
    this.container.innerHTML = ''
    const grid = document.createElement('div')
    grid.className = 'game-grid'

    if (!this.isInteractive) {
      grid.classList.add('game-grid--disabled')
    }

    this.boardState.forEach((row, rowIdx) => {
      row.forEach((cell, colIdx) => {
        const cellElement = this.createCellElement(cell, rowIdx, colIdx)
        grid.appendChild(cellElement)
      })
    })

    this.container.appendChild(grid)
  }

  createCellElement(cell, row, col) {
    const cellDiv = document.createElement('div')
    cellDiv.className = 'game-cell'
    cellDiv.dataset.row = row
    cellDiv.dataset.col = col

    if (cell.revealed) {
      cellDiv.classList.add('game-cell--revealed')
      cellDiv.textContent = cell.letter || '?'
    } else {
      cellDiv.classList.add('game-cell--hidden')
    }

    cellDiv.addEventListener('click', () => {
      this.handleCellClick(row, col)
    })

    if (!cell.revealed && this.isInteractive) {
      cellDiv.classList.add('game-cell--interactive')
    }

    return cellDiv
  }

  highlightCell(row, col) {
    const cellElement = this.container.querySelector(
      `.game-cell[data-row="${row}"][data-col="${col}"]`
    )
    if (cellElement) {
      cellElement.classList.add('game-cell--highlight')
      setTimeout(() => {
        cellElement.classList.remove('game-cell--highlight')
      }, 500)
    }
  }

  clear() {
    this.boardState = this.createEmptyBoard()
    this.isInteractive = false
    this.render()
  }

  destroy() {
    this.container.innerHTML = ''
    this.onCellClick = null
  }
}
