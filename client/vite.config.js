import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

console.log('--- VITE_API_URL during build:', process.env.VITE_API_URL || 'NOT DEFINED');

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  }
})
