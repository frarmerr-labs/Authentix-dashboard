-- ============================================
-- ADD SIGNUP TRIGGER FOR USER/COMPANY CREATION
-- Run this migration in Supabase SQL Editor
-- ============================================

-- Function to create company and user on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
  generated_application_id TEXT;
  company_env TEXT := 'test'; -- Default environment for new signups
BEGIN
  -- Generate unique application_id
  -- Format: xen_<env>_<random_hex> (20 chars total for random part)
  -- Using md5 hash of uuid + timestamp for uniqueness
  generated_application_id := 'xen_' || company_env || '_' || 
    substring(md5(gen_random_uuid()::text || clock_timestamp()::text || random()::text), 1, 20);

  -- Create company with required fields: name, email, application_id, environment
  INSERT INTO public.companies (name, email, application_id, environment)
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(NEW.email, '@', 2)),
    NEW.email,
    generated_application_id,
    company_env
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

-- Verify trigger was created
SELECT
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
