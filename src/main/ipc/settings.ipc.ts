import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as settingsService from '../services/settings.service'
import { requireRole } from './middleware'

export function registerSettingsIpc() {
  ipcMain.handle('settings:createBackup', async (event, userId: number) => {
    await requireRole(['admin'])
    // Optionally let user select directory
    const window = BrowserWindow.fromWebContents(event.sender)
    if (!window) return null
    
    const { canceled, filePaths } = await dialog.showOpenDialog(window, {
      title: 'Select Backup Folder',
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (canceled || filePaths.length === 0) {
      return { canceled: true }
    }
    
    return await settingsService.createBackup(filePaths[0], userId)
  })

  ipcMain.handle('settings:getBackupLogs', async () => {
    await requireRole(['admin'])
    return await settingsService.getBackupLogs()
  })

  ipcMain.handle('settings:getBusinessSettings', async () => {
    return await settingsService.getBusinessSettings()
  })

  ipcMain.handle('settings:updateBusinessSettings', async (_, data, userId) => {
    return await settingsService.updateBusinessSettings(data, userId)
  })
}
