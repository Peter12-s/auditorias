import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/auditorias/',
  server: {
    proxy: {
      '/api': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''), // Quitar /api del path
      }
    }
  }
})
