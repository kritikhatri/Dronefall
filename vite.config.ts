import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' so the built game works from any folder or static host
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { chunkSizeWarningLimit: 1600 },
})
