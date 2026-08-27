-- Allow same product (name+size+packaging) from different suppliers
-- This enables: Sting 500ml PET from Supplier A AND Supplier B as separate items

-- Drop the old unique constraint that prevented this
DROP INDEX IF EXISTS idx_items_unique_spec;

-- Create new unique constraint that includes supplier_id
-- This allows: Same product from different suppliers = OK
-- This prevents: Same product from same supplier = NOT OK (duplicate)
CREATE UNIQUE INDEX idx_items_unique_with_supplier 
ON items(
  name, 
  IFNULL(size, ''), 
  IFNULL(packaging, ''), 
  IFNULL(variant, ''),
  IFNULL(supplier_id, 0)  -- Include supplier to make it unique per supplier
) 
WHERE is_deleted = 0;
