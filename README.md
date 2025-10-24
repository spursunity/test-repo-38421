# 🎯 Угадай Слово Online

Многопользовательская онлайн игра для двух игроков, где нужно угадать загаданное противником слово, открывая буквы по очереди.

## 🎮 Играть онлайн

**[🚀 Играть прямо сейчас](https://spursunity.github.io/test-repo-38421/)**

> Никакой установки не требуется! Просто откройте ссылку и начинайте играть с друзьями.

## 🚀 Технологии

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Сборка:** Vite
- **Деплой:** GitHub Pages

## 📋 Требования

- Node.js 18+
- npm или yarn
- Supabase проект (для backend)

## 🛠️ Установка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/guess-word-online.git
cd guess-word-online
```

2. Установите зависимости:
```bash
npm install
```

3. Создайте файл `.env.local` на основе `.env.example`:
```bash
cp .env.example .env.local
```

4. Заполните `.env.local` вашими Supabase credentials:
```
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## 🎮 Запуск в режиме разработки

```bash
npm run dev
```

Приложение будет доступно по адресу: http://localhost:5173

## 🏗️ Сборка для production

```bash
npm run build
```

Собранные файлы будут в папке `dist/`

## 📦 Деплой на GitHub Pages

1. Убедитесь, что в `vite.config.js` указано правильное имя репозитория в поле `base`

2. Отправьте код в GitHub:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

3. GitHub Actions автоматически соберет и задеплоит приложение

## 📖 Структура проекта

```
guess-word-online/
├── src/
│   ├── components/      # UI компоненты
│   ├── services/        # Сервисы (Supabase, игровая логика, Realtime)
│   ├── utils/           # Утилиты (валидация, логирование, обработка ошибок)
│   ├── styles/          # CSS стили
│   ├── App.js           # Главный класс приложения
│   └── main.js          # Точка входа
├── public/              # Статические файлы
├── .github/workflows/   # GitHub Actions
├── index.html           # HTML template
├── vite.config.js       # Конфигурация Vite
└── package.json         # Зависимости и скрипты
```

## 🎯 Игровая механика

1. **Создание игры:** Первый игрок создает комнату и получает уникальный ID
2. **Присоединение:** Второй игрок присоединяется по ID комнаты
3. **Игра:** Игроки по очереди:
   - Открывают клетки на доске 5×5, чтобы увидеть буквы
   - Пытаются угадать загаданное слово
4. **Победа:** Выигрывает тот, кто первым угадает слово противника

## 🔧 Основные команды

- `npm run dev` - запуск dev-сервера
- `npm run build` - сборка для production
- `npm run preview` - предпросмотр production сборки
- `npm run lint` - проверка кода с ESLint
- `npm run format` - форматирование кода с Prettier

## 📝 Лицензия

MIT

## 👤 Автор

Создано с использованием Supabase и современных веб-технологий.