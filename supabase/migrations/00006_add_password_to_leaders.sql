-- Migration 00006: Add password column directly to leaders table
-- SBH Group of Hospitals, Raipur

-- 1. Add password column directly into leaders table where user name (full_name) is stored
ALTER TABLE leaders 
ADD COLUMN IF NOT EXISTS password VARCHAR(255) DEFAULT '123456';

COMMENT ON COLUMN leaders.password IS 'User personal login password stored directly alongside full_name in leaders table';

-- 2. Populate default password for existing leaders if null
UPDATE leaders 
SET password = '123456' 
WHERE password IS NULL;
