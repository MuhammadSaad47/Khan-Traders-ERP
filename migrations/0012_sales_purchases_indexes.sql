-- Add missing indexes to speed up filtering
CREATE INDEX IF NOT EXISTS idx_sales_status ON sales(status);
CREATE INDEX IF NOT EXISTS idx_sales_type ON sales(sale_type);
CREATE INDEX IF NOT EXISTS idx_purchases_status ON purchases(status);
