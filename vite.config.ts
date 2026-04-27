import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'


// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/auditorias/' : '/',
  server: {
    proxy: {
      '/templates': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/auth': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/users': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/companies': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/chat': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/notifications': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/files': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      },
      '/audits': {
        target: 'https://sgi-backend-1008998051554.us-central1.run.app',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
