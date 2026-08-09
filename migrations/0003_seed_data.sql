INSERT INTO business_settings (id, business_name, timezone) VALUES (1, 'Khan Trader', 'Asia/Karachi');

INSERT INTO accounts (name, type, opening_balance, current_balance) VALUES
  ('Cash in Hand', 'cash', 0, 0),
  ('Bank Account', 'bank', 0, 0),
  ('Easypaisa', 'mobile_wallet', 0, 0);

INSERT INTO categories (name) VALUES ('Soft Drinks'), ('Water'), ('Juices'), ('Other');

INSERT INTO expense_categories (name) VALUES
  ('Rent'), ('Salaries'), ('Fuel'), ('Utilities'), ('Maintenance'), ('Other');

-- Default admin: username 'admin', password to be set on first-run wizard, not seeded in plaintext.
