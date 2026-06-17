-- Migration: Add comment column to transactions table
-- Purpose: Allows POS operators to attach notes/comments to transactions
-- (e.g. "Kids on Court 2", "Birthday party group")

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS comment TEXT;

-- Add a comment explaining the column
COMMENT ON COLUMN transactions.comment IS 'Optional operator note attached during POS checkout';
