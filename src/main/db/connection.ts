import Database from 'better-sqlite3'
import { Kysely, SqliteDialect } from 'kysely'
import path from 'path'
import { app } from 'electron'
import type { DB } from './types'

export type { DB }

// Ensure the db is stored in user data directory so it persists across updates
const dbPath = process.env.NODE_ENV === 'test'
  ? ':memory:'
  : path.join(app.getPath('userData'), 'khan-trader.sqlite')

export const sqlite = new Database(dbPath)

// Enable WAL mode for better concurrency and performance
sqlite.pragma('journal_mode = WAL')
// Enable foreign keys
sqlite.pragma('foreign_keys = ON')
// Auto-checkpoint every 1000 pages (~4MB) to prevent WAL from growing too large
sqlite.pragma('wal_autocheckpoint = 1000')

export const db = new Kysely<DB>({
  dialect: new SqliteDialect({
    database: sqlite
  })
})

export const getDb = () => db
export const getSqlite = () => sqlite

/**
 * Checkpoint and truncate WAL file on shutdown
 * Should be called before app quits to ensure clean database state
 */
export function checkpointAndClose() {
  try {
    // TRUNCATE mode: Checkpoint all WAL frames and truncate the WAL file
    sqlite.pragma('wal_checkpoint(TRUNCATE)')
    console.log('Database WAL checkpoint completed')
  } catch (error) {
    console.error('Error during WAL checkpoint:', error)
  } finally {
    sqlite.close()
  }
}
