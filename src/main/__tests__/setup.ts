import { vi } from 'vitest'

// Mock electron so backend tests don't crash when importing `app` or `ipcMain`
vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn((name) => `/tmp/mock-${name}`),
    },
    ipcMain: {
      handle: vi.fn(),
      on: vi.fn(),
    }
  }
})

import { runMigrations } from '../db/migrate'
import { getSqlite, db } from '../db/connection'

try {
  runMigrations()
} catch (e) {
  console.error("Migration failed in setup:", e)
}

export async function resetDb() {
  const sqlite = getSqlite()
  sqlite.pragma('foreign_keys = OFF')
  const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations'").all() as {name: string}[]
  sqlite.transaction(() => {
    let remaining = [...tables]
    let maxLoops = 10
    while (remaining.length > 0 && maxLoops > 0) {
      const nextRemaining: { name: string }[] = []
      for (const { name } of remaining) {
        try {
          sqlite.exec(`DELETE FROM "${name}"`)
        } catch (e) {
          nextRemaining.push({ name })
        }
      }
      remaining = nextRemaining
      maxLoops--
    }
    // reset all auto-increment sequences so user gets ID 1
    try { sqlite.exec(`DELETE FROM sqlite_sequence`) } catch (e) {}
  })()
  sqlite.pragma('foreign_keys = ON')
  
  // Create a default user with ID 1 so tests don't fail FK constraints on audit logs
  await db.insertInto('users').values({
    id: 1,
    username: 'admin',
    password_hash: 'hash',
    full_name: 'Admin',
    role: 'admin'
  }).execute()
}
