-- ============================================
-- PRE-MIGRATION: Fix Empty Tables
-- Run this FIRST, then run FINAL_PRODUCTION_MIGRATION.sql
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Fix import_jobs table (add ALL base columns)
-- ============================================

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS file_name TEXT,
  ADD COLUMN IF NOT EXISTS file_storage_path TEXT,
  ADD COLUMN IF NOT EXISTS mapping JSONB,
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'queued',
  ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS succeeded_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_rows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS errors JSONB,
  ADD COLUMN IF NOT EXISTS uploaded_by UUID,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'import_jobs_pkey' AND conrelid = 'public.import_jobs'::regclass) THEN
    ALTER TABLE public.import_jobs ADD PRIMARY KEY (id);
  END IF;
END $$;

-- ============================================
-- Fix certificates table (add ALL base columns)
-- ============================================

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS template_id UUID,
  ADD COLUMN IF NOT EXISTS import_job_id UUID,
  ADD COLUMN IF NOT EXISTS recipient_name TEXT,
  ADD COLUMN IF NOT EXISTS recipient_email TEXT,
  ADD COLUMN IF NOT EXISTS course_name TEXT,
  ADD COLUMN IF NOT EXISTS course_date DATE,
  ADD COLUMN IF NOT EXISTS custom_fields JSONB,
  ADD COLUMN IF NOT EXISTS verification_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS qr_url TEXT,
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'certificates_pkey' AND conrelid = 'public.certificates'::regclass) THEN
    ALTER TABLE public.certificates ADD PRIMARY KEY (id);
  END IF;
END $$;

-- ============================================
-- Fix verification_logs table (add ALL base columns)
-- ============================================

ALTER TABLE public.verification_logs
  ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
  ADD COLUMN IF NOT EXISTS certificate_id UUID,
  ADD COLUMN IF NOT EXISTS company_id UUID,
  ADD COLUMN IF NOT EXISTS result TEXT,
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS user_agent TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Set primary key if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'verification_logs_pkey' AND conrelid = 'public.verification_logs'::regclass) THEN
    ALTER TABLE public.verification_logs ADD PRIMARY KEY (id);
  END IF;
END $$;

-- ============================================
-- Fix audit_logs table (if it exists)
-- ============================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs' AND table_schema = 'public') THEN
    -- Add columns if table exists
    ALTER TABLE public.audit_logs
      ADD COLUMN IF NOT EXISTS id UUID DEFAULT uuid_generate_v4(),
      ADD COLUMN IF NOT EXISTS company_id UUID,
      ADD COLUMN IF NOT EXISTS user_id UUID,
      ADD COLUMN IF NOT EXISTS action TEXT,
      ADD COLUMN IF NOT EXISTS entity_type TEXT,
      ADD COLUMN IF NOT EXISTS entity_id UUID,
      ADD COLUMN IF NOT EXISTS old_values JSONB,
      ADD COLUMN IF NOT EXISTS new_values JSONB,
      ADD COLUMN IF NOT EXISTS ip_address INET,
      ADD COLUMN IF NOT EXISTS user_agent TEXT,
      ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

    -- Set primary key if not exists
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_pkey' AND conrelid = 'public.audit_logs'::regclass) THEN
      ALTER TABLE public.audit_logs ADD PRIMARY KEY (id);
    END IF;
  END IF;
END $$;

-- ============================================
-- DONE - Now run FINAL_PRODUCTION_MIGRATION.sql
-- ============================================

SELECT 'Pre-migration complete. Now run FINAL_PRODUCTION_MIGRATION.sql' AS message;
