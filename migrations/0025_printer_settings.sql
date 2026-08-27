-- Migration 0025: Add thermal printer configuration to business_settings
ALTER TABLE business_settings ADD COLUMN printer_interface TEXT DEFAULT NULL;
ALTER TABLE business_settings ADD COLUMN printer_type TEXT NOT NULL DEFAULT 'EPSON';
ALTER TABLE business_settings ADD COLUMN printer_width INTEGER NOT NULL DEFAULT 80;
