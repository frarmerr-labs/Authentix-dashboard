-- ============================================
-- PHASE 4: SCHEMA HARDENING & CORRECTIONS
-- ============================================
-- Corrects, normalizes, and hardens existing tables
-- Run after Phase 3 (app_id removal) is complete
-- ============================================

-- ============================================
-- 1. COMPANIES TABLE - HARDEN
-- ============================================

-- Ensure application_id constraints
ALTER TABLE public.companies
  ALTER COLUMN application_id SET NOT NULL;

-- Ensure UNIQUE constraint exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'companies_application_id_key'
    AND conrelid = 'public.companies'::regclass
  ) THEN
    ALTER TABLE public.companies ADD CONSTRAINT companies_application_id_key UNIQUE (application_id);
  END IF;
END $$;

-- Make application_id IMMUTABLE via trigger
CREATE OR REPLACE FUNCTION prevent_application_id_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.application_id IS DISTINCT FROM NEW.application_id THEN
    RAISE EXCEPTION 'application_id is immutable and cannot be changed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_application_id_update_trigger ON public.companies;
CREATE TRIGGER prevent_application_id_update_trigger
  BEFORE UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION prevent_application_id_update();

-- Ensure api_enabled defaults to false
ALTER TABLE public.companies
  ALTER COLUMN api_enabled SET DEFAULT false;

-- Ensure api_key_hash is nullable (correct for rotation)
-- (No action needed - already nullable)

-- Ensure status ENUM constraint
ALTER TABLE public.companies
  DROP CONSTRAINT IF EXISTS chk_companies_status;

ALTER TABLE public.companies
  ADD CONSTRAINT chk_companies_status
  CHECK (status IN ('active', 'suspended', 'closed'));

-- Ensure deleted_at exists and is indexed
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_companies_deleted_at
  ON public.companies(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Index for active companies
CREATE INDEX IF NOT EXISTS idx_companies_active
  ON public.companies(id)
  WHERE deleted_at IS NULL AND status = 'active';

-- ============================================
-- 2. CERTIFICATES TABLE - SCALE READINESS
-- ============================================

-- Ensure company_id index exists
CREATE INDEX IF NOT EXISTS idx_certificates_company_id
  ON public.certificates(company_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Ensure issued_at is indexed for time-based queries
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_certificates_issued_at
  ON public.certificates(issued_at DESC)
  WHERE deleted_at IS NULL;

-- Ensure verification_token is indexed and UNIQUE
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS verification_token TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token_unique
  ON public.certificates(verification_token)
  WHERE verification_token IS NOT NULL AND deleted_at IS NULL;

-- Ensure status ENUM is enforced
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'issued';

ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS chk_certificates_status;

ALTER TABLE public.certificates
  ADD CONSTRAINT chk_certificates_status
  CHECK (status IN ('issued', 'revoked', 'expired'));

-- Ensure revocation fields are consistent
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS revoked_at TIMESTAMPTZ;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS revoked_by UUID REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS revoke_reason TEXT;

-- Add constraint: if status=revoked, must have revoked_at
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS chk_certificates_revoked;

ALTER TABLE public.certificates
  ADD CONSTRAINT chk_certificates_revoked
  CHECK (
    (status = 'revoked' AND revoked_at IS NOT NULL) OR
    (status != 'revoked')
  );

-- Ensure soft delete via deleted_at
ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_certificates_deleted_at
  ON public.certificates(deleted_at)
  WHERE deleted_at IS NOT NULL;

-- Add index for active certificates
CREATE INDEX IF NOT EXISTS idx_certificates_active
  ON public.certificates(company_id, status, issued_at DESC)
  WHERE deleted_at IS NULL;

-- ============================================
-- 3. CERTIFICATE_EVENTS - IMMUTABILITY
-- ============================================

-- Ensure table exists and has correct structure
CREATE TABLE IF NOT EXISTS public.certificate_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('issued', 'revoked', 'delivered', 'verified', 'downloaded', 'expired')),
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'user', 'public', 'api')),
  actor_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revoke UPDATE and DELETE (append-only)
REVOKE UPDATE, DELETE ON public.certificate_events FROM authenticated, anon;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_certificate_events_certificate
  ON public.certificate_events(certificate_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificate_events_company
  ON public.certificate_events(company_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificate_events_created_at
  ON public.certificate_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificate_events_event_type
  ON public.certificate_events(event_type, created_at DESC);

-- ============================================
-- 4. AUDIT_LOGS - IMMUTABILITY
-- ============================================

-- Ensure table exists
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Revoke UPDATE and DELETE (append-only)
REVOKE UPDATE, DELETE ON public.audit_logs FROM authenticated, anon;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_audit_logs_company
  ON public.audit_logs(company_id, created_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs(user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id, created_at DESC)
  WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at
  ON public.audit_logs(created_at DESC);

-- ============================================
-- 5. EMAIL_MESSAGES - CONSISTENCY
-- ============================================

-- Ensure status ENUM is enforced
ALTER TABLE public.email_messages
  DROP CONSTRAINT IF EXISTS chk_email_messages_status;

ALTER TABLE public.email_messages
  ADD CONSTRAINT chk_email_messages_status
  CHECK (status IN ('queued', 'sent', 'delivered', 'opened', 'bounced', 'failed'));

-- Ensure provider_message_id is indexed
CREATE INDEX IF NOT EXISTS idx_email_messages_provider_id
  ON public.email_messages(provider_message_id)
  WHERE provider_message_id IS NOT NULL;

-- Ensure company_id + created_at index
CREATE INDEX IF NOT EXISTS idx_email_messages_company_time
  ON public.email_messages(company_id, created_at DESC);

-- Ensure certificate_id index
CREATE INDEX IF NOT EXISTS idx_email_messages_certificate
  ON public.email_messages(certificate_id)
  WHERE certificate_id IS NOT NULL;

-- Ensure status index for queue processing
CREATE INDEX IF NOT EXISTS idx_email_messages_pending
  ON public.email_messages(created_at)
  WHERE status IN ('queued', 'sent');

-- Make snapshots immutable via trigger
CREATE OR REPLACE FUNCTION prevent_email_snapshot_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.subject_snapshot IS DISTINCT FROM NEW.subject_snapshot THEN
    RAISE EXCEPTION 'subject_snapshot is immutable';
  END IF;
  IF OLD.body_snapshot IS DISTINCT FROM NEW.body_snapshot THEN
    RAISE EXCEPTION 'body_snapshot is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_email_snapshot_update_trigger ON public.email_messages;
CREATE TRIGGER prevent_email_snapshot_update_trigger
  BEFORE UPDATE ON public.email_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_email_snapshot_update();

-- ============================================
-- 6. WHATSAPP_MESSAGES - CONSISTENCY
-- ============================================

-- Ensure status ENUM is enforced
ALTER TABLE public.whatsapp_messages
  DROP CONSTRAINT IF EXISTS chk_whatsapp_messages_status;

ALTER TABLE public.whatsapp_messages
  ADD CONSTRAINT chk_whatsapp_messages_status
  CHECK (status IN ('queued', 'sent', 'delivered', 'read', 'failed'));

-- Ensure provider_message_id is indexed
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id
  ON public.whatsapp_messages(meta_message_id)
  WHERE meta_message_id IS NOT NULL;

-- Ensure company_id + created_at index
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company_time
  ON public.whatsapp_messages(company_id, created_at DESC);

-- Ensure certificate_id index
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_certificate
  ON public.whatsapp_messages(certificate_id)
  WHERE certificate_id IS NOT NULL;

-- Ensure status index for queue processing
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pending
  ON public.whatsapp_messages(created_at)
  WHERE status IN ('queued', 'sent');

-- Make message_payload immutable via trigger
CREATE OR REPLACE FUNCTION prevent_whatsapp_payload_update()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.message_payload IS DISTINCT FROM NEW.message_payload THEN
    RAISE EXCEPTION 'message_payload is immutable';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS prevent_whatsapp_payload_update_trigger ON public.whatsapp_messages;
CREATE TRIGGER prevent_whatsapp_payload_update_trigger
  BEFORE UPDATE ON public.whatsapp_messages
  FOR EACH ROW
  EXECUTE FUNCTION prevent_whatsapp_payload_update();

-- ============================================
-- 7. IMPORT_JOBS - DATA SAFETY
-- ============================================

-- Ensure deleted_at exists
ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Ensure status ENUM is enforced
ALTER TABLE public.import_jobs
  DROP CONSTRAINT IF EXISTS chk_import_jobs_status;

ALTER TABLE public.import_jobs
  ADD CONSTRAINT chk_import_jobs_status
  CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled'));

-- Ensure company_id is NOT NULL
ALTER TABLE public.import_jobs
  ALTER COLUMN company_id SET NOT NULL;

-- Index for active imports
CREATE INDEX IF NOT EXISTS idx_import_jobs_active
  ON public.import_jobs(company_id, created_at DESC)
  WHERE deleted_at IS NULL;

-- Index for processing queue
CREATE INDEX IF NOT EXISTS idx_import_jobs_pending
  ON public.import_jobs(created_at)
  WHERE status IN ('queued', 'processing');

-- Validate JSON fields
ALTER TABLE public.import_jobs
  DROP CONSTRAINT IF EXISTS chk_import_jobs_mapping_valid;

ALTER TABLE public.import_jobs
  ADD CONSTRAINT chk_import_jobs_mapping_valid
  CHECK (mapping IS NULL OR jsonb_typeof(mapping) = 'object');

ALTER TABLE public.import_jobs
  DROP CONSTRAINT IF EXISTS chk_import_jobs_errors_valid;

ALTER TABLE public.import_jobs
  ADD CONSTRAINT chk_import_jobs_errors_valid
  CHECK (errors IS NULL OR jsonb_typeof(errors) = 'array');

-- ============================================
-- 8. IMPORT_DATA_ROWS - DATA SAFETY
-- ============================================

-- Ensure import_job_id is NOT NULL
ALTER TABLE public.import_data_rows
  ALTER COLUMN import_job_id SET NOT NULL;

-- Ensure company_id is NOT NULL
ALTER TABLE public.import_data_rows
  ALTER COLUMN company_id SET NOT NULL;

-- Index for job retrieval
CREATE INDEX IF NOT EXISTS idx_import_data_rows_job
  ON public.import_data_rows(import_job_id, row_number);

-- Validate JSON field
ALTER TABLE public.import_data_rows
  DROP CONSTRAINT IF EXISTS chk_import_data_rows_data_valid;

ALTER TABLE public.import_data_rows
  ADD CONSTRAINT chk_import_data_rows_data_valid
  CHECK (data IS NOT NULL AND jsonb_typeof(data) = 'object');

-- ============================================
-- 9. TEMPLATES - DATA SAFETY
-- ============================================

-- Ensure deleted_at exists
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Ensure status ENUM is enforced
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS chk_templates_status;

ALTER TABLE public.templates
  ADD CONSTRAINT chk_templates_status
  CHECK (status IN ('draft', 'active', 'archived'));

-- Ensure company_id is NOT NULL
ALTER TABLE public.templates
  ALTER COLUMN company_id SET NOT NULL;

-- Index for active templates
CREATE INDEX IF NOT EXISTS idx_templates_active
  ON public.templates(company_id, created_at DESC)
  WHERE deleted_at IS NULL AND status = 'active';

-- Validate JSON fields
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS chk_templates_fields_valid;

ALTER TABLE public.templates
  ADD CONSTRAINT chk_templates_fields_valid
  CHECK (fields IS NULL OR jsonb_typeof(fields) = 'array');

-- ============================================
-- 10. USERS - HARDEN
-- ============================================

-- Ensure status ENUM is enforced
ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS chk_users_status;

ALTER TABLE public.users
  ADD CONSTRAINT chk_users_status
  CHECK (status IN ('active', 'invited', 'disabled'));

-- Ensure company_id is NOT NULL
ALTER TABLE public.users
  ALTER COLUMN company_id SET NOT NULL;

-- Ensure deleted_at exists
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Index for active users
CREATE INDEX IF NOT EXISTS idx_users_active
  ON public.users(company_id)
  WHERE deleted_at IS NULL AND status = 'active';

-- ============================================
-- 11. VERIFICATION_LOGS - APPEND-ONLY
-- ============================================

-- Ensure result ENUM is enforced
ALTER TABLE public.verification_logs
  DROP CONSTRAINT IF EXISTS chk_verification_logs_result;

ALTER TABLE public.verification_logs
  ADD CONSTRAINT chk_verification_logs_result
  CHECK (result IN ('valid', 'revoked', 'expired', 'not_found', 'invalid_token'));

-- Make append-only (no updates/deletes)
REVOKE UPDATE, DELETE ON public.verification_logs FROM authenticated, anon;

-- Ensure indexes exist
CREATE INDEX IF NOT EXISTS idx_verification_logs_certificate
  ON public.verification_logs(certificate_id, verified_at DESC);

CREATE INDEX IF NOT EXISTS idx_verification_logs_company
  ON public.verification_logs(company_id, verified_at DESC)
  WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_verification_logs_time
  ON public.verification_logs(verified_at DESC);

-- ============================================
-- 12. RLS ENFORCEMENT
-- ============================================

-- Ensure RLS is enabled on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_data_rows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificate_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

-- Note: invoices and invoice_line_items RLS policies handled in billing migration

-- ============================================
-- 13. VERIFICATION QUERIES
-- ============================================

DO $$
BEGIN
  RAISE NOTICE '✅ Phase 4 schema hardening complete';
  RAISE NOTICE '   - Companies: application_id immutable, status enforced';
  RAISE NOTICE '   - Certificates: indexed for scale, status enforced';
  RAISE NOTICE '   - Events: immutable (append-only)';
  RAISE NOTICE '   - Messages: snapshots immutable, status enforced';
  RAISE NOTICE '   - Imports: JSON validated, indexes added';
  RAISE NOTICE '   - Templates: status enforced, JSON validated';
  RAISE NOTICE '   - RLS: enabled on all tables';
END $$;

-- Final verification
SELECT
  'Phase 4 Verification' AS status,
  COUNT(*) AS total_tables
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';
