import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/tasks': 'http://localhost:5000'
    },
    host: true // Esto permite que sea accesible en 0.0.0.0, útil en algunos entornos.
  }
})