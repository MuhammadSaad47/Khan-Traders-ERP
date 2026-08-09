import { _electron as electron, test, expect, Page, ElectronApplication } from '@playwright/test'
import path from 'path'

let app: ElectronApplication
let page: Page

test.beforeAll(async () => {
  // Launch Electron app using the build folder
  app = await electron.launch({
    args: [path.join(__dirname, '../out/main/index.js')],
    env: { ...process.env, NODE_ENV: 'test_e2e', E2E_TEST: 'true' }
  })
  page = await app.firstWindow()
})

test.afterAll(async () => {
  await app.close()
})

test('should render first run setup or login', async () => {
  // Wait for React to load
  await page.waitForLoadState('domcontentloaded')
  
  // Either we see "Welcome to Khan Trader" (setup) or "Login"
  const title = await page.locator('h1').textContent()
  expect(title).toMatch(/Initial Admin Setup|Login/i)
})
