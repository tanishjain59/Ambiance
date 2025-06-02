import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/chat': 'http://localhost:8000',
      '/generate-scene': 'http://localhost:8000',
      '/generate-audio': 'http://localhost:8000'
    }
  },
  build: {
    outDir: 'static',
    assetsDir: '',
    rollupOptions: {
      input: 'src/main.tsx'
    }
  }
}) 