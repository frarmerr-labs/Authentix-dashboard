-- ============================================
-- POST-MIGRATION VERIFICATION QUERIES
-- Run these after FINAL_PRODUCTION_MIGRATION.sql
-- ============================================

-- ============================================
-- 1. TABLE EXISTENCE CHECK
-- ============================================

SELECT
  '✅ Table Check' AS test,
  tablename,
  'EXISTS' AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'companies', 'users', 'templates', 'import_jobs', 'certificates', 'verification_logs',
  'template_categories', 'user_invitations', 'import_data_rows', 'certificate_events',
  'email_templates', 'email_messages', 'whatsapp_templates', 'whatsapp_messages',
  'invoices', 'invoice_line_items', 'audit_logs', 'company_settings'
)
ORDER BY tablename;

-- Expected: 18 rows

-- ============================================
-- 2. PRODUCTION DATA PRESERVED
-- ============================================

SELECT
  '✅ Production Data' AS test,
  'companies' AS table_name,
  COUNT(*) AS row_count,
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END AS status
FROM companies
WHERE deleted_at IS NULL

UNION ALL

SELECT
  '✅ Production Data',
  'users',
  COUNT(*),
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM users
WHERE deleted_at IS NULL

UNION ALL

SELECT
  '✅ Production Data',
  'templates',
  COUNT(*),
  CASE WHEN COUNT(*) = 4 THEN 'PASS' ELSE 'FAIL' END
FROM templates
WHERE deleted_at IS NULL;

-- Expected: All PASS

-- ============================================
-- 3. NEW COLUMNS ADDED
-- ============================================

-- Companies new columns
SELECT
  '✅ New Columns' AS test,
  'companies.' || column_name AS column_path,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'companies'
AND column_name IN ('application_id', 'status', 'billing_plan', 'api_key_hash', 'deleted_at')
ORDER BY column_name;

-- Templates new columns
SELECT
  '✅ New Columns' AS test,
  'templates.' || column_name AS column_path,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'templates'
AND column_name IN ('fields', 'fields_schema_version', 'width', 'height', 'category_id', 'version', 'status', 'deleted_at')
ORDER BY column_name;

-- Certificates new columns
SELECT
  '✅ New Columns' AS test,
  'certificates.' || column_name AS column_path,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'certificates'
AND column_name IN ('verification_token', 'status', 'template_snapshot', 'recipient_snapshot', 'storage_path', 'public_url', 'qr_code_url', 'deleted_at')
ORDER BY column_name;

-- Expected: All columns present

-- ============================================
-- 4. SYSTEM DATA SEEDED
-- ============================================

SELECT
  '✅ System Data' AS test,
  'template_categories' AS table_name,
  COUNT(*) AS row_count,
  CASE WHEN COUNT(*) = 7 THEN 'PASS' ELSE 'FAIL' END AS status
FROM template_categories
WHERE is_system = true
  AND deleted_at IS NULL

UNION ALL

SELECT
  '✅ System Data',
  'email_templates',
  COUNT(*),
  CASE WHEN COUNT(*) = 3 THEN 'PASS' ELSE 'FAIL' END
FROM email_templates
WHERE is_system = true
  AND deleted_at IS NULL

UNION ALL

SELECT
  '✅ System Data',
  'whatsapp_templates',
  COUNT(*),
  CASE WHEN COUNT(*) >= 2 THEN 'PASS' ELSE 'FAIL' END
FROM whatsapp_templates
WHERE deleted_at IS NULL

UNION ALL

SELECT
  '✅ System Data',
  'company_settings',
  COUNT(*),
  CASE WHEN COUNT(*) = 1 THEN 'PASS' ELSE 'FAIL' END
FROM company_settings;

-- Expected: All PASS

-- ============================================
-- 5. RLS ENABLED CHECK
-- ============================================

SELECT
  '✅ RLS Enabled' AS test,
  tablename,
  CASE
    WHEN rowsecurity = true THEN 'ENABLED'
    ELSE 'DISABLED (FAIL)'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN (
  'companies', 'users', 'templates', 'import_jobs', 'certificates', 'verification_logs',
  'template_categories', 'user_invitations', 'import_data_rows', 'certificate_events',
  'email_templates', 'email_messages', 'whatsapp_templates', 'whatsapp_messages',
  'invoices', 'invoice_line_items', 'audit_logs', 'company_settings'
)
ORDER BY tablename;

-- Expected: All ENABLED

-- ============================================
-- 6. CONSTRAINTS CHECK
-- ============================================

-- Status enums
SELECT
  '✅ Constraints' AS test,
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  'EXISTS' AS status
FROM pg_constraint
WHERE contype = 'c'
AND conrelid::regclass::text IN (
  'companies', 'users', 'templates', 'import_jobs', 'certificates',
  'user_invitations', 'email_messages', 'whatsapp_templates', 'whatsapp_messages', 'invoices'
)
AND conname LIKE 'chk_%status'
ORDER BY conrelid::regclass::text, conname;

-- Expected: Multiple status constraints

-- Snapshot validation
SELECT
  '✅ Constraints' AS test,
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  'EXISTS' AS status
FROM pg_constraint
WHERE contype = 'c'
AND conrelid = 'certificates'::regclass
AND conname LIKE '%snapshot%'
ORDER BY conname;

-- Expected: template_snapshot and recipient_snapshot checks

-- ============================================
-- 7. INDEXES CHECK
-- ============================================

SELECT
  '✅ Indexes' AS test,
  indexname,
  tablename,
  'EXISTS' AS status
FROM pg_indexes
WHERE schemaname = 'public'
AND (
  indexname LIKE 'idx_certificates_%'
  OR indexname LIKE 'idx_email_messages_%'
  OR indexname LIKE 'idx_whatsapp_messages_%'
  OR indexname LIKE 'idx_certificate_events_%'
)
ORDER BY tablename, indexname;

-- Expected: Multiple critical indexes

-- ============================================
-- 8. FUNCTIONS CHECK
-- ============================================

SELECT
  '✅ Functions' AS test,
  proname AS function_name,
  'EXISTS' AS status
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
AND proname IN (
  'generate_api_key',
  'verify_api_key',
  'verify_certificate',
  'get_user_company_id',
  'increment_template_version',
  'create_company_settings',
  'update_certificate_expiry_status'
)
ORDER BY proname;

-- Expected: 7 functions

-- ============================================
-- 9. TRIGGERS CHECK
-- ============================================

SELECT
  '✅ Triggers' AS test,
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  'EXISTS' AS status
FROM pg_trigger
WHERE tgrelid::regclass::text IN (
  'companies', 'templates', 'certificates',
  'template_categories', 'email_templates', 'whatsapp_templates',
  'invoices', 'company_settings'
)
AND tgname NOT LIKE 'RI_%'
ORDER BY tgrelid::regclass::text, tgname;

-- Expected: Multiple triggers (updated_at, version, expiry, etc.)

-- ============================================
-- 10. POLICY COUNT BY TABLE
-- ============================================

SELECT
  '✅ RLS Policies' AS test,
  schemaname || '.' || tablename AS table_path,
  COUNT(*) AS policy_count,
  CASE
    WHEN COUNT(*) >= 1 THEN 'OK'
    ELSE 'NO POLICIES (WARNING)'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- Expected: All tables have policies

-- ============================================
-- 11. IMMUTABILITY CHECK
-- ============================================

-- Check that audit_logs and certificate_events cannot be updated/deleted
SELECT
  '✅ Immutability' AS test,
  relname AS table_name,
  CASE
    WHEN relacl::text !~ 'authenticated=.*[wd]' THEN 'IMMUTABLE'
    ELSE 'MUTABLE (FAIL)'
  END AS status
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
AND relname IN ('audit_logs', 'certificate_events')
AND relkind = 'r';

-- Expected: Both IMMUTABLE

-- ============================================
-- 12. SPECIFIC PRODUCTION DATA CHECK
-- ============================================

-- Verify Xencus company
SELECT
  '✅ Xencus Company' AS test,
  id,
  name,
  application_id,
  status,
  api_enabled,
  CASE
    WHEN deleted_at IS NULL THEN 'ACTIVE'
    ELSE 'DELETED (FAIL)'
  END AS status_check
FROM companies
WHERE id = 'e7261be4-fdc0-4299-8be6-0b5e8b842b43';

-- Expected: 1 row, ACTIVE

-- Verify templates have fields array
SELECT
  '✅ Templates Schema' AS test,
  id,
  name,
  jsonb_typeof(fields) AS fields_type,
  fields_schema_version,
  status,
  CASE
    WHEN jsonb_typeof(fields) = 'array' THEN 'VALID'
    ELSE 'INVALID (FAIL)'
  END AS validation
FROM templates
WHERE deleted_at IS NULL
ORDER BY created_at;

-- Expected: 4 rows, all VALID, fields_type = 'array'

-- ============================================
-- 13. SNAPSHOT PATTERN VALIDATION
-- ============================================

-- Check certificates table has snapshot columns
SELECT
  '✅ Snapshot Pattern' AS test,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN data_type = 'jsonb' THEN 'CORRECT'
    ELSE 'WRONG TYPE (FAIL)'
  END AS validation
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'certificates'
AND column_name IN ('template_snapshot', 'recipient_snapshot')
ORDER BY column_name;

-- Expected: 2 rows, both JSONB, CORRECT

-- ============================================
-- 14. WHATSAPP INTEGRATION READINESS
-- ============================================

-- Check company_settings has WhatsApp fields
SELECT
  '✅ WhatsApp Config' AS test,
  column_name,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'company_settings'
AND column_name IN ('whatsapp_business_account_id', 'whatsapp_phone_number_id', 'whatsapp_access_token')
ORDER BY column_name;

-- Expected: 3 columns

-- Check whatsapp_messages has Meta-specific fields
SELECT
  '✅ WhatsApp Messages' AS test,
  column_name,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'whatsapp_messages'
AND column_name IN ('meta_message_id', 'conversation_type', 'conversation_id', 'pricing_model', 'billable')
ORDER BY column_name;

-- Expected: 5 columns

-- ============================================
-- 15. EMAIL SYSTEM READINESS
-- ============================================

-- Check email_messages has lifecycle tracking
SELECT
  '✅ Email Lifecycle' AS test,
  column_name,
  data_type,
  'EXISTS' AS status
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'email_messages'
AND column_name IN ('queued', 'sent_at', 'delivered_at', 'opened_at', 'status')
ORDER BY column_name;

-- Expected: Status + timestamp columns

-- ============================================
-- SUMMARY REPORT
-- ============================================

DO $$
DECLARE
  total_tables INTEGER;
  total_policies INTEGER;
  total_functions INTEGER;
  total_triggers INTEGER;
  companies_count INTEGER;
  templates_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_tables
  FROM pg_tables
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';

  SELECT COUNT(*) INTO total_functions
  FROM pg_proc
  WHERE pronamespace = 'public'::regnamespace;

  SELECT COUNT(*) INTO total_triggers
  FROM pg_trigger
  WHERE tgrelid::regclass::text LIKE 'public.%'
  AND tgname NOT LIKE 'RI_%';

  SELECT COUNT(*) INTO companies_count
  FROM companies
  WHERE deleted_at IS NULL;

  SELECT COUNT(*) INTO templates_count
  FROM templates
  WHERE deleted_at IS NULL;

  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ MIGRATION VERIFICATION SUMMARY';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Database Objects:';
  RAISE NOTICE '  Total Tables:    %', total_tables;
  RAISE NOTICE '  RLS Policies:    %', total_policies;
  RAISE NOTICE '  Functions:       %', total_functions;
  RAISE NOTICE '  Triggers:        %', total_triggers;
  RAISE NOTICE '';
  RAISE NOTICE '📦 Production Data:';
  RAISE NOTICE '  Companies:       % (Expected: 1)', companies_count;
  RAISE NOTICE '  Templates:       % (Expected: 4)', templates_count;
  RAISE NOTICE '';
  RAISE NOTICE '✅ If all checks pass above, migration was SUCCESSFUL!';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  1. Login to app: info@xencus.com';
  RAISE NOTICE '  2. Navigate to dashboard';
  RAISE NOTICE '  3. Verify templates page loads';
  RAISE NOTICE '  4. Configure WhatsApp Business API credentials in company settings';
  RAISE NOTICE '  5. Update frontend to create template_snapshot when issuing certificates';
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
END $$;
