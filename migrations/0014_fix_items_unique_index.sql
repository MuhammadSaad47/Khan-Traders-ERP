-- Fix UNIQUE constraint to include size and packaging
DROP INDEX IF EXISTS idx_items_name_variant;

CREATE UNIQUE INDEX idx_items_unique_spec 
ON items(name, IFNULL(size, ''), IFNULL(packaging, ''), IFNULL(variant, '')) 
WHERE is_deleted = 0;
