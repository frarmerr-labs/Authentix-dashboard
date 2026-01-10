-- MineCertificate Storage Buckets Setup
-- Run this in your Supabase SQL Editor AFTER running setup.sql

-- ============================================
-- STORAGE BUCKETS
-- ============================================

-- Create templates bucket for certificate templates (PDF, images)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'templates',
  'templates',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Create certificates bucket for generated certificates
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'certificates',
  'certificates',
  true,
  10485760, -- 10MB limit
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Create imports bucket for Excel/CSV imports
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'imports',
  'imports',
  false,
  10485760, -- 10MB limit
  ARRAY['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/csv']
)
ON CONFLICT (id) DO NOTHING;

-- Create assets bucket for logos, signatures, stamps
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'assets',
  'assets',
  true,
  5242880, -- 5MB limit
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- STORAGE POLICIES
-- ============================================

-- Helper function to get user's company_id (should already exist from setup.sql)
-- If not, uncomment:
-- CREATE OR REPLACE FUNCTION public.get_user_company_id()
-- RETURNS UUID AS $$
--   SELECT company_id FROM public.users WHERE id = auth.uid()
-- $$ LANGUAGE SQL SECURITY DEFINER;

-- Templates bucket policies
CREATE POLICY "Users can view company templates"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'templates' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload company templates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'templates' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company templates"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'templates' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company templates"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'templates' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Certificates bucket policies (public read, authenticated write)
CREATE POLICY "Anyone can view certificates"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'certificates');

CREATE POLICY "Users can upload company certificates"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'certificates' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Imports bucket policies (private - only company can access)
CREATE POLICY "Users can view company imports"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'imports' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload company imports"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'imports' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- Assets bucket policies (logos, signatures, stamps)
CREATE POLICY "Users can view company assets"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can upload company assets"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can update company assets"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can delete company assets"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'assets' AND
    auth.uid() IS NOT NULL AND
    (storage.foldername(name))[1] IN (
      SELECT company_id::text FROM public.users WHERE id = auth.uid()
    )
  );

-- ============================================
-- COMPLETE!
-- ============================================
-- Storage buckets are ready to use!
