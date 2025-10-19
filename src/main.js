import { App } from './App.js'

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  const app = new App()
  app.init().catch(error => {
    console.error('Ошибка запуска приложения:', error)
  })
})
