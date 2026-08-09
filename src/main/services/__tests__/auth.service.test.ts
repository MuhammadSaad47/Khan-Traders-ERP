import { describe, it, expect, beforeEach } from 'vitest'
import { setupFirstAdmin, login } from '../auth.service'
import { resetDb } from '../../__tests__/setup'
import { getSqlite } from '../../db/connection'

describe('Auth Service', () => {
  beforeEach(async () => {
    await resetDb()
    // resetDb creates an admin, let's remove it specifically for auth tests
    const sqlite = getSqlite()
    sqlite.pragma('foreign_keys = OFF')
    sqlite.exec('DELETE FROM users')
    sqlite.pragma('foreign_keys = ON')
  })

  it('should create a user successfully', async () => {
    const user = await setupFirstAdmin('testuser', 'Password123!', 'Test User')
    expect(user).toBeDefined()
    expect(user.username).toBe('testuser')
    expect(user.role).toBe('admin')
    expect(user.role).toBe('admin')
  })

  it('should authenticate a valid user', async () => {
    await setupFirstAdmin('validuser', 'pass123', 'Valid')
    const user = await login('validuser', 'pass123')
    expect(user).toBeDefined()
    expect(user?.username).toBe('validuser')
  })

  it('should reject invalid password', async () => {
    await setupFirstAdmin('invalidpassuser', 'pass123', 'Valid')
    await expect(login('invalidpassuser', 'wrongpass')).rejects.toThrow('Invalid username or password')
  })

  it('should reject non-existent user', async () => {
    await expect(login('ghost', 'pass123')).rejects.toThrow('Invalid username or password')
  })
})
