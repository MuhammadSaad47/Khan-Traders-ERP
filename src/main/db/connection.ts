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

export const db = new Kysely<DB>({
  dialect: new SqliteDialect({
    database: sqlite
  })
})

export const getDb = () => db
export const getSqlite = () => sqlite
