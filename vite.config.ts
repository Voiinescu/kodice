/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base './' permite abrir el build servido desde cualquier subruta (sin backend).
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})