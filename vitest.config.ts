import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'node',
    globals: true,
    setupFiles: ['./src/main/__tests__/setup.ts'],
    alias: {
      '@': path.resolve(__dirname, './src/renderer/src'),
    }
  }
})
