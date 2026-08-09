import { vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/tmp'),
    isPackaged: false,
    whenReady: vi.fn(() => Promise.resolve()),
    on: vi.fn(),
  },
  ipcMain: {
    handle: vi.fn(),
    on: vi.fn()
  }
}))
