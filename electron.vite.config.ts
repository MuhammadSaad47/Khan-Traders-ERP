import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import dotenv from 'dotenv'

// Load .env so credentials are available at build time
dotenv.config()

const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || ''
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || ''

export default defineConfig({
  main: {
    define: {
      // Embed Google credentials as compile-time constants in the main process bundle.
      // This avoids needing a .env file at runtime (which is excluded from the packaged app).
      '__GOOGLE_CLIENT_ID__': JSON.stringify(GOOGLE_CLIENT_ID),
      '__GOOGLE_CLIENT_SECRET__': JSON.stringify(GOOGLE_CLIENT_SECRET),
    }
  },
  preload: {},
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src')
      }
    },
    plugins: [react()]
  }
})
