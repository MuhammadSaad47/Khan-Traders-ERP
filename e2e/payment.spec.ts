import { _electron as electron, test, expect } from '@playwright/test'
import path from 'path'

test('App starts successfully without crashing', async () => {
  const app = await electron.launch({ args: [path.join(__dirname, '../out/main/index.js')], env: { ...process.env, E2E_TEST: 'true' } })
  const page = await app.firstWindow()
  await page.waitForTimeout(1000)
  expect(await page.title()).toBe('Khan Trader POS')
  await app.close()
})
