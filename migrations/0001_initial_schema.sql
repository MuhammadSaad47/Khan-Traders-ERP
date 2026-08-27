PRAGMA foreign_keys = ON;

-- ============================================
-- FOREIGN KEY STRATEGY DOCUMENTATION
-- ============================================
--
-- This database uses a mixed FK cascade strategy optimized for data integrity:
--
-- 1. TRANSACTION LINE ITEMS (CASCADE):
--    - sale_items.sale_id → sales(id) ON DELETE CASCADE
--    - purchase_items.purchase_id → purchases(id) ON DELETE CASCADE
--    - Rationale: Line items are meaningless without their parent transaction.
--                 Deleting a sale/purchase should automatically delete its items.
--
-- 2. MASTER RECORDS (RESTRICT - default):
--    - sales.customer_id → customers(id) [no ON DELETE]
--    - purchases.supplier_id → suppliers(id) [no ON DELETE]
--    - payments.account_id → accounts(id) [no ON DELETE]
--    - items.category_id → categories(id) [no ON DELETE]
--    - Rationale: Prevents accidental data loss. Cannot delete a customer
--                 who has sales, or an account with transactions.
--                 Application layer handles soft-delete with is_deleted flag.
--
-- 3. AUDIT TRAIL (RESTRICT - default):
--    - *.created_by → users(id) [no ON DELETE]
--    - *.deleted_by → users(id) [no ON DELETE]
--    - Rationale: Preserves audit history. Cannot delete a user who has
--                 created/modified records. Maintains data lineage.
--
-- 4. SOFT-DELETE PATTERN:
--    - All master tables use is_deleted flag instead of hard deletes
--    - Foreign keys remain valid (point to soft-deleted records)
--    - Application filters is_deleted = 0 in queries
--    - Historical data always preserved with referential integrity
--
-- NOTE: SQLite default for unspecified ON DELETE is RESTRICT (prevent delete).
--       This is the safest option for financial/transactional data.
-- ============================================

-- ============ USERS & SETTINGS ============

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'cashier'
    CHECK (role IN ('admin','manager','cashier','van_salesman')),
  phone TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE business_settings (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  business_name TEXT NOT NULL DEFAULT 'Khan Trader',
  address TEXT,
  phone TEXT,
  logo_path TEXT,
  currency_symbol TEXT NOT NULL DEFAULT 'Rs',
  timezone TEXT NOT NULL DEFAULT 'Asia/Karachi',
  receipt_footer TEXT DEFAULT 'Thank you for your business!',
  low_stock_threshold_default INTEGER NOT NULL DEFAULT 10,
  theme TEXT NOT NULL DEFAULT 'light' CHECK (theme IN ('light','dark')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ CATALOG ============

CREATE TABLE categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  variant TEXT,                              -- Product variation: flavor, color, grade (e.g., "Mango", "Original", "Premium")
  barcode TEXT UNIQUE,
  category_id INTEGER REFERENCES categories(id),
  units_per_crate INTEGER NOT NULL DEFAULT 1 CHECK (units_per_crate > 0),
  cost_price INTEGER NOT NULL DEFAULT 0 CHECK (cost_price >= 0),      -- cached, see §6
  retail_price INTEGER NOT NULL CHECK (retail_price > 0),
  wholesale_price INTEGER CHECK (wholesale_price IS NULL OR wholesale_price >= 0),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0), -- cached, see §6
  low_stock_threshold INTEGER NOT NULL DEFAULT 10,
  is_active INTEGER NOT NULL DEFAULT 1,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ PARTIES ============

CREATE TABLE areas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE routes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  area_id INTEGER REFERENCES areas(id),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  balance INTEGER NOT NULL DEFAULT 0,        -- cached; +ve = we owe supplier
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  shop_name TEXT,
  phone TEXT,
  address TEXT,
  area_id INTEGER REFERENCES areas(id),
  route_id INTEGER REFERENCES routes(id),
  credit_limit INTEGER NOT NULL DEFAULT 0,
  balance INTEGER NOT NULL DEFAULT 0,        -- cached; +ve = customer owes us
  crate_balance INTEGER NOT NULL DEFAULT 0,  -- cached; +ve = crates with customer
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ FINANCE: ACCOUNTS ============

CREATE TABLE accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,                 -- "Cash in Hand", "Bank - HBL", "Easypaisa"
  type TEXT NOT NULL CHECK (type IN ('cash','bank','mobile_wallet','other')),
  opening_balance INTEGER NOT NULL DEFAULT 0,
  current_balance INTEGER NOT NULL DEFAULT 0, -- cached, see §6
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE account_transactions (            -- source of truth for account balances
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES accounts(id),
  type TEXT NOT NULL CHECK (type IN ('debit','credit')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  reference_type TEXT CHECK (reference_type IN ('sale','purchase','payment','expense','transfer','adjustment')),
  reference_id INTEGER,
  description TEXT,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ INVENTORY MOVEMENT ============

CREATE TABLE stock_movements (                 -- source of truth for items.current_stock
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  change_qty INTEGER NOT NULL CHECK (change_qty != 0),
  type TEXT NOT NULL CHECK (type IN
    ('purchase','sale','return_in','return_out','adjustment','van_load','van_unload','damage')),
  reference_type TEXT CHECK (reference_type IN
    ('purchase','sale','stock_adjustment','van_assignment')),
  reference_id INTEGER,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE stock_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER NOT NULL REFERENCES items(id),
  change_qty INTEGER NOT NULL CHECK (change_qty != 0),
  reason TEXT NOT NULL CHECK (reason IN ('damage','expiry','theft','recount','other')),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE crate_transactions (              -- source of truth for customers.crate_balance
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  change_qty INTEGER NOT NULL CHECK (change_qty != 0), -- +ve = given to customer, -ve = returned
  reference_type TEXT CHECK (reference_type IN ('sale','return','manual_adjustment')),
  reference_id INTEGER,
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ PURCHASES ============

CREATE TABLE purchases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  date TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
  net_total INTEGER NOT NULL CHECK (net_total >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0,     -- cached
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  created_by INTEGER REFERENCES users(id),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE purchase_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  purchase_id INTEGER NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_cost INTEGER NOT NULL CHECK (unit_cost >= 0),   -- snapshot at time of purchase
  line_total INTEGER NOT NULL CHECK (line_total >= 0)
);

-- ============ SALES ============

CREATE TABLE sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  invoice_no TEXT NOT NULL UNIQUE,
  customer_id INTEGER REFERENCES customers(id),        -- nullable: walk-in cash sale
  date TEXT NOT NULL DEFAULT (datetime('now')),
  due_date TEXT,
  subtotal INTEGER NOT NULL CHECK (subtotal >= 0),
  discount INTEGER NOT NULL DEFAULT 0 CHECK (discount >= 0),
  net_total INTEGER NOT NULL CHECK (net_total >= 0),
  paid_amount INTEGER NOT NULL DEFAULT 0,     -- cached
  status TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','partial','paid')),
  sale_type TEXT NOT NULL DEFAULT 'counter' CHECK (sale_type IN ('counter','van','wholesale')),
  van_assignment_id INTEGER REFERENCES van_assignments(id),
  created_by INTEGER REFERENCES users(id),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty INTEGER NOT NULL CHECK (qty > 0),
  unit_price INTEGER NOT NULL CHECK (unit_price >= 0),  -- snapshot at time of sale
  line_total INTEGER NOT NULL CHECK (line_total >= 0)
);

-- ============ PAYMENTS (polymorphic) ============

CREATE TABLE payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  party_type TEXT NOT NULL CHECK (party_type IN ('customer','supplier')),
  party_id INTEGER NOT NULL,                  -- validated in service layer, see §6.2
  direction TEXT NOT NULL CHECK (direction IN ('in','out')), -- in = received, out = paid
  amount INTEGER NOT NULL CHECK (amount > 0),
  method TEXT NOT NULL CHECK (method IN ('cash','easypaisa','bank','cheque','other')),
  account_id INTEGER REFERENCES accounts(id),
  reference_type TEXT CHECK (reference_type IN ('sale','purchase','installment','general')),
  reference_id INTEGER,
  date TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ INSTALLMENTS ============

-- ============ VAN SALES ============

CREATE TABLE van_assignments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  van_salesman_id INTEGER NOT NULL REFERENCES users(id),
  route_id INTEGER REFERENCES routes(id),
  date TEXT NOT NULL DEFAULT (datetime('now')),
  status TEXT NOT NULL DEFAULT 'loaded' CHECK (status IN ('loaded','in_progress','reconciled')),
  notes TEXT,
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE van_assignment_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  van_assignment_id INTEGER NOT NULL REFERENCES van_assignments(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  qty_loaded INTEGER NOT NULL CHECK (qty_loaded >= 0),
  qty_returned INTEGER NOT NULL DEFAULT 0 CHECK (qty_returned >= 0)
  -- qty_sold is derived in the service layer as (qty_loaded - qty_returned);
  -- deliberately not a generated column so partial-day reconciliation stays simple.
);

-- ============ EXPENSES ============

CREATE TABLE expense_categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER REFERENCES expense_categories(id),
  amount INTEGER NOT NULL CHECK (amount > 0),
  account_id INTEGER REFERENCES accounts(id),
  date TEXT NOT NULL DEFAULT (datetime('now')),
  note TEXT,
  created_by INTEGER REFERENCES users(id),
  is_deleted INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  deleted_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============ AUDIT & BACKUP ============

CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,                       -- 'create' | 'update' | 'delete' | 'restore' | 'login' ...
  table_name TEXT NOT NULL,
  record_id INTEGER,
  old_value TEXT,                             -- JSON snapshot
  new_value TEXT,                             -- JSON snapshot
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE backup_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  size_bytes INTEGER,
  destination TEXT NOT NULL CHECK (destination IN ('local','google_drive')),
  status TEXT NOT NULL CHECK (status IN ('success','failed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
