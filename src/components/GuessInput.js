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
    this.onSkipTurn = null
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
            placeholder="Введите слово или пропустите ход..."
            maxlength="8"
            autocomplete="off"
            ${this.isEnabled ? '' : 'disabled'}
          />
        </div>
        
        <div class="guess-input__actions">
          <button
            id="guess-skip-btn"
            class="guess-input__skip"
            title="Пропустить ход и передать его сопернику"
            ${this.isEnabled ? '' : 'disabled'}
          >
            ⏭️ Пропустить ход
          </button>
          <button
            id="guess-submit-btn"
            class="guess-input__submit"
            title="Проверить введённое слово"
            ${this.isEnabled ? '' : 'disabled'}
          >
            ✅ Проверить
          </button>
        </div>
        
        ${this.errorMessage ? `
          <div class="guess-input__error">
            ${this.errorMessage}
          </div>
        ` : ''}
        
        <div class="guess-input__hint">
          <strong>Варианты действий:</strong><br>
          • Введите слово (5-8 букв, кириллица) и нажмите "Проверить"<br>
          • Или нажмите "Пропустить ход" для передачи хода сопернику
        </div>
      </div>
    `
  }

  attachEventListeners() {
    const inputField = this.container.querySelector('#guess-input-field')
    const submitBtn = this.container.querySelector('#guess-submit-btn')
    const skipBtn = this.container.querySelector('#guess-skip-btn')

    if (!inputField || !submitBtn || !skipBtn) return

    // Input field event listeners
    inputField.addEventListener('input', (e) => {
      this.handleInput(e.target.value)
    })

    inputField.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && this.isEnabled) {
        const value = e.target.value.trim()
        if (value) {
          this.handleSubmit()
        } else {
          // If field is empty and Enter pressed, show hint
          this.showError('Введите слово для проверки или используйте кнопку "Пропустить ход"')
        }
      }
    })

    // Submit button - only for word validation
    submitBtn.addEventListener('click', () => {
      if (this.isEnabled) {
        this.handleSubmit()
      }
    })

    // Skip button - for skipping turn
    skipBtn.addEventListener('click', () => {
      if (this.isEnabled) {
        this.handleSkipTurn()
      }
    })

    // Auto-focus if enabled
    if (this.isEnabled) {
      inputField.focus()
    }
  }

  handleInput(value) {
    // Clear any existing error messages when user starts typing
    if (this.errorMessage) {
      this.errorMessage = null
      this.updateErrorDisplay()
    }

    // Convert to uppercase for better UX
    const inputField = this.container.querySelector('#guess-input-field')
    if (inputField && value) {
      inputField.value = value.toUpperCase()
    }

    // Update button states based on input
    this.updateButtonStates(value)
  }

  updateButtonStates(value) {
    const submitBtn = this.container.querySelector('#guess-submit-btn')
    const skipBtn = this.container.querySelector('#guess-skip-btn')
    
    if (!submitBtn || !skipBtn) return

    const hasText = value && value.trim().length > 0
    
    // Submit button is primary when there's text, secondary when empty
    if (hasText) {
      submitBtn.classList.add('guess-input__submit--primary')
      skipBtn.classList.remove('guess-input__skip--primary')
    } else {
      submitBtn.classList.remove('guess-input__submit--primary')
      skipBtn.classList.add('guess-input__skip--primary')
    }
  }

  handleSubmit() {
    const inputField = this.container.querySelector('#guess-input-field')
    const value = inputField?.value || ''

    logger.info('Попытка отправить слово', { word: value })

    // Check if field is empty
    if (!value.trim()) {
      this.showError('Введите слово для проверки или используйте "Пропустить ход"')
      return
    }

    // Validate the word
    const validation = validateGuessInput(value)
    if (!validation.valid) {
      this.showError(validation.error)
      logger.warn('Невалидный ввод', { error: validation.error })
      return
    }

    // Submit the word
    if (this.onGuessSubmit) {
      this.onGuessSubmit(validation.normalized)
    }

    this.clearInput()
  }

  handleSkipTurn() {
    logger.info('Пропуск хода')
    
    // Clear any text in the input field
    this.clearInput()
    
    // Call the skip handler
    if (this.onSkipTurn) {
      this.onSkipTurn()
    }
  }

  showError(message) {
    this.errorMessage = message
    this.updateErrorDisplay()

    // Auto-clear error after 4 seconds
    setTimeout(() => {
      if (this.errorMessage === message) {
        this.errorMessage = null
        this.updateErrorDisplay()
      }
    }, 4000)
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

  setSkipHandler(callback) {
    this.onSkipTurn = callback
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
      // Reset button states
      this.updateButtonStates('')
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
    this.onSkipTurn = null
  }
}