-- ============================================
-- MineCertificate PRODUCTION MIGRATION (FIXED)
-- Handles unknown schemas in empty tables
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- COMPANIES
-- ============================================
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS application_id TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS billing_plan TEXT,
  ADD COLUMN IF NOT EXISTS api_key_hash TEXT,
  ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_key_last_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS price_per_certificate NUMERIC(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR',
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.companies
SET application_id = substring(md5(id::text || random()::text), 1, 20)
WHERE application_id IS NULL;

ALTER TABLE public.companies ALTER COLUMN application_id SET NOT NULL;
ALTER TABLE public.companies DROP CONSTRAINT IF EXISTS chk_companies_status;
ALTER TABLE public.companies ADD CONSTRAINT chk_companies_status CHECK (status IN ('active', 'suspended', 'closed'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_application_id ON public.companies(application_id);
CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status) WHERE deleted_at IS NULL;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- USERS
-- ============================================
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.users DROP CONSTRAINT IF EXISTS chk_users_status;
ALTER TABLE public.users ADD CONSTRAINT chk_users_status CHECK (status IN ('active', 'invited', 'disabled'));
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================
-- TEMPLATES
-- ============================================
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS fields_schema_version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER,
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Migrate active boolean to status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'templates' AND column_name = 'active') THEN
    UPDATE public.templates SET status = CASE WHEN active THEN 'active' ELSE 'archived' END WHERE status IS NULL;
    ALTER TABLE public.templates DROP COLUMN active;
  END IF;
END $$;

ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS chk_templates_status;
ALTER TABLE public.templates ADD CONSTRAINT chk_templates_status CHECK (status IN ('draft', 'active', 'archived'));
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

