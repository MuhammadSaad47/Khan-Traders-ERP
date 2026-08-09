import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import { getSqlite } from './connection'

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

    // Run each migration inside a transaction
    const runTx = sqlite.transaction(() => {
      sqlite.exec(sql)
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
