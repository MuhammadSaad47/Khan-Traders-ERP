-- Migration 0009: Add soft deletes for payments and expense categories
ALTER TABLE payments ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE payments ADD COLUMN deleted_at TEXT;
ALTER TABLE payments ADD COLUMN deleted_by INTEGER;

ALTER TABLE expense_categories ADD COLUMN is_deleted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE expense_categories ADD COLUMN deleted_at TEXT;
ALTER TABLE expense_categories ADD COLUMN deleted_by INTEGER;
