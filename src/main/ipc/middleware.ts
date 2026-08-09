import { db } from '../db/connection'
import { getActiveUserId } from '../services/auth.service'

export async function requireRole(allowedRoles: string[]) {
  const userId = getActiveUserId()
  if (!userId) {
    throw new Error('Unauthorized: User ID is required')
  }
  
  const user = await db.selectFrom('users')
    .select('role')
    .where('id', '=', userId)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
    
  if (!user) {
    throw new Error('Unauthorized: User not found or inactive')
  }
  
  if (!allowedRoles.includes(user.role)) {
    throw new Error(`Forbidden: Requires one of [${allowedRoles.join(', ')}], but user is '${user.role}'`)
  }
  
  return user.role
}

export async function requireAuth() {
  const userId = getActiveUserId()
  if (!userId) {
    throw new Error('Unauthorized: User ID is required')
  }
  
  const user = await db.selectFrom('users')
    .select('id')
    .where('id', '=', userId)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .executeTakeFirst()
    
  if (!user) {
    throw new Error('Unauthorized: User not found or inactive')
  }
}
