/// <reference types="vitest" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

import { bffPlugin } from './server/vite-bff-plugin.js'

export default defineConfig({
  plugins: [react(), bffPlugin()],
  server: {
    port: 5173,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    include: ['src/features/**/__tests__/**/*.test.{ts,tsx}'],
  },
})
