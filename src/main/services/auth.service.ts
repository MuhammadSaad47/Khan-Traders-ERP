import bcrypt from 'bcryptjs'
import { db } from '../db/connection'
import { writeAuditLog } from './base.service'

let activeUserId: number | null = null;

export function getActiveUserId() {
  return activeUserId;
}

export function setActiveUserId(id: number | null) {
  activeUserId = id;
}


export async function hasAdmin() {
  const admin = await db.selectFrom('users')
    .where('role', '=', 'admin')
    .where('is_deleted', '=', 0)
    .selectAll()
    .executeTakeFirst()
  return !!admin
}

export async function setupFirstAdmin(username: string, password: string, fullName: string) {
  if (await hasAdmin()) {
    throw new Error('Admin user already exists')
  }

  const hash = await bcrypt.hash(password, 12)
  const result = await db.insertInto('users').values({
    username,
    password_hash: hash,
    full_name: fullName,
    role: 'admin'
  }).returningAll().executeTakeFirstOrThrow()

  await writeAuditLog(result.id, 'create', 'users', result.id)
  return { id: result.id, username, role: 'admin' }
}

export async function login(username: string, password: string) {
  const user = await db.selectFrom('users')
    .where('username', '=', username)
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .selectAll()
    .executeTakeFirst()

  if (!user) {
    throw new Error('Invalid username or password')
  }

  const isValid = await bcrypt.compare(password, user.password_hash)
  if (!isValid) {
    throw new Error('Invalid username or password')
  }

  await writeAuditLog(user.id, 'login', 'users', user.id)
  setActiveUserId(user.id)
  
  return {
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role
  }
}

export async function getUsers() {
  return await db.selectFrom('users')
    .select(['id', 'username', 'full_name', 'role'])
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .where('role', 'in', ['admin', 'manager', 'cashier']) // Exclude van_salesman
    .orderBy('created_at', 'desc')
    .execute()
}

export async function getVanSalesmen() {
  return await db.selectFrom('users')
    .select(['id', 'username', 'full_name', 'role'])
    .where('is_active', '=', 1)
    .where('is_deleted', '=', 0)
    .where('role', '=', 'van_salesman') // Only van_salesman
    .orderBy('created_at', 'desc')
    .execute()
}

export async function createSalesman(data: { fullName: string, phone: string, address: string }, userId: number) {
  // generate a username from full name
  let baseUsername = data.fullName.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!baseUsername) baseUsername = 'salesman'
  
  // ensure unique username
  let username = baseUsername
  let counter = 1
  while (true) {
    const existing = await db.selectFrom('users').select('id').where('username', '=', username).executeTakeFirst()
    if (!existing) break
    username = `${baseUsername}${counter}`
    counter++
  }

  // generate random password instead of hardcoded default
  const plainPassword = Math.random().toString(36).slice(-8)
  const hash = await bcrypt.hash(plainPassword, 12)
  
  const result = await db.insertInto('users').values({
    username,
    password_hash: hash,
    full_name: data.fullName,
    role: 'van_salesman',
    phone: data.phone,
    address: data.address
  } as any).returningAll().executeTakeFirstOrThrow()
  
  await writeAuditLog(userId, 'create', 'users', result.id, null, result)
  
  return { id: result.id, full_name: result.full_name, username: result.username, password: plainPassword }
}

export async function changePassword(userId: number, currentPass: string, newPass: string) {
  const user = await db.selectFrom('users').where('id', '=', userId).selectAll().executeTakeFirst()
  if (!user) throw new Error('User not found')

  const isValid = await bcrypt.compare(currentPass, user.password_hash)
  if (!isValid) throw new Error('Current password is incorrect')

  const hash = await bcrypt.hash(newPass, 12)
  await db.updateTable('users').where('id', '=', userId).set({ password_hash: hash }).execute()
  await writeAuditLog(userId, 'update', 'users', userId, { field: 'password' })
  
  return { success: true }
}

export async function resetPassword(adminId: number, targetUserId: number, newPass: string) {
  const hash = await bcrypt.hash(newPass, 12)
  await db.updateTable('users').where('id', '=', targetUserId).set({ password_hash: hash }).execute()
  await writeAuditLog(adminId, 'update', 'users', targetUserId, { field: 'password_reset' })
  return { success: true }
}

export async function createUser(adminId: number, data: { username: string, fullName: string, role: string, password: string }) {
  const existing = await db.selectFrom('users')
    .selectAll()
    .where('username', '=', data.username)
    .executeTakeFirst()
  if (existing) throw new Error('Username already exists')

  const hash = await bcrypt.hash(data.password, 12)
  
  const result = await db.insertInto('users').values({
    username: data.username,
    password_hash: hash,
    full_name: data.fullName,
    role: data.role
  }).returningAll().executeTakeFirstOrThrow()

  await writeAuditLog(adminId, 'create', 'users', result.id, null, result)
  
  return { id: result.id, username: result.username, role: result.role, full_name: result.full_name }
}

export async function deleteUser(adminId: number, targetUserId: number) {
  if (adminId === targetUserId) throw new Error('You cannot delete your own account')
  
  await db.updateTable('users').where('id', '=', targetUserId).set({ is_active: 0, is_deleted: 1 }).execute()
  await writeAuditLog(adminId, 'delete', 'users', targetUserId, { action: 'deleted' })
  
  return { success: true }
}
