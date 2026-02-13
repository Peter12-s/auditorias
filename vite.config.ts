import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/auditorias/', // Cambia 'auditorias' por el nombre de tu repositorio de GitHub
})
