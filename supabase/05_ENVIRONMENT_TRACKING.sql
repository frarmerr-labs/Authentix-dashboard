-- ============================================
-- PHASE 5: ENVIRONMENT TRACKING
-- ============================================
-- Adds logical environment awareness to schema
-- Single Supabase project with logical separation
-- ============================================

-- Add environment column to companies table
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS environment TEXT DEFAULT 'test';

-- Enforce valid environments
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS chk_companies_environment;

ALTER TABLE public.companies
  ADD CONSTRAINT chk_companies_environment
  CHECK (environment IN ('dev', 'test', 'beta', 'prod'));

-- Set existing company to 'test' (current state)
UPDATE public.companies
SET environment = 'test'
WHERE environment IS NULL;

-- Make environment NOT NULL
ALTER TABLE public.companies
  ALTER COLUMN environment SET NOT NULL;

-- Add index for environment filtering
CREATE INDEX IF NOT EXISTS idx_companies_environment
  ON public.companies(environment)
  WHERE deleted_at IS NULL;

-- Add compound index for environment + status queries
CREATE INDEX IF NOT EXISTS idx_companies_env_status
  ON public.companies(environment, status)
  WHERE deleted_at IS NULL;

-- Add comment explaining purpose
COMMENT ON COLUMN public.companies.environment IS
  'Logical environment: dev (local), test (staging), beta (pre-prod), prod (production). Used for safety guards, not tenant isolation.';

-- Prevent environment downgrades (test→dev, prod→test, etc.)
CREATE OR REPLACE FUNCTION prevent_environment_downgrade()
RETURNS TRIGGER AS $$
DECLARE
  env_order_old INTEGER;
  env_order_new INTEGER;
BEGIN
  -- Assign environment order: dev=1, test=2, beta=3, prod=4
  env_order_old := CASE OLD.environment
    WHEN 'dev' THEN 1
    WHEN 'test' THEN 2
    WHEN 'beta' THEN 3
    WHEN 'prod' THEN 4
    ELSE 0
  END;

  env_order_new := CASE NEW.environment
    WHEN 'dev' THEN 1
    WHEN 'test' THEN 2
    WHEN 'beta' THEN 3
    WHEN 'prod' THEN 4
    ELSE 0
  END;

  -- Prevent downgrades (prod→beta, beta→test, etc.)
  IF env_order_new < env_order_old THEN
    RAISE EXCEPTION 'Environment downgrade not allowed: % → %', OLD.environment, NEW.environment;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_environment_downgrade_trigger ON public.companies;
CREATE TRIGGER prevent_environment_downgrade_trigger
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  WHEN (OLD.environment IS DISTINCT FROM NEW.environment)
  EXECUTE FUNCTION prevent_environment_downgrade();

-- Verification
DO $$
BEGIN
  RAISE NOTICE '✅ Phase 5 environment tracking complete';
  RAISE NOTICE '   - environment column added';
  RAISE NOTICE '   - Valid values: dev, test, beta, prod';
  RAISE NOTICE '   - Existing companies set to: test';
  RAISE NOTICE '   - Environment downgrades prevented';
END $$;

-- Final verification
SELECT
  'Phase 5 Verification' AS status,
  name,
  environment,
  application_id
FROM public.companies
ORDER BY created_at;
