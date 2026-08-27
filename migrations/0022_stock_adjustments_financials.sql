ALTER TABLE stock_adjustments ADD COLUMN cost_price_snapshot INTEGER NOT NULL DEFAULT 0;
ALTER TABLE stock_adjustments ADD COLUMN total_value INTEGER NOT NULL DEFAULT 0;
