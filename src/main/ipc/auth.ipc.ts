import { ipcMain } from 'electron'
import * as authService from '../services/auth.service'
import { requireRole } from './middleware'

export function registerAuthIPC() {
  ipcMain.handle('auth:hasAdmin', async () => {
    return authService.hasAdmin()
  })

  ipcMain.handle('auth:setupFirstAdmin', async (_, { username, password, fullName }) => {
    return authService.setupFirstAdmin(username, password, fullName)
  })

  ipcMain.handle('auth:login', async (_, { username, password }) => {
    return authService.login(username, password)
  })

  ipcMain.handle('auth:getUsers', async () => {
    await requireRole(['admin', 'manager'])
    return authService.getUsers()
  })

  ipcMain.handle('auth:createSalesman', async (_, data, userId) => {
    await requireRole(['admin', 'manager'])
    return authService.createSalesman(data, userId)
  })

  ipcMain.handle('auth:logout', async () => {
    authService.setActiveUserId(null)
    return { success: true }
  })
}
