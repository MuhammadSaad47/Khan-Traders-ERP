import { ipcMain } from 'electron'
import {
  authenticateGoogleDrive,
  getBackupStatus,
  backupToGoogleDrive,
  restoreFromGoogleDrive
} from '../services/backup.service'

export const registerBackupIPC = () => {
  ipcMain.handle('backup:auth', async () => {
    try {
      await authenticateGoogleDrive()
      return { success: true }
    } catch (error: any) {
      console.error('Auth error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('backup:status', async () => {
    return await getBackupStatus()
  })

  ipcMain.handle('backup:upload', async () => {
    try {
      await backupToGoogleDrive()
      return { success: true }
    } catch (error: any) {
      console.error('Backup upload error:', error)
      return { success: false, error: error.message }
    }
  })

  ipcMain.handle('backup:restore', async () => {
    try {
      await restoreFromGoogleDrive()
      return { success: true }
    } catch (error: any) {
      console.error('Backup restore error:', error)
      return { success: false, error: error.message }
    }
  })
}
