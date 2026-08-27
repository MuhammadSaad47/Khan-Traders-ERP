-- Migration 0007: Add Item Specifications (Size and Packaging)
-- 
-- FIELD USAGE GUIDELINES:
-- - name: Base product name (e.g., "Coca Cola")
-- - variant: Product variation - flavor, color, grade (e.g., "Mango", "Original", "Diet", "Premium")
-- - size: Physical quantity - volume, weight, count (e.g., "1.5L", "500g", "12 pack")
-- - packaging: Container type (e.g., "Bottle", "Can", "Carton", "Box")
--
-- Example: "Coca Cola Original 1.5L Bottle"
--   name = "Coca Cola"
--   variant = "Original"
--   size = "1.5L"
--   packaging = "Bottle"
--
-- All fields optional except name. Use what makes sense for your products.

-- Add size and packaging to items
ALTER TABLE items ADD COLUMN size TEXT;
ALTER TABLE items ADD COLUMN packaging TEXT;
