// === Игровое состояние ===
let currentPlayer = 'X';
let boardState = Array(9).fill('');
let gameActive = true;
let currentWord = '';
let scores = { X: 0, O: 0, draws: 0 };
let gameMode = 'word'; // 'word' или 'ticTacToe'

// === Функции управления игрой ===
function initGame() {
    updateDisplay();
    createBoard();
    setupEventListeners();
}

function createBoard() {
    const gameBoard = document.getElementById('game-board');
    if (!gameBoard) {
        console.error('Game board element not found');
        return;
    }
    
    gameBoard.innerHTML = '';
    for (let i = 0; i < 9; i++) {
        const cell = document.createElement('div');
        cell.className = 'cell';
        cell.dataset.index = i;
        cell.addEventListener('click', () => handleCellClick(i));
        gameBoard.appendChild(cell);
    }
}

function handleCellClick(index) {
    if (boardState[index] !== '' || !gameActive) return;
    
    if (gameMode === 'ticTacToe') {
        boardState[index] = currentPlayer;
        updateBoard();
        
        if (checkWinner()) {
            endGame(`Игрок ${currentPlayer} выиграл!`);
            scores[currentPlayer]++;
        } else if (boardState.every(cell => cell !== '')) {
            endGame('Ничья!');
            scores.draws++;
        } else {
            currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        }
    }
    
    updateDisplay();
}

function checkWinner() {
    const winPatterns = [
        [0, 1, 2], [3, 4, 5], [6, 7, 8], // горизонтали
        [0, 3, 6], [1, 4, 7], [2, 5, 8], // вертикали
        [0, 4, 8], [2, 4, 6] // диагонали
    ];
    
    return winPatterns.some(pattern => {
        const [a, b, c] = pattern;
        return boardState[a] && 
               boardState[a] === boardState[b] && 
               boardState[a] === boardState[c];
    });
}

function updateBoard() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
        cell.textContent = boardState[index];
    });
}

function updateDisplay() {
    // Обновить текущего игрока
    const currentPlayerElement = document.getElementById('current-player');
    if (currentPlayerElement) {
        currentPlayerElement.textContent = `Текущий игрок: ${currentPlayer}`;
    }
    
    // Обновить счет
    const scoreX = document.getElementById('score-x');
    const scoreO = document.getElementById('score-o');
    const scoreDraw = document.getElementById('score-draw');
    
    if (scoreX) scoreX.textContent = scores.X;
    if (scoreO) scoreO.textContent = scores.O;
    if (scoreDraw) scoreDraw.textContent = scores.draws;
}

function setupEventListeners() {
    // Кнопка "Угадать"
    const guessBtn = document.getElementById('guess-btn');
    if (guessBtn) {
        guessBtn.addEventListener('click', handleGuess);
    }
    
    // Кнопка "Пропустить"
    const skipBtn = document.getElementById('skip-btn');
    if (skipBtn) {
        skipBtn.addEventListener('click', handleSkip);
    }
    
    // Кнопка "Новая игра"
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', startNewGame);
    }
    
    // Кнопка "New Game" (в контролах)
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', startNewGame);
    }
    
    // Кнопка "Reset Score"
    const scoreResetBtn = document.getElementById('score-reset-btn');
    if (scoreResetBtn) {
        scoreResetBtn.addEventListener('click', resetScores);
    }
    
    // Обработчик Enter в поле ввода
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
        wordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleGuess();
            }
        });
    }
}

function handleGuess() {
    const wordInput = document.getElementById('word-input');
    const gameResult = document.getElementById('game-result');
    
    if (!wordInput || !gameResult) {
        console.error('Required elements not found');
        return;
    }
    
    const guessedWord = wordInput.value.trim().toLowerCase();
    
    if (!guessedWord) {
        gameResult.textContent = 'Введите слово для угадывания!';
        gameResult.style.color = 'orange';
        return;
    }
    
    if (!currentWord) {
        // Первый игрок задает слово
        currentWord = guessedWord;
        gameResult.textContent = `Слово задано! Игрок ${currentPlayer === 'X' ? 'O' : 'X'}, угадайте слово.`;
        gameResult.style.color = 'blue';
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
        gameMode = 'word';
    } else {
        // Проверка угаданного слова
        if (guessedWord === currentWord) {
            endGame(`🎉 Поздравляем! Игрок ${currentPlayer} угадал слово "${currentWord}"!`);
            scores[currentPlayer]++;
        } else {
            gameResult.textContent = `Неверно! Попробуйте еще раз или пропустите ход.`;
            gameResult.style.color = 'red';
        }
    }
    
    wordInput.value = '';
    updateDisplay();
}

function handleSkip() {
    if (!currentWord) {
        const gameResult = document.getElementById('game-result');
        if (gameResult) {
            gameResult.textContent = 'Сначала нужно задать слово!';
            gameResult.style.color = 'orange';
        }
        return;
    }
    
    // Переключить игрока или начать Крестики-Нолики
    if (gameMode === 'word') {
        const gameResult = document.getElementById('game-result');
        if (gameResult) {
            gameResult.textContent = `Игрок ${currentPlayer} пропустил ход. Начинаем Крестики-Нолики!`;
            gameResult.style.color = 'blue';
        }
        gameMode = 'ticTacToe';
        currentPlayer = 'X';
    } else {
        currentPlayer = currentPlayer === 'X' ? 'O' : 'X';
    }
    
    updateDisplay();
}

function startNewGame() {
    currentPlayer = 'X';
    boardState = Array(9).fill('');
    gameActive = true;
    currentWord = '';
    gameMode = 'word';
    
    const gameResult = document.getElementById('game-result');
    if (gameResult) {
        gameResult.textContent = '';
        gameResult.style.color = 'black';
    }
    
    const wordInput = document.getElementById('word-input');
    if (wordInput) {
        wordInput.value = '';
    }
    
    updateBoard();
    updateDisplay();
}

function resetScores() {
    scores = { X: 0, O: 0, draws: 0 };
    updateDisplay();
}

function endGame(message) {
    gameActive = false;
    const gameResult = document.getElementById('game-result');
    if (gameResult) {
        gameResult.textContent = message;
        gameResult.style.color = 'green';
        gameResult.style.fontWeight = 'bold';
    }
}

// === Инициализация при загрузке страницы ===
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});

// Если DOM уже загружен
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
} else {
    initGame();
}
