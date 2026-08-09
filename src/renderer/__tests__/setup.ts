import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock matchMedia which is not present in JSDOM
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

// Mock standard API objects
window.api = {
  auth: { hasAdmin: vi.fn() },
  catalog: { getItems: vi.fn() },
  sales: { createSale: vi.fn() }
} as any
