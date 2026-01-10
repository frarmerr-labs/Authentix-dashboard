-- ============================================
-- PHASE 3: CLEANUP LEGACY app_id
-- ============================================
-- Permanently removes app_id column and hardens application_id
-- Run this after Phase 2 bootstrap is complete and verified
-- ============================================

-- Safety check: Ensure application_id exists for all companies
DO $$
DECLARE
  companies_without_app_id INTEGER;
BEGIN
  SELECT COUNT(*) INTO companies_without_app_id
  FROM public.companies
  WHERE application_id IS NULL OR application_id = '';

  IF companies_without_app_id > 0 THEN
    RAISE EXCEPTION 'Cannot proceed: % companies missing application_id. Run Phase 2 bootstrap first.', companies_without_app_id;
  END IF;
END $$;

-- Drop any indexes on app_id
DROP INDEX IF EXISTS public.idx_companies_app_id;

-- Drop any unique constraints on app_id
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS companies_app_id_key;

-- Drop the app_id column
ALTER TABLE public.companies
  DROP COLUMN IF EXISTS app_id;

-- Harden application_id: Add NOT NULL constraint
ALTER TABLE public.companies
  ALTER COLUMN application_id SET NOT NULL;

-- Harden application_id: Ensure UNIQUE constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_application_id_key'
    AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_application_id_key UNIQUE (application_id);
  END IF;
END $$;

-- Ensure index exists on application_id for performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_application_id
  ON public.companies(application_id);

-- Verify api_key_hash remains nullable (for future rotations)
-- (No action needed - already nullable)

-- Verify api_enabled defaults to false for new companies
ALTER TABLE public.companies
  ALTER COLUMN api_enabled SET DEFAULT false;

-- Add helpful comment
COMMENT ON COLUMN public.companies.application_id IS
  'Immutable company identifier (format: xen_<env>_<base32_160bits>). Used for API auth and storage paths.';

-- Verification query
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 3 migration complete';
  RAISE NOTICE '   - app_id column dropped';
  RAISE NOTICE '   - application_id hardened (NOT NULL, UNIQUE)';
  RAISE NOTICE '   - api_key_hash remains nullable';
  RAISE NOTICE '   - api_enabled defaults to false';
END $$;

-- Final verification
SELECT
  'Phase 3 Verification' AS status,
  COUNT(*) AS total_companies,
  COUNT(application_id) AS companies_with_application_id,
  COUNT(api_key_hash) AS companies_with_api_key,
  SUM(CASE WHEN api_enabled THEN 1 ELSE 0 END) AS companies_with_api_enabled
FROM public.companies;
