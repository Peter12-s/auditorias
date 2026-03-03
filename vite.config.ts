import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/auditorias/' : '/',
  server: {
    proxy: {
      '/templates': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/chat': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'https://sgi-gservice-708746088485.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
