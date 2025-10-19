import { defineConfig } from 'vite'

export default defineConfig({
  base: '/guess-word-online/', // Имя репозитория для GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 5173
  }
})
