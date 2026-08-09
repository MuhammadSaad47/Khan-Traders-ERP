import { describe, it, expect, beforeAll } from 'vitest'
import { getSqlite } from './connection'
import { runMigrations } from './migrate'

describe('Database Migrations', () => {
  beforeAll(() => {
    process.env.NODE_ENV = 'test'
  })

  it('runs migrations successfully', () => {
    // Run the migrations
    runMigrations()

    const sqlite = getSqlite()
    
    // Verification: all 24 tables present
    const tables = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='table'").all() as any[]
    const tableNames = tables.map(t => t.name)
    expect(tableNames).toContain('users')
    expect(tableNames).toContain('items')
    expect(tableNames).toContain('sales')
    
    // Verification: indexes exist
    const indexes = sqlite.prepare("SELECT name FROM sqlite_master WHERE type='index'").all() as any[]
    const indexNames = indexes.map(i => i.name)
    expect(indexNames).toContain('idx_items_barcode')
    
    // Verification: Check constraints work
    expect(() => {
      sqlite.prepare("INSERT INTO items (name, selling_price) VALUES ('Test Item', -10)").run()
    }).toThrow(/CHECK constraint failed/)
  })
})
