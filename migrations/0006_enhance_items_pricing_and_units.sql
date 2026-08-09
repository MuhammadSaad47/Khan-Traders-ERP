-- Rename retail_price to selling_price
ALTER TABLE items RENAME COLUMN retail_price TO selling_price;

-- Drop wholesale_price
ALTER TABLE items DROP COLUMN wholesale_price;

-- Rename units_per_crate to units_per_ctn
ALTER TABLE items RENAME COLUMN units_per_crate TO units_per_ctn;

-- Rename crate_balance to ctn_balance
ALTER TABLE customers RENAME COLUMN crate_balance TO ctn_balance;

-- Rename table crate_transactions to ctn_transactions
ALTER TABLE crate_transactions RENAME TO ctn_transactions;
