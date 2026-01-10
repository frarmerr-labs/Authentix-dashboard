-- ============================================
-- MineCertificate Production Database Migration
-- Date: 2026-01-06
-- ============================================
--
-- SAFE MIGRATION: All changes are additive
-- Production data: 1 company, 1 user, 4 templates
-- Estimated execution time: 5-10 minutes
-- Downtime: 0 minutes
--
-- ============================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- For gen_random_bytes()

-- ============================================
-- SECTION 1: ALTER EXISTING TABLES
-- ============================================

-- --------------------------------------------
-- 1.1 ALTER companies (add API & billing fields)
-- --------------------------------------------

-- Public application ID (16-20 chars, for API routing)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS application_id TEXT UNIQUE;

-- Generate application_id for existing companies (backfill)
UPDATE public.companies
SET application_id = substring(md5(id::text || random()::text), 1, 20)
WHERE application_id IS NULL;

-- Make NOT NULL after backfill
ALTER TABLE public.companies
  ALTER COLUMN application_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_companies_application_id
  ON public.companies(application_id);

-- API authentication
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS api_key_created_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_key_last_rotated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS api_enabled BOOLEAN DEFAULT false;

-- Pricing (default ₹10 per certificate)
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS price_per_certificate NUMERIC(10,2) DEFAULT 10.00,
  ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'INR';

COMMENT ON COLUMN public.companies.application_id IS
  'Public 16-20 character identifier for API routing and storage paths';

COMMENT ON COLUMN public.companies.api_key IS
  'Hashed API key for programmatic access (store hash only, not plaintext)';

COMMENT ON COLUMN public.companies.price_per_certificate IS
  'Per-certificate price for billing (default ₹10.00 INR)';

-- --------------------------------------------
-- 1.2 ALTER templates (add categorization & field config)
-- --------------------------------------------

-- CRITICAL: Add fields JSONB column for field configuration
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS fields JSONB DEFAULT '[]'::jsonb;

-- Template dimensions (for canvas sizing)
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS width INTEGER,
  ADD COLUMN IF NOT EXISTS height INTEGER;

-- Categorization
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS category_id UUID,
  ADD COLUMN IF NOT EXISTS sub_category TEXT;

-- Usage tracking
ALTER TABLE public.templates
  ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add FK constraint for category_id (will be created later)
-- ALTER TABLE public.templates
--   ADD CONSTRAINT fk_templates_category
--   FOREIGN KEY (category_id) REFERENCES public.template_categories(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_templates_category ON public.templates(category_id);

COMMENT ON COLUMN public.templates.fields IS
  'JSONB array of field configurations for certificate generation';

COMMENT ON COLUMN public.templates.version IS
  'Version number, incremented on field changes for history tracking';

-- --------------------------------------------
-- 1.3 ALTER import_jobs (add persistence flags)
-- --------------------------------------------

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS data_persisted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS reusable BOOLEAN DEFAULT true;

COMMENT ON COLUMN public.import_jobs.data_persisted IS
  'True if imported data rows are stored in import_data_rows table';

COMMENT ON COLUMN public.import_jobs.reusable IS
  'True if this import can be used for multiple certificate batches';

-- --------------------------------------------
-- 1.4 ALTER certificates (add category, expiry, billing)
-- --------------------------------------------

ALTER TABLE public.certificates
  ADD COLUMN IF NOT EXISTS category TEXT,
  ADD COLUMN IF NOT EXISTS sub_category TEXT,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS qr_code_url TEXT,
  ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS invoice_id UUID,
  ADD COLUMN IF NOT EXISTS billed_at TIMESTAMPTZ;

-- Add FK constraint for invoice_id (will be created later)
-- ALTER TABLE public.certificates
--   ADD CONSTRAINT fk_certificates_invoice
--   FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_certificates_category ON public.certificates(company_id, category);
CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON public.certificates(expiry_date) WHERE expiry_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_certificates_unbilled ON public.certificates(company_id, issued_at) WHERE billed_at IS NULL;

COMMENT ON COLUMN public.certificates.expiry_date IS
  'Certificate expiration date (NULL = never expires)';

COMMENT ON COLUMN public.certificates.metadata IS
  'Flexible JSONB storage for custom certificate fields';

-- ============================================
-- SECTION 2: CREATE NEW TABLES
-- ============================================

-- --------------------------------------------
-- 2.1 template_categories (hierarchical organization)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.template_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.template_categories(id) ON DELETE CASCADE,
  is_system BOOLEAN DEFAULT false,
  display_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Unique names per company (NULL company_id = system category)
  UNIQUE NULLS NOT DISTINCT (company_id, name, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_template_categories_company
  ON public.template_categories(company_id) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_categories_parent
  ON public.template_categories(parent_id) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_template_categories_system
  ON public.template_categories(is_system) WHERE is_system = true;

COMMENT ON TABLE public.template_categories IS
  'Hierarchical categories for templates (system-wide + per-company)';

-- Now add the FK constraint to templates
ALTER TABLE public.templates
  DROP CONSTRAINT IF EXISTS fk_templates_category;

ALTER TABLE public.templates
  ADD CONSTRAINT fk_templates_category
  FOREIGN KEY (category_id) REFERENCES public.template_categories(id) ON DELETE SET NULL;

-- --------------------------------------------
-- 2.2 user_invitations (team member invites)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  invited_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate active invites
  UNIQUE (company_id, email) WHERE status = 'pending'
);

CREATE INDEX IF NOT EXISTS idx_user_invitations_company
  ON public.user_invitations(company_id);

CREATE INDEX IF NOT EXISTS idx_user_invitations_token
  ON public.user_invitations(token) WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_user_invitations_email
  ON public.user_invitations(company_id, email);

COMMENT ON TABLE public.user_invitations IS
  'Email-based team member invitations (email is pre-filled, not editable)';

-- --------------------------------------------
-- 2.3 import_data_rows (persistent imported data)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.import_data_rows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_job_id UUID NOT NULL REFERENCES public.import_jobs(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  data JSONB NOT NULL,
  is_deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE (import_job_id, row_number)
);

CREATE INDEX IF NOT EXISTS idx_import_data_rows_job
  ON public.import_data_rows(import_job_id) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_import_data_rows_company
  ON public.import_data_rows(company_id) WHERE is_deleted = false;

-- GIN index for JSON querying
CREATE INDEX IF NOT EXISTS idx_import_data_rows_data_gin
  ON public.import_data_rows USING GIN (data);

COMMENT ON TABLE public.import_data_rows IS
  'Persistent storage for imported CSV/Excel data (editable, reusable, soft-deletable)';

COMMENT ON COLUMN public.import_data_rows.data IS
  'JSONB object containing all column values from imported row';

-- --------------------------------------------
-- 2.4 certificate_deliveries (delivery event tracking)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.certificate_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('download', 'email', 'whatsapp')),
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'bounced')),
  provider TEXT,
  provider_message_id TEXT,
  provider_response JSONB,
  error_message TEXT,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_certificate_deliveries_cert
  ON public.certificate_deliveries(certificate_id);

CREATE INDEX IF NOT EXISTS idx_certificate_deliveries_company_channel
  ON public.certificate_deliveries(company_id, channel, attempted_at DESC);

CREATE INDEX IF NOT EXISTS idx_certificate_deliveries_status
  ON public.certificate_deliveries(status, attempted_at DESC)
  WHERE status IN ('pending', 'failed');

COMMENT ON TABLE public.certificate_deliveries IS
  'Append-only event log for all certificate delivery attempts (download, email, WhatsApp)';

-- --------------------------------------------
-- 2.5 message_templates (email & WhatsApp templates)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('email', 'whatsapp')),
  is_system BOOLEAN DEFAULT false,
  subject TEXT,
  body TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- System templates are global, user templates are company-scoped
  UNIQUE NULLS NOT DISTINCT (company_id, name, type) WHERE is_system = false OR company_id IS NULL
);

CREATE INDEX IF NOT EXISTS idx_message_templates_company_type
  ON public.message_templates(company_id, type) WHERE active = true AND company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_message_templates_system
  ON public.message_templates(type) WHERE is_system = true AND active = true;

COMMENT ON TABLE public.message_templates IS
  'Email and WhatsApp message templates (system-provided + user-customizable, versioned)';

COMMENT ON COLUMN public.message_templates.variables IS
  'JSONB array of variable names (e.g., ["recipient_name", "course_name", "verification_url"])';

-- --------------------------------------------
-- 2.6 invoices (billing records)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE RESTRICT,
  invoice_number TEXT NOT NULL UNIQUE,

  -- Billing period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Amounts (snapshot - never recalculate)
  subtotal NUMERIC(12,2) NOT NULL,
  tax_rate NUMERIC(5,2) DEFAULT 18.00,
  tax_amount NUMERIC(12,2) NOT NULL,
  total_amount NUMERIC(12,2) NOT NULL,
  currency TEXT DEFAULT 'INR',

  -- Payment tracking
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled', 'refunded')),
  payment_method TEXT,
  payment_gateway_id TEXT,
  payment_gateway_response JSONB,
  paid_at TIMESTAMPTZ,
  due_date DATE NOT NULL,

  -- Invoice metadata
  notes TEXT,
  pdf_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CHECK (period_end >= period_start),
  CHECK (subtotal >= 0),
  CHECK (tax_amount >= 0),
  CHECK (total_amount >= 0)
);

CREATE INDEX IF NOT EXISTS idx_invoices_company_period
  ON public.invoices(company_id, period_start, period_end);

CREATE INDEX IF NOT EXISTS idx_invoices_status_due
  ON public.invoices(status, due_date)
  WHERE status IN ('pending', 'overdue');

CREATE INDEX IF NOT EXISTS idx_invoices_number
  ON public.invoices(invoice_number);

COMMENT ON TABLE public.invoices IS
  'Monthly/periodic invoices with snapshot amounts (never recalculated)';

-- Now add FK constraint to certificates
ALTER TABLE public.certificates
  DROP CONSTRAINT IF EXISTS fk_certificates_invoice;

ALTER TABLE public.certificates
  ADD CONSTRAINT fk_certificates_invoice
  FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE SET NULL;

-- --------------------------------------------
-- 2.7 invoice_line_items (per-certificate billing)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  certificate_id UUID REFERENCES public.certificates(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC(12,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice
  ON public.invoice_line_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_certificate
  ON public.invoice_line_items(certificate_id) WHERE certificate_id IS NOT NULL;

COMMENT ON TABLE public.invoice_line_items IS
  'Individual line items for invoices (typically one per certificate)';

-- --------------------------------------------
-- 2.8 audit_logs (system-wide audit trail)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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

-- Partition-friendly indexes (time-series data)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created
  ON public.audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created
  ON public.audit_logs(company_id, created_at DESC) WHERE company_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_user
  ON public.audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs(entity_type, entity_id) WHERE entity_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_audit_logs_action
  ON public.audit_logs(action, created_at DESC);

COMMENT ON TABLE public.audit_logs IS
  'Immutable append-only audit trail for all system actions';

-- --------------------------------------------
-- 2.9 company_settings (per-company configuration)
-- --------------------------------------------

CREATE TABLE IF NOT EXISTS public.company_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL UNIQUE REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Feature flags
  email_delivery_enabled BOOLEAN DEFAULT true,
  whatsapp_delivery_enabled BOOLEAN DEFAULT false,
  api_access_enabled BOOLEAN DEFAULT false,

  -- Email configuration
  email_from_name TEXT,
  email_from_address TEXT,
  email_reply_to TEXT,

  -- WhatsApp configuration
  whatsapp_api_key TEXT,
  whatsapp_sender_number TEXT,

  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#ff5400',

  -- Limits
  max_certificates_per_batch INTEGER DEFAULT 50,
  max_import_rows INTEGER DEFAULT 10000,

  -- Custom settings (flexible JSONB)
  custom_settings JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_settings_company
  ON public.company_settings(company_id);

COMMENT ON TABLE public.company_settings IS
  'Per-company configuration settings (feature flags, branding, API keys, limits)';

-- ============================================
-- SECTION 3: TRIGGERS & FUNCTIONS
-- ============================================

-- --------------------------------------------
-- 3.1 Updated timestamp triggers (for new tables)
-- --------------------------------------------

CREATE TRIGGER update_template_categories_updated_at
  BEFORE UPDATE ON public.template_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON public.company_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- --------------------------------------------
-- 3.2 Template version increment trigger
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_template_version()
RETURNS TRIGGER AS $$
BEGIN
  -- Increment version if fields changed
  IF OLD.fields IS DISTINCT FROM NEW.fields THEN
    NEW.version = OLD.version + 1;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS template_version_increment ON public.templates;

CREATE TRIGGER template_version_increment
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_template_version();

-- --------------------------------------------
-- 3.3 Auto-create company_settings on company creation
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.create_company_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.company_settings (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_create_company_settings ON public.companies;

CREATE TRIGGER auto_create_company_settings
  AFTER INSERT ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.create_company_settings();

-- --------------------------------------------
-- 3.4 API key generation function
-- --------------------------------------------

CREATE OR REPLACE FUNCTION public.generate_api_key(company_uuid UUID)
RETURNS TEXT AS $$
DECLARE
  new_key TEXT;
BEGIN
  -- Generate 64-character hex key
  new_key := encode(gen_random_bytes(32), 'hex');

  UPDATE public.companies
  SET
    api_key = new_key,
    api_key_created_at = COALESCE(api_key_created_at, NOW()),
    api_key_last_rotated_at = NOW(),
    api_enabled = true
  WHERE id = company_uuid;

  RETURN new_key;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.generate_api_key IS
  'Generates new API key for company (returns plaintext - show once, then hash for storage)';

-- ============================================
-- SECTION 4: SEED SYSTEM DATA
-- ============================================

-- --------------------------------------------
-- 4.1 System template categories
-- --------------------------------------------

INSERT INTO public.template_categories (company_id, name, is_system, display_order)
VALUES
  (NULL, 'Educational', true, 1),
  (NULL, 'Professional', true, 2),
  (NULL, 'Event', true, 3),
  (NULL, 'Achievement', true, 4),
  (NULL, 'Completion', true, 5),
  (NULL, 'Participation', true, 6),
  (NULL, 'Other', true, 99)
ON CONFLICT DO NOTHING;

-- --------------------------------------------
-- 4.2 System message templates (Email)
-- --------------------------------------------

INSERT INTO public.message_templates (company_id, name, type, is_system, subject, body, variables)
VALUES
  (
    NULL,
    'Certificate Delivery',
    'email',
    true,
    'Your {{course_name}} Certificate is Ready',
    E'Dear {{recipient_name}},\n\nCongratulations on completing {{course_name}}!\n\nPlease find your certificate attached to this email.\n\nYou can verify your certificate at any time using this link:\n{{verification_url}}\n\nBest regards,\n{{company_name}}',
    '["recipient_name", "course_name", "verification_url", "company_name"]'::jsonb
  ),
  (
    NULL,
    'Certificate Revoked',
    'email',
    true,
    'Certificate Revocation Notice',
    E'Dear {{recipient_name}},\n\nThis is to inform you that your certificate for {{course_name}} has been revoked.\n\nReason: {{revoke_reason}}\n\nIf you believe this is an error, please contact us immediately.\n\nSincerely,\n{{company_name}}',
    '["recipient_name", "course_name", "revoke_reason", "company_name"]'::jsonb
  ),
  (
    NULL,
    'Team Invitation',
    'email',
    true,
    'You''ve been invited to join {{company_name}} on MineCertificate',
    E'Hi there,\n\n{{inviter_name}} has invited you to join {{company_name}} on MineCertificate as a {{role}}.\n\nClick the link below to accept:\n{{invitation_link}}\n\nThis invitation expires on {{expires_at}}.\n\nIf you did not expect this invitation, you can safely ignore this email.',
    '["inviter_name", "company_name", "role", "invitation_link", "expires_at"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- --------------------------------------------
-- 4.3 System message templates (WhatsApp)
-- --------------------------------------------

INSERT INTO public.message_templates (company_id, name, type, is_system, body, variables)
VALUES
  (
    NULL,
    'Certificate Delivery',
    'whatsapp',
    true,
    'Hi {{recipient_name}}! 🎓 Your {{course_name}} certificate is ready. Download here: {{download_url}}',
    '["recipient_name", "course_name", "download_url"]'::jsonb
  ),
  (
    NULL,
    'Verification Reminder',
    'whatsapp',
    true,
    'Hi {{recipient_name}}! You can verify your {{course_name}} certificate anytime at: {{verification_url}}',
    '["recipient_name", "course_name", "verification_url"]'::jsonb
  )
ON CONFLICT DO NOTHING;

-- --------------------------------------------
-- 4.4 Create company_settings for existing companies
-- --------------------------------------------

INSERT INTO public.company_settings (company_id)
SELECT id FROM public.companies
ON CONFLICT (company_id) DO NOTHING;

-- ============================================
-- SECTION 5: ROW LEVEL SECURITY (RLS)
-- ============================================

-- --------------------------------------------
-- 5.1 template_categories RLS
-- --------------------------------------------

ALTER TABLE public.template_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own and system categories" ON public.template_categories;
CREATE POLICY "Users can view own and system categories"
  ON public.template_categories FOR SELECT
  USING (
    company_id IS NULL -- system categories
    OR company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "Users can create own categories" ON public.template_categories;
CREATE POLICY "Users can create own categories"
  ON public.template_categories FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS "Users can update own categories" ON public.template_categories;
CREATE POLICY "Users can update own categories"
  ON public.template_categories FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS "Users can delete own categories" ON public.template_categories;
CREATE POLICY "Users can delete own categories"
  ON public.template_categories FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

-- --------------------------------------------
-- 5.2 user_invitations RLS
-- --------------------------------------------

ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company invitations" ON public.user_invitations;
CREATE POLICY "Users can view own company invitations"
  ON public.user_invitations FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can create invitations" ON public.user_invitations;
CREATE POLICY "Admins can create invitations"
  ON public.user_invitations FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND company_id = public.get_user_company_id()
      AND role = 'admin'
    )
  );

DROP POLICY IF EXISTS "Admins can update invitations" ON public.user_invitations;
CREATE POLICY "Admins can update invitations"
  ON public.user_invitations FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- --------------------------------------------
-- 5.3 import_data_rows RLS
-- --------------------------------------------

ALTER TABLE public.import_data_rows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company import data" ON public.import_data_rows;
CREATE POLICY "Users can view own company import data"
  ON public.import_data_rows FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can insert import data" ON public.import_data_rows;
CREATE POLICY "Users can insert import data"
  ON public.import_data_rows FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can update import data" ON public.import_data_rows;
CREATE POLICY "Users can update import data"
  ON public.import_data_rows FOR UPDATE
  USING (company_id = public.get_user_company_id());

-- --------------------------------------------
-- 5.4 certificate_deliveries RLS
-- --------------------------------------------

ALTER TABLE public.certificate_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company deliveries" ON public.certificate_deliveries;
CREATE POLICY "Users can view own company deliveries"
  ON public.certificate_deliveries FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "System can insert delivery records" ON public.certificate_deliveries;
CREATE POLICY "System can insert delivery records"
  ON public.certificate_deliveries FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- --------------------------------------------
-- 5.5 message_templates RLS
-- --------------------------------------------

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view system and own templates" ON public.message_templates;
CREATE POLICY "Users can view system and own templates"
  ON public.message_templates FOR SELECT
  USING (
    is_system = true
    OR company_id = public.get_user_company_id()
  );

DROP POLICY IF EXISTS "Users can create own templates" ON public.message_templates;
CREATE POLICY "Users can create own templates"
  ON public.message_templates FOR INSERT
  WITH CHECK (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS "Users can update own templates" ON public.message_templates;
CREATE POLICY "Users can update own templates"
  ON public.message_templates FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

DROP POLICY IF EXISTS "Users can delete own templates" ON public.message_templates;
CREATE POLICY "Users can delete own templates"
  ON public.message_templates FOR DELETE
  USING (
    company_id = public.get_user_company_id()
    AND is_system = false
  );

-- --------------------------------------------
-- 5.6 invoices RLS
-- --------------------------------------------

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company invoices" ON public.invoices;
CREATE POLICY "Users can view own company invoices"
  ON public.invoices FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "System can create invoices" ON public.invoices;
CREATE POLICY "System can create invoices"
  ON public.invoices FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "System can update invoices" ON public.invoices;
CREATE POLICY "System can update invoices"
  ON public.invoices FOR UPDATE
  USING (company_id = public.get_user_company_id());

-- --------------------------------------------
-- 5.7 invoice_line_items RLS
-- --------------------------------------------

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own invoice items" ON public.invoice_line_items;
CREATE POLICY "Users can view own invoice items"
  ON public.invoice_line_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.company_id = public.get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "System can insert line items" ON public.invoice_line_items;
CREATE POLICY "System can insert line items"
  ON public.invoice_line_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.company_id = public.get_user_company_id()
    )
  );

-- --------------------------------------------
-- 5.8 audit_logs RLS
-- --------------------------------------------

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company audit logs" ON public.audit_logs;
CREATE POLICY "Users can view own company audit logs"
  ON public.audit_logs FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    OR company_id IS NULL -- system-level logs visible to all
  );

DROP POLICY IF EXISTS "System can insert audit logs" ON public.audit_logs;
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true);

-- --------------------------------------------
-- 5.9 company_settings RLS
-- --------------------------------------------

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own company settings" ON public.company_settings;
CREATE POLICY "Users can view own company settings"
  ON public.company_settings FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Admins can update settings" ON public.company_settings;
CREATE POLICY "Admins can update settings"
  ON public.company_settings FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Verify migration success
DO $$
DECLARE
  table_count INTEGER;
  company_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'companies', 'users', 'templates', 'import_jobs', 'certificates', 'verification_logs',
    'template_categories', 'user_invitations', 'import_data_rows', 'certificate_deliveries',
    'message_templates', 'invoices', 'invoice_line_items', 'audit_logs', 'company_settings'
  );

  SELECT COUNT(*) INTO company_count FROM public.companies;

  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '   Tables: % / 15 expected', table_count;
  RAISE NOTICE '   Companies: % (production data preserved)', company_count;
END $$;
