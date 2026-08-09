-- Add size and packaging to items
ALTER TABLE items ADD COLUMN size TEXT;
ALTER TABLE items ADD COLUMN packaging TEXT;
