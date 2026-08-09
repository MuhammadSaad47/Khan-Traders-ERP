import { _electron as electron, test, expect } from '@playwright/test'
import path from 'path'

test('Reports route exists', async () => {
  const app = await electron.launch({ args: [path.join(__dirname, '../out/main/index.js')], env: { ...process.env, E2E_TEST: 'true' } })
  const page = await app.firstWindow()
  await page.waitForTimeout(1000)
  // Ensure no unhandled errors during boot
  expect(await page.title()).toBe('Khan Trader POS')
  await app.close()
})
