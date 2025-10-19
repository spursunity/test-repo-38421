import { defineConfig } from 'vite'

export default defineConfig({
  base: '/test-repo-38421/', // Имя репозитория для GitHub Pages
  build: {
    outDir: 'dist',
    sourcemap: true
  },
  server: {
    port: 5173
  }
})
