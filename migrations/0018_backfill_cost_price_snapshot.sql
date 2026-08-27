-- Migration 0018: Backfill cost_price_snapshot for existing sale_items
-- 
-- Problem: Migration 0010 added cost_price_snapshot with DEFAULT 0, but didn't backfill existing records
-- Impact: Dashboard COGS shows 0 for historical sales, profit calculations incorrect
-- Solution: Backfill from current items.cost_price (best available approximation for historical data)

-- Backfill cost_price_snapshot from current items.cost_price
-- Note: This is an approximation since we don't have historical cost prices
-- For sales created after migration 0010, cost_price_snapshot is captured accurately
UPDATE sale_items
SET cost_price_snapshot = (
  SELECT items.cost_price 
  FROM items 
  WHERE items.id = sale_items.item_id
)
WHERE cost_price_snapshot = 0 OR cost_price_snapshot IS NULL;

-- Verification query (for manual checking):
-- SELECT COUNT(*) FROM sale_items WHERE cost_price_snapshot = 0 OR cost_price_snapshot IS NULL;
