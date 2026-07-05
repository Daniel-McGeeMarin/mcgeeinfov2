import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // apps/api's routes assume same-origin /api/* in production behind a reverse
      // proxy; this reproduces that locally against `uv run uvicorn api.main:app`.
      '/api': 'http://localhost:8000',
    },
  },
})
