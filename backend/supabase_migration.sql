-- ============================================================
-- Smart Resource Allocation — Supabase Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- Safe to run multiple times (uses IF NOT EXISTS)
-- ============================================================

-- 1. assignments table — add missing columns
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS hours_spent INTEGER;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS rating INTEGER;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS feedback TEXT;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE;

-- 2. volunteer_profiles — add missing columns
ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS total_hours_contributed INTEGER DEFAULT 0;
ALTER TABLE volunteer_profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Change rating from INTEGER to FLOAT for accurate running averages
-- (safe: FLOAT is a superset of INTEGER, no data loss)
ALTER TABLE volunteer_profiles ALTER COLUMN rating TYPE FLOAT USING rating::FLOAT;

-- 3. users — add updated_at
ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 4. tasks — add updated_at
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 5. community_needs — add updated_at
ALTER TABLE community_needs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 6. field_reports — add updated_at
ALTER TABLE field_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 7. Backfill NULL updated_at for existing rows (DEFAULT NOW() only applies to new rows)
UPDATE volunteer_profiles SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE users SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE tasks SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE community_needs SET updated_at = created_at WHERE updated_at IS NULL;
UPDATE field_reports SET updated_at = created_at WHERE updated_at IS NULL;

-- 8. Backfill NULL total_hours_contributed
UPDATE volunteer_profiles SET total_hours_contributed = 0 WHERE total_hours_contributed IS NULL;

-- 9. Verify all columns exist
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE (table_name = 'assignments' AND column_name IN ('hours_spent', 'rating', 'feedback', 'completed_at'))
   OR (table_name = 'volunteer_profiles' AND column_name IN ('total_hours_contributed', 'updated_at', 'rating'))
   OR (table_name IN ('users', 'tasks', 'community_needs', 'field_reports') AND column_name = 'updated_at')
ORDER BY table_name, column_name;
