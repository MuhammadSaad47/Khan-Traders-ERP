-- Migration: Add Security Questions for Password Recovery
-- Created: 2026-08-13
-- Purpose: Enable password recovery through security question verification

-- Add security question fields to users table
ALTER TABLE users ADD COLUMN security_question_1 TEXT;
ALTER TABLE users ADD COLUMN security_answer_1_hash TEXT;
ALTER TABLE users ADD COLUMN security_question_2 TEXT;
ALTER TABLE users ADD COLUMN security_answer_2_hash TEXT;
ALTER TABLE users ADD COLUMN security_question_3 TEXT;
ALTER TABLE users ADD COLUMN security_answer_3_hash TEXT;

-- Add recovery attempt tracking fields
ALTER TABLE users ADD COLUMN recovery_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN last_recovery_attempt TEXT;
ALTER TABLE users ADD COLUMN recovery_locked_until TEXT;

-- Create index for faster recovery lookups
CREATE INDEX IF NOT EXISTS idx_users_username_recovery ON users(username, is_active, is_deleted);
