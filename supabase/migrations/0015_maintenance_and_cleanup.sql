-- ============================================================
-- Migration 0015: Maintenance and Storage Cleanup
-- Optimizing storage by removing redundant indexes and reclaiming space.
-- ============================================================

-- 1. Remove redundant single-column index
-- This is already covered by the composite index (ward_name, user_id).
DROP INDEX IF EXISTS public.idx_patients_ward_name;

-- 2. Re-optimize the clinical search indexes
-- These GIN indexes can be large, but they are necessary for search.
-- We ensure they are up-to-date.
ANALYZE public.patients;
ANALYZE public.visits;
ANALYZE public.investigations;

-- 3. Diagnostic Tool (Manual)
-- Copy and run the query below in your Supabase SQL Editor 
-- to see exactly how much space each table and its indexes are using.
/*
SELECT
    relname AS "Table Name",
    pg_size_pretty(pg_table_size(C.oid)) AS "Data Size",
    pg_size_pretty(pg_indexes_size(C.oid)) AS "Index Size",
    pg_size_pretty(pg_total_relation_size(C.oid)) AS "Total Size (Inc Index)",
    reltuples::bigint AS "Approx Row Count"
FROM pg_class C
LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
WHERE nspname = 'public'
  AND relkind = 'r'
ORDER BY pg_total_relation_size(C.oid) DESC;
*/

-- 4. Quick Cleanup (Manual)
-- If you have recently deleted many patients, you can run:
-- VACUUM FULL public.patients;
-- in your SQL editor to immediately shrink the table on disk.
