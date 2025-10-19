import { validateGuessInput } from '../utils/validation.js'
import { logger } from '../utils/logger.js'

export class GuessInput {
  constructor(containerId) {
    this.container = document.getElementById(containerId)
    if (!this.container) {
      throw new Error(`Container ${containerId} not found`)
    }
    this.isEnabled = false
    this.onGuessSubmit = null
    this.errorMessage = null
    this.render()
    this.attachEventListeners()
  }

  render() {
    this.container.innerHTML = `
      <div class="guess-input">
        <div class="guess-input__field-wrapper">
          <input
            type="text"
            id="guess-input-field"
            class="guess-input__field"
            placeholder="Введите слово..."
            maxlength="8"
            autocomplete="off"
            ${this.isEnabled ? '' : 'disabled'}
          />
          <button
            id="guess-submit-btn"
            class="guess-input__submit"
            ${this.isEnabled ? '' : 'disabled'}
          >
            Проверить
          </button>
        </div>
        ${this.errorMessage ? `
          <div class="guess-input__error">
            ${this.errorMessage}
          </div>
        ` : ''}
        <div class="guess-input__hint">
          Введите слово длиной от 5 до 8 букв (только кириллица)
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const inputField = this.container.querySelector('#guess-input-field')
    const submitBtn = this.container.querySelector('#guess-submit-btn')

    if (!inputField || !submitBtn) return

    inputField.addEventListener('input', (e) => {
      this.handleInput(e.target.value)
    })

    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.isEnabled) {
        this.handleSubmit()
      }
    })

    submitBtn.addEventListener('click', () => {
      if (this.isEnabled) {
        this.handleSubmit()
      }
    })

    if (this.isEnabled) {
      inputField.focus()
    }
  }

  handleInput(value) {
    if (this.errorMessage) {
      this.errorMessage = null
      this.updateErrorDisplay()
    }

    const inputField = this.container.querySelector('#guess-input-field')
    if (inputField && value) {
      inputField.value = value.toUpperCase()
    }
  }

  handleSubmit() {
    const inputField = this.container.querySelector('#guess-input-field')
    const value = inputField?.value || ''

    logger.info('Попытка отправить слово', { word: value })

    const validation = validateGuessInput(value)
    if (!validation.valid) {
      this.showError(validation.error)
      logger.warn('Невалидный ввод', { error: validation.error })
      return
    }

    if (this.onGuessSubmit) {
      this.onGuessSubmit(validation.normalized)
    }

    this.clearInput()
  }

  showError(message) {
    this.errorMessage = message
    this.updateErrorDisplay()

    setTimeout(() => {
      if (this.errorMessage === message) {
        this.errorMessage = null
        this.updateErrorDisplay()
      }
    }, 3000)
  }

  updateErrorDisplay() {
    const existingError = this.container.querySelector('.guess-input__error')
    if (this.errorMessage && !existingError) {
      const hint = this.container.querySelector('.guess-input__hint')
      const errorDiv = document.createElement('div')
      errorDiv.className = 'guess-input__error'
      errorDiv.textContent = this.errorMessage
      hint.parentNode.insertBefore(errorDiv, hint)
    } else if (!this.errorMessage && existingError) {
      existingError.remove()
    } else if (existingError) {
      existingError.textContent = this.errorMessage
    }
  }

  setSubmitHandler(callback) {
    this.onGuessSubmit = callback
  }

  setEnabled(enabled) {
    this.isEnabled = enabled
    this.render()
    this.attachEventListeners()
  }

  clearInput() {
    const inputField = this.container.querySelector('#guess-input-field')
    if (inputField) {
      inputField.value = ''
    }
  }

  focus() {
    const inputField = this.container.querySelector('#guess-input-field')
    if (inputField && this.isEnabled) {
      inputField.focus()
    }
  }

  destroy() {
    this.container.innerHTML = ''
    this.onGuessSubmit = null
  }
}
