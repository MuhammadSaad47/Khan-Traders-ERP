import { describe, it, expect, beforeAll } from 'vitest'
import { runMigrations } from '../db/migrate'
import { hasAdmin, setupFirstAdmin, login } from './auth.service'

describe('Auth Service', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
    runMigrations() // ensure DB is ready
  })

  it('first-run admin setup wizard flow', async () => {
    // initially no admin
    expect(await hasAdmin()).toBe(false)
    
    // setup first admin
    const user = await setupFirstAdmin('admin', 'password123', 'Super Admin')
    expect(user.username).toBe('admin')
    expect(user.role).toBe('admin')

    // now has admin
    expect(await hasAdmin()).toBe(true)

    // cannot setup again
    await expect(setupFirstAdmin('admin2', 'pass', 'Admin 2')).rejects.toThrow('Admin user already exists')
  })

  it('login flow', async () => {
    // successful login
    const user = await login('admin', 'password123')
    expect(user.username).toBe('admin')

    // failed login (wrong password)
    await expect(login('admin', 'wrong')).rejects.toThrow('Invalid username or password')
    
    // failed login (wrong username)
    await expect(login('unknown', 'password123')).rejects.toThrow('Invalid username or password')
  })
})
