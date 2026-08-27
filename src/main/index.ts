import { app, shell, BrowserWindow, ipcMain, powerMonitor, Menu } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { runMigrations } from './db/migrate'
import { checkpointAndClose } from './db/connection'
import { registerAuthIPC } from './ipc/auth.ipc'
import { registerCatalogIpc } from './ipc/catalog.ipc'
import { registerPartiesIpc } from './ipc/parties.ipc'
import { registerSalesIpc } from './ipc/sales.ipc'
import { registerPurchasesIpc } from './ipc/purchases.ipc'
import { registerPaymentsIpc } from './ipc/payments.ipc'
import { registerAccountsIpc } from './ipc/accounts.ipc'
import { registerDashboardIpc } from './ipc/dashboard.ipc'
import { registerReportsIpc } from './ipc/reports.ipc'
import { registerVanSalesIpc } from './ipc/van_sales.ipc'
import { registerSettingsIpc } from './ipc/settings.ipc'
import { registerAuditIpc } from './ipc/audit.ipc'
import { registerExpensesIpc } from './ipc/expenses.ipc'
import { registerAdjustmentsIpc } from './ipc/stock_adjustments.ipc'
import { registerBackupIPC } from './ipc/backup.ipc'
import { backupToGoogleDrive, isAuthorized } from './services/backup.service'
import fs from 'fs'

// Global Error Handlers to prevent Electron crashing silently
process.on('uncaughtException', (error) => {
  console.error('UNCAUGHT EXCEPTION:', error)
  const logPath = join(app.getPath('userData'), 'crash.log')
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] UNCAUGHT EXCEPTION: ${error.stack || error}\n`)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION at:', promise, 'reason:', reason)
  const logPath = join(app.getPath('userData'), 'crash.log')
  fs.appendFileSync(logPath, `[${new Date().toISOString()}] UNHANDLED REJECTION: ${reason}\n`)
})

function createWindow(): BrowserWindow {
  // Remove default Electron menu on all platforms (prevents Alt-key flash on Windows)
  Menu.setApplicationMenu(null)

  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 650,
    show: false,
    autoHideMenuBar: true,
    // Set icon on Linux and Windows (macOS reads from the app bundle automatically)
    ...(process.platform !== 'darwin' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// Register IPC handlers globally before app is ready
// This is fine as long as they don't depend on BrowserWindow instance immediately
registerAuthIPC()
registerCatalogIpc()
registerPartiesIpc()
registerSalesIpc()
registerPurchasesIpc()
registerPaymentsIpc()
registerAccountsIpc()
registerDashboardIpc()
registerReportsIpc()
registerVanSalesIpc()
registerSettingsIpc()
registerAuditIpc()
registerExpensesIpc()
registerAdjustmentsIpc()
registerBackupIPC()

// Shell operations (open folder, file, URL)
ipcMain.handle('shell:openPath', async (_, path: string) => {
  return await shell.openPath(path)
})

function createSplashWindow(): BrowserWindow {
  const splash = new BrowserWindow({
    width: 400,
    height: 300,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: join(__dirname, '../../resources/preload-splash.js')
    }
  })
  
  splash.loadFile(join(__dirname, '../../resources/splash.html'))
  
  splash.once('ready-to-show', () => {
    splash.show()
  })
  
  return splash
}

// Disable sandbox for Linux compatibility
if (process.platform === 'linux') {
  app.commandLine.appendSwitch('no-sandbox')
}

// NOTE: Removed force-device-scale-factor and high-dpi-support flags.
// They conflicted with the app's zoom system (CSS zoom), causing Chromium
// hit-testing mismatches that made input fields stop accepting keyboard input.

app.whenReady().then(async () => {
  // Must match appId in electron-builder.yml for Windows taskbar grouping
  electronApp.setAppUserModelId('com.khantraders.management')
  
  // Remove default menu to prevent Alt key flashing on Windows
  const { Menu } = require('electron')
  Menu.setApplicationMenu(null)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on('ping', () => console.log('pong'))

  // SECURITY: Clear session on system lock/sleep
  // This requires re-login when user returns from lock screen
  powerMonitor.on('lock-screen', () => {
    console.log('System locked - clearing user session')
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach(window => {
      window.webContents.send('system-locked')
    })
  })

  powerMonitor.on('suspend', () => {
    console.log('System suspending - clearing user session')
    const allWindows = BrowserWindow.getAllWindows()
    allWindows.forEach(window => {
      window.webContents.send('system-locked')
    })
  })

  if (process.env.NODE_ENV === 'test_e2e' || process.env.E2E_TEST === 'true') {
    runMigrations()
    const mainWindow = createWindow()
    mainWindow.once('ready-to-show', () => {
      mainWindow.show()
    })
  } else {
    const splash = createSplashWindow()
    
    // Fake delay helper for aesthetic loading
    const delay = (ms: number) => new Promise(res => setTimeout(res, ms))
    
    // Initialization Sequence
    try {
      await delay(500)
      splash.webContents.send('splash-progress', { message: 'Checking database migrations...', percent: 20 })
      
      if (is.dev) await delay(1500)
      
      runMigrations()
      splash.webContents.send('splash-progress', { message: 'Database up to date.', percent: 60 })
      await delay(500)
      
      splash.webContents.send('splash-progress', { message: 'Starting application...', percent: 100 })
      await delay(500)
      
    } catch (error) {
      console.error('Failed to run migrations', error)
      splash.webContents.send('splash-progress', { message: 'Startup Error! Check logs.', percent: 100 })
      await delay(3000)
    }

    // Only create the main window AFTER database is fully initialized
    const mainWindow = createWindow()
    
    mainWindow.once('ready-to-show', () => {
      splash.destroy()
      mainWindow.show()
      
      // Setup daily automatic backup (runs once on startup after 5 mins, then every 24 hours)
      setTimeout(() => {
        if (isAuthorized()) {
          console.log('Running automatic backup...')
          backupToGoogleDrive().catch(console.error)
        }
      }, 5 * 60 * 1000)
      
      setInterval(() => {
        if (isAuthorized()) {
          console.log('Running daily automatic backup...')
          backupToGoogleDrive().catch(console.error)
        }
      }, 24 * 60 * 60 * 1000)
    })
  }

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Graceful shutdown: checkpoint WAL before quitting
app.on('before-quit', () => {
  try {
    checkpointAndClose()
  } catch (error) {
    console.error('Error during shutdown cleanup:', error)
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
