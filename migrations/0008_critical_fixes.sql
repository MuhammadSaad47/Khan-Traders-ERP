-- Critical fixes migration: cost_price snapshot for accurate COGS, updated_at tracking

-- 1. Add cost_price_snapshot to sale_items for accurate historical COGS calculation
--    Without this, COGS reports use current items.cost_price which changes on every purchase.
ALTER TABLE sale_items ADD COLUMN cost_price_snapshot INTEGER NOT NULL DEFAULT 0;

-- 2. Add updated_at to sales for change tracking
ALTER TABLE sales ADD COLUMN updated_at TEXT;

-- 3. Add updated_at to purchases for change tracking
ALTER TABLE purchases ADD COLUMN updated_at TEXT;
