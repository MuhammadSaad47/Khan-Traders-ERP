-- Migration 0019: Add Specific Void Types for Stock Movements
--
-- Problem: Sale/purchase voids currently use 'adjustment' type
-- Impact: Cannot distinguish intentional manual adjustments from transaction voids in reports
-- Solution: Add 'sale_void' and 'purchase_void' types to stock_movements.type constraint
--
-- Note: SQLite doesn't support ALTER CHECK directly, so we:
-- 1. Create new table with updated constraint
-- 2. Copy data
-- 3. Drop old table
-- 4. Rename new table
-- 5. Recreate indexes

PRAGMA foreign_keys = OFF;

-- 1. Create new table with expanded type constraint
CREATE TABLE stock_movements_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  change_qty INTEGER NOT NULL CHECK (change_qty != 0),
  type TEXT NOT NULL CHECK (type IN
    ('purchase','sale','return_in','return_out','adjustment','van_load','van_unload','damage','sale_void','purchase_void')),
  reference_type TEXT CHECK (reference_type IN
    ('purchase','sale','stock_adjustment','van_assignment')),
  reference_id INTEGER,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 2. Copy all existing data
INSERT INTO stock_movements_new 
SELECT * FROM stock_movements;

-- 3. Drop old table
DROP TABLE stock_movements;

-- 4. Rename new table
ALTER TABLE stock_movements_new RENAME TO stock_movements;

-- 5. Recreate indexes (if any existed)
-- Note: Check if there are existing indexes in previous migrations and recreate them here
-- For now, the table had no explicit indexes in 0001_initial_schema.sql

PRAGMA foreign_keys = ON;

-- ============ NOTES ============
-- After this migration, services can use:
-- - 'sale_void' for voiding sales (instead of 'adjustment')
-- - 'purchase_void' for voiding purchases (instead of 'adjustment')
-- - 'adjustment' remains for actual manual stock adjustments
--
-- This provides clear audit trail distinction:
-- - Reports can filter adjustment type to show only manual corrections
-- - Void types clearly indicate transaction reversals
-- - Historical 'adjustment' entries remain valid (backward compatible)
