-- Neutralize units_per_ctn for all existing items so legacy crate tracking logic is bypassed
UPDATE items SET units_per_ctn = 1;
