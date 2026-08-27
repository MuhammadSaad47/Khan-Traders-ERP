-- Remove area_id and route_id from customers table
ALTER TABLE customers DROP COLUMN area_id;
ALTER TABLE customers DROP COLUMN route_id;
