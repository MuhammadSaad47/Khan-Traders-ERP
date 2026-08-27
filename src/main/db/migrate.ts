import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getSqlite } from './connection'

/**
 * Error messages from SQLite that indicate a migration statement has already
 * been applied. We skip these gracefully so the migration can still be recorded
 * as "done" even when the _migrations table fell out of sync with the live DB.
 */
const IDEMPOTENT_ERROR_FRAGMENTS = [
  'duplicate column name',
  'table already exists',
  'index already exists',
  'duplicate column',
  'already exists',
]

function isIdempotentError(err: unknown): boolean {
  if (!(err instanceof Error)) return false
  const msg = err.message.toLowerCase()
  return IDEMPOTENT_ERROR_FRAGMENTS.some((fragment) => msg.includes(fragment))
}

export function runMigrations() {
  const sqlite = getSqlite()

  // Create migrations tracking table if it doesn't exist
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      filename TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `)

  const isTest = process.env.NODE_ENV === 'test'
  // In development, the migrations are relative to the project root.
  // In production, they are packaged inside the app resources.
  let migrationsDir = ''
  if (app && app.isPackaged) {
    migrationsDir = path.join(process.resourcesPath, 'migrations')
  } else if (isTest) {
    migrationsDir = path.join(__dirname, '../../../migrations')
  } else {
    // In dev, __dirname is out/main/
    migrationsDir = path.join(__dirname, '../../migrations')
  }

  if (!fs.existsSync(migrationsDir)) {
    console.warn('Migrations directory not found at', migrationsDir)
    return
  }

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort()

  const getApplied = sqlite.prepare('SELECT filename FROM _migrations').all() as { filename: string }[]
  const appliedSet = new Set(getApplied.map(row => row.filename))

  for (const file of files) {
    if (appliedSet.has(file)) continue

    console.log(`Running migration: ${file}`)
    const filePath = path.join(migrationsDir, file)
    const sql = fs.readFileSync(filePath, 'utf-8')

    // Split the migration into individual statements so we can handle
    // idempotency errors per-statement without aborting the whole migration.
    const sqlWithoutComments = sql.replace(/--.*$/gm, '')
    const statements = sqlWithoutComments
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0)

    const runTx = sqlite.transaction(() => {
      for (const stmt of statements) {
        try {
          sqlite.exec(stmt + ';')
        } catch (err) {
          if (isIdempotentError(err)) {
            // Column/table/index already exists — migration was partially applied
            // before. Skip this statement and continue.
            console.warn(`  [skip] Already applied: ${(err as Error).message}`)
          } else {
            // A real error — re-throw to abort the transaction
            throw err
          }
        }
      }
      sqlite.prepare('INSERT INTO _migrations (filename) VALUES (?)').run(file)
    })

    try {
      runTx()
      console.log(`Successfully applied ${file}`)
    } catch (err) {
      console.error(`Error applying migration ${file}:`, err)
      throw err
    }
  }
}
