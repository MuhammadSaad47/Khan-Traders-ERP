-- Migration 0017: Performance Indexes
-- 
-- Problem: Missing indexes on frequently queried date columns and foreign keys
-- Impact: Reports and queries become 10-100x slower as data grows
-- Solution: Add indexes on date columns, foreign keys, and common query patterns

-- ============ DATE INDEXES FOR REPORTS ============

-- Sales date index (with is_deleted filter for better performance)
CREATE INDEX IF NOT EXISTS idx_sales_date_deleted 
ON sales(date DESC) WHERE is_deleted = 0;

-- Purchases date index
CREATE INDEX IF NOT EXISTS idx_purchases_date_deleted 
ON purchases(date DESC) WHERE is_deleted = 0;

-- Expenses date index
CREATE INDEX IF NOT EXISTS idx_expenses_date_deleted 
ON expenses(date DESC) WHERE is_deleted = 0;

-- Account transactions date index (for ledger queries)
CREATE INDEX IF NOT EXISTS idx_account_transactions_date 
ON account_transactions(date DESC, account_id);

-- Account transactions by account (for balance verification)
CREATE INDEX IF NOT EXISTS idx_account_transactions_account 
ON account_transactions(account_id, date DESC);

-- ============ FOREIGN KEY INDEXES ============

-- Sales customer lookup
CREATE INDEX IF NOT EXISTS idx_sales_customer_id 
ON sales(customer_id) WHERE is_deleted = 0;

-- Purchases supplier lookup
CREATE INDEX IF NOT EXISTS idx_purchases_supplier_id 
ON purchases(supplier_id) WHERE is_deleted = 0;

-- Payments party lookup
CREATE INDEX IF NOT EXISTS idx_payments_party 
ON payments(party_type, party_id) WHERE is_deleted = 0;

-- ============ STATUS QUERIES ============

-- Sales by status (for unpaid/partial invoice lists)
CREATE INDEX IF NOT EXISTS idx_sales_status 
ON sales(status, customer_id) WHERE is_deleted = 0;

-- Purchases by status
CREATE INDEX IF NOT EXISTS idx_purchases_status 
ON purchases(status, supplier_id) WHERE is_deleted = 0;

-- ============ STOCK QUERIES ============

-- Low stock items lookup
CREATE INDEX IF NOT EXISTS idx_items_low_stock 
ON items(id, current_stock, low_stock_threshold) 
WHERE current_stock <= low_stock_threshold AND is_deleted = 0;

-- Items by category
CREATE INDEX IF NOT EXISTS idx_items_category 
ON items(category_id) WHERE is_deleted = 0;

-- ============ AUDIT LOG ============

-- Audit log by date (for recent activity queries)
CREATE INDEX IF NOT EXISTS idx_audit_log_date 
ON audit_log(created_at DESC);

-- Audit log by table and record (for history lookup)
CREATE INDEX IF NOT EXISTS idx_audit_log_table_record 
ON audit_log(table_name, record_id);

-- ============ COMPOSITE INDEXES FOR COMMON QUERIES ============

-- Sales report queries (date + customer)
CREATE INDEX IF NOT EXISTS idx_sales_date_customer 
ON sales(date DESC, customer_id) WHERE is_deleted = 0;

-- Customer balance queries
CREATE INDEX IF NOT EXISTS idx_customers_balance 
ON customers(balance DESC) WHERE is_deleted = 0 AND balance > 0;

-- Supplier balance queries
CREATE INDEX IF NOT EXISTS idx_suppliers_balance 
ON suppliers(balance DESC) WHERE is_deleted = 0 AND balance > 0;

-- Van assignments by salesman and status
CREATE INDEX IF NOT EXISTS idx_van_assignments_salesman_status 
ON van_assignments(van_salesman_id, status);

-- ============ NOTES ============
-- These indexes significantly improve query performance for:
-- - Dashboard KPI calculations
-- - Report generation (P&L, party aging, stock valuation)
-- - Invoice list views (unpaid, partial)
-- - Account ledgers
-- - Audit log browsing
--
-- Expected performance improvement: 10-100x faster for date range queries
-- Storage overhead: ~5-10% of database size (acceptable trade-off)
