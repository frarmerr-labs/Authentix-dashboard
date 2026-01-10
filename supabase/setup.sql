-- MineCertificate Database Setup
-- Run this entire file in your Supabase SQL Editor (after dropping old tables if needed)

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLES
-- ============================================

-- Companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- 10-character alphanumeric application/organization id used for storage folder names
  app_id TEXT NOT NULL UNIQUE DEFAULT substring(md5((random()::text || clock_timestamp()::text)), 1, 10),
  name TEXT NOT NULL,
  logo TEXT,
  email TEXT,
  phone TEXT,
  website TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  billing_address TEXT,
  billing_city TEXT,
  billing_state TEXT,
  billing_country TEXT,
  billing_postal_code TEXT,
  gst_number TEXT,
  cin_number TEXT,
  tax_id TEXT,
  gst_document_url TEXT,
  cin_document_url TEXT,
  industry TEXT,
  company_size TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member', 'super_admin')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Templates table
CREATE TABLE IF NOT EXISTS public.templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  course_name TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'image')),
  preview_url TEXT,
  storage_path TEXT NOT NULL,
  fields JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN DEFAULT true,
  certificate_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Import jobs table
CREATE TABLE IF NOT EXISTS public.import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
  file_name TEXT NOT NULL,
  file_storage_path TEXT NOT NULL,
  mapping JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'processing', 'completed', 'failed', 'cancelled')),
  total_rows INT DEFAULT 0,
  processed_rows INT DEFAULT 0,
  succeeded_rows INT DEFAULT 0,
  failed_rows INT DEFAULT 0,
  errors JSONB DEFAULT '[]',
  uploaded_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Certificates table
CREATE TABLE IF NOT EXISTS public.certificates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE RESTRICT,
  import_job_id UUID REFERENCES public.import_jobs(id) ON DELETE SET NULL,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  course_name TEXT NOT NULL,
  course_date DATE NOT NULL,
  custom_fields JSONB DEFAULT '{}',
  verification_token TEXT NOT NULL UNIQUE,
  revoked BOOLEAN DEFAULT false,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES public.users(id),
  revoke_reason TEXT,
  storage_path TEXT NOT NULL,
  pdf_url TEXT,
  qr_url TEXT,
  verification_count INT DEFAULT 0,
  last_verified_at TIMESTAMPTZ,
  issued_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Verification logs table
CREATE TABLE IF NOT EXISTS public.verification_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  certificate_id UUID NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('valid', 'revoked', 'not_found', 'invalid_token')),
  ip_address INET,
  user_agent TEXT,
  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDICES for Performance
-- ============================================

-- Companies
CREATE INDEX IF NOT EXISTS idx_companies_name ON public.companies(name);

-- Users
CREATE INDEX IF NOT EXISTS idx_users_company_id ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- Templates
CREATE INDEX IF NOT EXISTS idx_templates_company_id ON public.templates(company_id);
CREATE INDEX IF NOT EXISTS idx_templates_active ON public.templates(company_id, active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_templates_course_name ON public.templates(company_id, course_name);

-- Import jobs
CREATE INDEX IF NOT EXISTS idx_import_jobs_company_id ON public.import_jobs(company_id);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(status) WHERE status IN ('queued', 'processing');
CREATE INDEX IF NOT EXISTS idx_import_jobs_created_at ON public.import_jobs(created_at DESC);

-- Certificates
CREATE INDEX IF NOT EXISTS idx_certificates_company_id ON public.certificates(company_id);
CREATE INDEX IF NOT EXISTS idx_certificates_verification_token ON public.certificates(verification_token);
CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON public.certificates(company_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_certificates_recipient_email ON public.certificates(company_id, recipient_email);
CREATE INDEX IF NOT EXISTS idx_certificates_course_name ON public.certificates(company_id, course_name);
CREATE INDEX IF NOT EXISTS idx_certificates_revoked ON public.certificates(company_id, revoked);

-- Verification logs
CREATE INDEX IF NOT EXISTS idx_verification_logs_certificate_id ON public.verification_logs(certificate_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_company_id ON public.verification_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_verification_logs_verified_at ON public.verification_logs(verified_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verification_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER;

-- Companies policies
CREATE POLICY "Users can view own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id());

-- Users policies
CREATE POLICY "Users can view company users"
  ON public.users FOR SELECT
  USING (company_id = public.get_user_company_id());

-- Templates policies
CREATE POLICY "Users can view company templates"
  ON public.templates FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert company templates"
  ON public.templates FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update company templates"
  ON public.templates FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can delete company templates"
  ON public.templates FOR DELETE
  USING (company_id = public.get_user_company_id());

-- Import jobs policies
CREATE POLICY "Users can view company import jobs"
  ON public.import_jobs FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert import jobs"
  ON public.import_jobs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- Certificates policies
CREATE POLICY "Users can view company certificates"
  ON public.certificates FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can update company certificates"
  ON public.certificates FOR UPDATE
  USING (company_id = public.get_user_company_id());

-- Verification logs policies (allow public inserts for verification)
CREATE POLICY "Anyone can insert verification logs"
  ON public.verification_logs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can view company verification logs"
  ON public.verification_logs FOR SELECT
  USING (company_id = public.get_user_company_id());

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_templates_updated_at BEFORE UPDATE ON public.templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certificates_updated_at BEFORE UPDATE ON public.certificates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create company and user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Create company with auto-generated app_id and basic info
  INSERT INTO public.companies (name, email)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 2)),
    NEW.email
  )
  RETURNING id INTO new_company_id;

  -- Create user as admin in that company
  INSERT INTO public.users (id, company_id, email, full_name, role)
  VALUES (
    NEW.id,
    new_company_id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    'admin'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create company and user on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================
-- Uncomment the following to add sample data

/*
-- Insert sample company (only if not exists)
INSERT INTO public.companies (id, name)
VALUES ('00000000-0000-0000-0000-000000000001', 'Demo Company')
ON CONFLICT DO NOTHING;

-- Insert sample template
INSERT INTO public.templates (company_id, name, storage_path, fields, active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Certificate of Completion',
  'templates/demo.html',
  '[
    {"name": "recipient_name", "label": "Full Name", "required": true, "type": "text"},
    {"name": "course_name", "label": "Course Name", "required": true, "type": "text"},
    {"name": "course_date", "label": "Completion Date", "required": true, "type": "date"},
    {"name": "recipient_email", "label": "Email", "required": false, "type": "email"}
  ]'::jsonb,
  true
)
ON CONFLICT DO NOTHING;
*/

-- ============================================
-- COMPLETE!
-- ============================================
-- Database schema is ready to use!
