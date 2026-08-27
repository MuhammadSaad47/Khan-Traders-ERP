-- Migration 0016: Add payment allocations tracking
-- 
-- Problem: voidPayment() unapplies from most recent invoices, not the ones originally paid
-- Solution: Track which invoices each payment settled in a junction table

CREATE TABLE IF NOT EXISTS payment_allocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  reference_type TEXT NOT NULL CHECK (reference_type IN ('sale', 'purchase')),
  reference_id INTEGER NOT NULL, -- sale_id or purchase_id
  amount INTEGER NOT NULL CHECK (amount > 0),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_payment_id 
ON payment_allocations(payment_id);

CREATE INDEX IF NOT EXISTS idx_payment_allocations_reference 
ON payment_allocations(reference_type, reference_id);

-- No data migration needed - this is for future payments
-- Existing payments without tracked allocations will use fallback logic during void
