-- Items
CREATE INDEX idx_items_barcode ON items(barcode);
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_name ON items(name);
CREATE INDEX idx_items_current_stock ON items(current_stock);
CREATE UNIQUE INDEX idx_items_name_variant ON items(name, variant) WHERE is_deleted = 0;

-- Stock movements
CREATE INDEX idx_stock_movements_item ON stock_movements(item_id);
CREATE INDEX idx_stock_movements_created ON stock_movements(created_at);
CREATE INDEX idx_stock_movements_type ON stock_movements(type);
CREATE INDEX idx_stock_movements_reference ON stock_movements(reference_type, reference_id);
CREATE INDEX idx_stock_movements_item_type ON stock_movements(item_id, type);

-- Sales
CREATE INDEX idx_sales_date ON sales(date);
CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_due_date ON sales(due_date);
CREATE INDEX idx_sales_invoice ON sales(invoice_no);
CREATE INDEX idx_sales_customer_date ON sales(customer_id, date);
CREATE INDEX idx_sale_items_sale ON sale_items(sale_id);
CREATE INDEX idx_sale_items_item ON sale_items(item_id);

-- Purchases
CREATE INDEX idx_purchases_supplier ON purchases(supplier_id);
CREATE INDEX idx_purchases_date ON purchases(date);
CREATE INDEX idx_purchases_due_date ON purchases(due_date);
CREATE INDEX idx_purchase_items_purchase ON purchase_items(purchase_id);

-- Accounts
CREATE INDEX idx_account_transactions_account ON account_transactions(account_id);
CREATE INDEX idx_account_transactions_date ON account_transactions(date);
CREATE INDEX idx_account_transactions_reference ON account_transactions(reference_type, reference_id);

-- Payments
CREATE INDEX idx_payments_party ON payments(party_type, party_id);
CREATE INDEX idx_payments_date ON payments(date);
CREATE INDEX idx_payments_reference ON payments(reference_type, reference_id);


-- Crates
CREATE INDEX idx_crate_transactions_customer ON crate_transactions(customer_id);

-- Van sales
CREATE INDEX idx_van_assignments_salesman ON van_assignments(van_salesman_id);
CREATE INDEX idx_van_assignments_date ON van_assignments(date);
CREATE INDEX idx_van_assignment_items_assignment ON van_assignment_items(van_assignment_id);

-- Expenses
CREATE INDEX idx_expenses_date ON expenses(date);
CREATE INDEX idx_expenses_category ON expenses(category_id);

-- Audit
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_created ON audit_log(created_at);
