-- Migration 0021: Add capital and withdrawal reference types to account_transactions
-- This allows tracking owner capital investments and withdrawals

-- SQLite doesn't support ALTER TABLE ... ALTER COLUMN to modify CHECK constraints
-- We need to recreate the table with the new constraint

-- Step 1: Create new table with updated CHECK constraint
CREATE TABLE account_transactions_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('debit','credit')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reference_type TEXT CHECK (reference_type IN ('sale','purchase','payment','expense','transfer','adjustment','capital','withdrawal')),
  reference_id INTEGER,
  description TEXT,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Step 2: Copy all data from old table
INSERT INTO account_transactions_new 
SELECT * FROM account_transactions;

-- Step 3: Drop old table
DROP TABLE account_transactions;

-- Step 4: Rename new table to original name
ALTER TABLE account_transactions_new RENAME TO account_transactions;

-- Step 5: Recreate indexes (if any existed - checking from migration 0017)
CREATE INDEX IF NOT EXISTS idx_account_transactions_account_id ON account_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_account_transactions_date ON account_transactions(date);
CREATE INDEX IF NOT EXISTS idx_account_transactions_reference ON account_transactions(reference_type, reference_id);
