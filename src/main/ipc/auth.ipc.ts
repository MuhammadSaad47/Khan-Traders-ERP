import { ipcMain } from 'electron'
import * as authService from '../services/auth.service'
import { requireRole } from './middleware'
import { getActiveUserId } from '../services/auth.service'
import { db } from '../db/connection'
import * as securityQuestionsService from '../services/security-questions.service'

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

  ipcMain.handle('auth:getVanSalesmen', async () => {
    await requireRole(['admin', 'manager', 'van_salesman'])
    return authService.getVanSalesmen()
  })

  ipcMain.handle('auth:createSalesman', async (_, data) => {
    await requireRole(['admin', 'manager'])
    const userId = getActiveUserId()!
    return authService.createSalesman(data, userId)
  })

  ipcMain.handle('auth:logout', async () => {
    authService.setActiveUserId(null)
    return { success: true }
  })

  ipcMain.handle('auth:restoreSession', async (_, userId: number) => {
    const user = await db.selectFrom('users').select('id').where('id', '=', userId).where('is_active', '=', 1).where('is_deleted', '=', 0).executeTakeFirst()
    if (!user) {
      return { success: false, error: 'User not found' }
    }
    authService.setActiveUserId(userId)
    return { success: true }
  })

  ipcMain.handle('auth:changePassword', async (_, { currentPassword, newPassword }) => {
    const userId = getActiveUserId()!
    return authService.changePassword(userId, currentPassword, newPassword)
  })

  ipcMain.handle('auth:resetPassword', async (_, { targetUserId, newPassword }) => {
    await requireRole(['admin', 'manager'])
    const adminId = getActiveUserId()!
    return authService.resetPassword(adminId, targetUserId, newPassword)
  })

  ipcMain.handle('auth:createUser', async (_, data) => {
    await requireRole(['admin', 'manager'])
    const userId = getActiveUserId()!
    return authService.createUser(userId, data)
  })

  ipcMain.handle('auth:deleteUser', async (_, targetUserId) => {
    await requireRole(['admin', 'manager'])
    const userId = getActiveUserId()!
    return authService.deleteUser(userId, targetUserId)
  })

  // Security Questions endpoints
  ipcMain.handle('auth:setSecurityQuestions', async (_, data) => {
    const userId = getActiveUserId()!
    return securityQuestionsService.setSecurityQuestions(userId, data)
  })

  ipcMain.handle('auth:hasSecurityQuestions', async (_, userId) => {
    return securityQuestionsService.hasSecurityQuestions(userId)
  })

  ipcMain.handle('auth:getSecurityQuestions', async (_, username) => {
    return securityQuestionsService.getSecurityQuestions(username)
  })

  ipcMain.handle('auth:verifyAndResetPassword', async (_, { username, answers, newPassword }) => {
    return securityQuestionsService.verifyAndResetPassword(username, answers, newPassword)
  })

  ipcMain.handle('auth:getPredefinedQuestions', async () => {
    return securityQuestionsService.getPredefinedQuestions()
  })
}
