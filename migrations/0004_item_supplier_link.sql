-- Migration to add supplier_id to items for interlinking
ALTER TABLE items ADD COLUMN supplier_id INTEGER REFERENCES suppliers(id);
