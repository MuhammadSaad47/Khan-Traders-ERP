-- Migration 0020: Add discount validation constraint
-- Ensures discount never exceeds subtotal for data integrity
-- Critical for long-term warehouse use to prevent illogical financial records

-- Note: SQLite doesn't support adding CHECK constraints to existing tables
-- We need to verify this constraint is enforced in application layer

-- Add validation comment for future reference
-- Constraint needed: discount <= subtotal for sales and purchases tables

-- For new installations, this constraint should be added to initial schema
-- For existing installations, data validation query:

-- Check for invalid discounts in sales:
-- SELECT id, invoice_no, subtotal, discount, net_total
-- FROM sales
-- WHERE discount > subtotal AND is_deleted = 0;

-- Check for invalid discounts in purchases:
-- SELECT id, invoice_no, subtotal, discount, net_total
-- FROM purchases
-- WHERE discount > subtotal AND is_deleted = 0;

-- ============================================
-- APPLICATION LAYER VALIDATION (Required)
-- ============================================
-- Backend services MUST validate:
-- 1. discount <= subtotal
-- 2. net_total = subtotal - discount
-- 
-- This prevents data corruption from:
-- - Frontend bugs
-- - Direct API calls
-- - Future UI changes
-- ============================================

-- Since we cannot add CHECK constraints to existing tables in SQLite,
-- we document this requirement for code-level validation.
-- All sale/purchase creation and update functions MUST validate discount <= subtotal.
