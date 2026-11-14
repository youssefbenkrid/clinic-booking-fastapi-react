/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Les appels à /api sont redirigés vers l'API Python (FastAPI) qui tourne sur le port 8000.
const apiProxy = { '/api': 'http://localhost:8000' }

export default defineConfig({
  plugins: [react()],
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
  test: { environment: 'node' },
})
