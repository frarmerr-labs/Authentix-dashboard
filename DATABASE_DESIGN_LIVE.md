# MineCertificate Database Design (Live + Repo-derived Controls)

**Generated at:** 2026-01-09T06:40:17.821Z
**Live schema source:** PostgREST OpenAPI (fetched 2026-01-09T06:40:17.821Z)
**Live row counts:** fetched 2026-01-09T06:40:17.821Z
**Live storage inspection:** fetched 2026-01-09T06:40:17.821Z

## Sources & limits
- Tables/columns/PK/FK are fetched live from Supabase PostgREST OpenAPI schema cache (service role).
- Row counts and storage metadata are fetched live using `@supabase/supabase-js` (service role).
- RLS policies, indexes, and internal function inventory are extracted from repo SQL files (may drift from production if DB was changed manually).

## Production verification SQL (run in Supabase SQL editor)

PostgREST OpenAPI does not expose RLS policies or index definitions. Use these queries to verify the *actual* production state:

```sql
-- RLS enablement (all public tables)
SELECT
  c.relname AS table_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
ORDER BY c.relname;

-- RLS policies (public schema)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Indexes (public schema)
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Functions (public schema)
SELECT
  n.nspname AS schema,
  p.proname AS name,
  pg_get_function_identity_arguments(p.oid) AS args,
  pg_get_function_result(p.oid) AS returns,
  p.prosecdef AS security_definer
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
ORDER BY name;
```

## Table Inventory (live)
**Total tables:** 21

- **Auditing:** `audit_logs`
- **Billing:** `billing_profiles`, `invoice_line_items`, `invoices`, `razorpay_events`, `razorpay_refunds`
- **Certificates:** `certificate_events`, `certificates`, `verification_logs`
- **Imports:** `import_data_rows`, `import_jobs`
- **Messaging:** `email_messages`, `email_templates`, `whatsapp_messages`, `whatsapp_templates`
- **Templates:** `certificate_categories`, `certificate_templates`
- **Tenancy:** `companies`, `company_settings`, `user_invitations`, `users`

## Relationships (live foreign keys)

| from_table.column | → | to_table.column |
|---|---|---|
| `audit_logs.company_id` | → | `companies.id` |
| `audit_logs.user_id` | → | `users.id` |
| `billing_profiles.company_id` | → | `companies.id` |
| `certificate_categories.company_id` | → | `companies.id` |
| `certificate_events.actor_id` | → | `users.id` |
| `certificate_events.certificate_id` | → | `certificates.id` |
| `certificate_events.company_id` | → | `companies.id` |
| `certificate_templates.certificate_category_id` | → | `certificate_categories.id` |
| `certificate_templates.certificate_subcategory_id` | → | `certificate_categories.id` |
| `certificate_templates.company_id` | → | `companies.id` |
| `certificate_templates.created_by` | → | `users.id` |
| `certificates.certificate_template_id` | → | `certificate_templates.id` |
| `certificates.company_id` | → | `companies.id` |
| `certificates.invoice_id` | → | `invoices.id` |
| `certificates.issued_by` | → | `users.id` |
| `certificates.revoked_by` | → | `users.id` |
| `company_settings.company_id` | → | `companies.id` |
| `email_messages.certificate_id` | → | `certificates.id` |
| `email_messages.company_id` | → | `companies.id` |
| `email_messages.email_template_id` | → | `email_templates.id` |
| `email_templates.company_id` | → | `companies.id` |
| `import_data_rows.company_id` | → | `companies.id` |
| `import_data_rows.deleted_by` | → | `users.id` |
| `import_data_rows.import_job_id` | → | `import_jobs.id` |
| `import_jobs.certificate_category_id` | → | `certificate_categories.id` |
| `import_jobs.certificate_subcategory_id` | → | `certificate_categories.id` |
| `import_jobs.company_id` | → | `companies.id` |
| `import_jobs.created_by` | → | `users.id` |
| `invoice_line_items.certificate_id` | → | `certificates.id` |
| `invoice_line_items.invoice_id` | → | `invoices.id` |
| `invoices.company_id` | → | `companies.id` |
| `razorpay_events.company_id` | → | `companies.id` |
| `razorpay_refunds.company_id` | → | `companies.id` |
| `user_invitations.company_id` | → | `companies.id` |
| `user_invitations.invited_by` | → | `users.id` |
| `users.company_id` | → | `companies.id` |
| `users.invited_by` | → | `users.id` |
| `verification_logs.certificate_id` | → | `certificates.id` |
| `verification_logs.company_id` | → | `companies.id` |
| `whatsapp_messages.certificate_id` | → | `certificates.id` |
| `whatsapp_messages.company_id` | → | `companies.id` |
| `whatsapp_messages.whatsapp_template_id` | → | `whatsapp_templates.id` |
| `whatsapp_templates.company_id` | → | `companies.id` |

---

## Table: `audit_logs`

- **Domain:** Auditing
- **Purpose:** Append-only audit log for sensitive actions.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `user_id` → `users.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `user_id` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `event_type` | `text` | yes |  | string |
| `entity_type` | `text` | no |  | string |
| `entity_id` | `uuid` | no |  | UUID string |
| `metadata` | `jsonb` | no |  | JSON object/array |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `action` | `text` | no |  | string |
| `old_values` | `jsonb` | no |  | JSON object/array |
| `new_values` | `jsonb` | no |  | JSON object/array |
| `ip_address` | `inet` | no |  | IP address |
| `user_agent` | `text` | no |  | string |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can insert audit logs` — INSERT — WITH CHECK (true) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view audit logs` — SELECT — USING (company_id = public.get_user_company_id() OR company_id IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_audit_logs_company`: CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON public.audit_logs(company_id, created_at DESC) WHERE company_id IS NOT NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_audit_logs_company_created`: CREATE INDEX IF NOT EXISTS idx_audit_logs_company_created ON public.audit_logs(company_id, created_at DESC) WHERE company_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_audit_logs_created`: CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_audit_logs_created_at`: CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_audit_logs_entity`: CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC) WHERE entity_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_audit_logs_user`: CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON public.audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `billing_profiles`

- **Domain:** Billing
- **Purpose:** Per-company pricing + tax profile used when generating invoices.
- **Row count (live):** 1
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `platform_fee_amount` | `numeric` | yes | `1000` | decimal number |
| `certificate_unit_price` | `numeric` | yes | `10` | decimal number |
| `currency` | `text` | yes | `INR` | string |
| `gst_rate` | `numeric` | yes | `18` | decimal number |
| `billing_cycle` | `text` | yes | `monthly` | string |
| `razorpay_customer_id` | `text` | no |  | string |
| `billing_address` | `jsonb` | no |  | JSON object/array |
| `auto_pay_enabled` | `boolean` | no | `false` | true/false |
| `effective_from` | `date` | yes | `CURRENT_DATE` | ISO date (YYYY-MM-DD) |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** unknown (not detected in parsed repo migrations)
- **Policies:** not found in parsed repo migrations (verify in Supabase)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:** none found for this table

---

## Table: `certificate_categories`

- **Domain:** Templates
- **Purpose:** Category/subcategory taxonomy for certificate templates (system-wide and/or company-specific).
- **Row count (live):** 50
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`
- **Referenced by (incoming):** `certificate_templates.certificate_category_id`, `certificate_templates.certificate_subcategory_id`, `import_jobs.certificate_category_id`, `import_jobs.certificate_subcategory_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | no |  | Note: This is a Foreign Key to `companies.id`. |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `industry` | `text` | no |  | string |
| `certificate_category` | `text` | yes |  | string |
| `certificate_subcategory` | `text` | yes |  | string |

### RLS
- **Enabled:** unknown (not detected in parsed repo migrations)
- **Policies:** not found in parsed repo migrations (verify in Supabase)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:** none found for this table

---

## Table: `certificate_events`

- **Domain:** Certificates
- **Purpose:** Append-only timeline of certificate lifecycle events.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `certificate_id` → `certificates.id`, `company_id` → `companies.id`, `actor_id` → `users.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `certificate_id` | `uuid` | yes |  | Note: This is a Foreign Key to `certificates.id`. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `event_type` | `text` | yes |  | string |
| `actor_type` | `text` | yes |  | string |
| `actor_id` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `metadata` | `jsonb` | no |  | JSON object/array |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can insert events` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company events` — SELECT — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_certificate_events_actor`: CREATE INDEX IF NOT EXISTS idx_certificate_events_actor ON public.certificate_events(actor_id, created_at DESC) WHERE actor_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificate_events_cert`: CREATE INDEX IF NOT EXISTS idx_certificate_events_cert ON public.certificate_events(certificate_id, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificate_events_certificate`: CREATE INDEX IF NOT EXISTS idx_certificate_events_certificate ON public.certificate_events(certificate_id, created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificate_events_company`: CREATE INDEX IF NOT EXISTS idx_certificate_events_company ON public.certificate_events(company_id, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificate_events_created_at`: CREATE INDEX IF NOT EXISTS idx_certificate_events_created_at ON public.certificate_events(created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificate_events_event_type`: CREATE INDEX IF NOT EXISTS idx_certificate_events_event_type ON public.certificate_events(event_type, created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificate_events_time`: CREATE INDEX IF NOT EXISTS idx_certificate_events_time ON public.certificate_events(created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificate_events_type`: CREATE INDEX IF NOT EXISTS idx_certificate_events_type ON public.certificate_events(event_type, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `certificate_templates`

- **Domain:** Templates
- **Purpose:** Uploadable certificate template assets + field layout JSON used by issuance/generation.
- **Row count (live):** 7
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `created_by` → `users.id`, `certificate_category_id` → `certificate_categories.id`, `certificate_subcategory_id` → `certificate_categories.id`
- **Referenced by (incoming):** `certificates.certificate_template_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `name` | `text` | yes |  | string |
| `course_name` | `text` | no |  | string |
| `file_type` | `text` | yes |  | string |
| `storage_path` | `text` | yes |  | string |
| `preview_url` | `text` | no |  | string |
| `description` | `text` | no |  | string |
| `created_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `fields` | `jsonb` | no |  | JSONB array of field configs (x, y, fontSize, fontFamily, color, etc.) |
| `fields_schema_version` | `integer` | no | `1` | Schema version for fields array (enables future migrations) |
| `width` | `integer` | no |  | integer |
| `height` | `integer` | no |  | integer |
| `certificate_category_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificate_categories.id`. |
| `version` | `integer` | no | `1` | integer |
| `status` | `text` | no | `active` | Template status: draft (editing), active (usable), archived (hidden) |
| `usage_count` | `integer` | no | `0` | integer |
| `last_used_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `certificate_subcategory_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificate_categories.id`. |
| `certificate_category` | `text` | no |  | Snapshot of certificate category at template creation time |
| `certificate_subcategory` | `text` | no |  | Snapshot of certificate subcategory at template creation time (optional) |
| `industry` | `text` | no |  | Industry snapshot (e.g. edtech) copied from company at creation time |

### RLS
- **Enabled:** unknown (not detected in parsed repo migrations)
- **Policies:** not found in parsed repo migrations (verify in Supabase)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:** none found for this table

---

## Table: `certificates`

- **Domain:** Certificates
- **Purpose:** Issued certificates + snapshots + verification identifiers.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `certificate_template_id` → `certificate_templates.id`, `issued_by` → `users.id`, `invoice_id` → `invoices.id`, `revoked_by` → `users.id`
- **Referenced by (incoming):** `certificate_events.certificate_id`, `email_messages.certificate_id`, `invoice_line_items.certificate_id`, `verification_logs.certificate_id`, `whatsapp_messages.certificate_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `certificate_template_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificate_templates.id`. |
| `recipient_name` | `text` | yes |  | string |
| `recipient_email` | `text` | no |  | string |
| `course_name` | `text` | no |  | string |
| `issue_date` | `date` | yes | `CURRENT_DATE` | ISO date (YYYY-MM-DD) |
| `expiry_date` | `date` | no |  | ISO date (YYYY-MM-DD) |
| `certificate_number` | `text` | yes |  | string |
| `storage_path` | `text` | yes |  | string |
| `preview_url` | `text` | no |  | string |
| `verification_code` | `text` | yes |  | string |
| `status` | `text` | yes | `issued` | Certificate status: issued (valid), revoked (invalidated), expired (past expiry_date) |
| `issued_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `import_job_id` | `uuid` | no |  | UUID string |
| `course_date` | `date` | no |  | ISO date (YYYY-MM-DD) |
| `custom_fields` | `jsonb` | no |  | JSON object/array |
| `verification_count` | `integer` | no | `0` | integer |
| `last_verified_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `pdf_url` | `text` | no |  | string |
| `qr_url` | `text` | no |  | string |
| `revoke_reason` | `text` | no |  | string |
| `verification_token` | `text` | no |  | Unique token for public verification (embedded in QR code) |
| `template_snapshot` | `jsonb` | no |  | Frozen snapshot of template at issue time (fields, dimensions, etc.) |
| `recipient_snapshot` | `jsonb` | no |  | Frozen snapshot of recipient data at issue time |
| `public_url` | `text` | no |  | string |
| `qr_code_url` | `text` | no |  | string |
| `invoice_id` | `uuid` | no |  | Note: This is a Foreign Key to `invoices.id`. |
| `issued_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `revoked_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `revoked_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `revocation_reason` | `text` | no |  | string |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `certificate_category_snapshot` | `jsonb` | no |  | JSON object/array |
| `certificate_subcategory_snapshot` | `jsonb` | no |  | JSON object/array |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Users can insert certificates` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can update certificates` — UPDATE — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company certificates` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_certificates_active`: CREATE INDEX IF NOT EXISTS idx_certificates_active ON public.certificates(company_id, issued_at DESC) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_company_id`: CREATE INDEX IF NOT EXISTS idx_certificates_company_id ON public.certificates(company_id, created_at DESC) WHERE deleted_at IS NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificates_deleted_at`: CREATE INDEX IF NOT EXISTS idx_certificates_deleted_at ON public.certificates(deleted_at) WHERE deleted_at IS NOT NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificates_expiry`: CREATE INDEX IF NOT EXISTS idx_certificates_expiry ON public.certificates(expiry_date) WHERE expiry_date IS NOT NULL AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_issued_at`: CREATE INDEX IF NOT EXISTS idx_certificates_issued_at ON public.certificates(issued_at DESC) WHERE deleted_at IS NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_certificates_recipient_email`: CREATE INDEX IF NOT EXISTS idx_certificates_recipient_email ON public.certificates(recipient_email) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_status`: CREATE INDEX IF NOT EXISTS idx_certificates_status ON public.certificates(company_id, status, issued_at DESC) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_unbilled`: CREATE INDEX IF NOT EXISTS idx_certificates_unbilled ON public.certificates(company_id, issued_at DESC) WHERE invoice_id IS NULL AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_verification_token` (unique): CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token ON public.certificates(verification_token) WHERE verification_token IS NOT NULL AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_certificates_verification_token_unique` (unique): CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_verification_token_unique ON public.certificates(verification_token) WHERE verification_token IS NOT NULL AND deleted_at IS NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)

---

## Table: `companies`

- **Domain:** Tenancy
- **Purpose:** Tenant root record (account/company). Holds application_id and API key metadata.
- **Row count (live):** 4
- **Primary key:** `id`
- **Referenced by (incoming):** `audit_logs.company_id`, `billing_profiles.company_id`, `certificate_categories.company_id`, `certificate_events.company_id`, `certificate_templates.company_id`, `certificates.company_id`, `company_settings.company_id`, `email_messages.company_id`, `email_templates.company_id`, `import_data_rows.company_id`, `import_jobs.company_id`, `invoices.company_id`, `razorpay_events.company_id`, `razorpay_refunds.company_id`, `user_invitations.company_id`, `users.company_id`, `verification_logs.company_id`, `whatsapp_messages.company_id`, `whatsapp_templates.company_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `name` | `text` | yes |  | string |
| `logo` | `text` | no |  | string |
| `email` | `text` | no |  | string |
| `phone` | `text` | no |  | string |
| `website` | `text` | no |  | string |
| `address` | `text` | no |  | string |
| `city` | `text` | no |  | string |
| `state` | `text` | no |  | string |
| `country` | `text` | no |  | string |
| `postal_code` | `text` | no |  | string |
| `billing_address` | `text` | no |  | string |
| `billing_city` | `text` | no |  | string |
| `billing_state` | `text` | no |  | string |
| `billing_country` | `text` | no |  | string |
| `billing_postal_code` | `text` | no |  | string |
| `gst_number` | `text` | no |  | string |
| `cin_number` | `text` | no |  | string |
| `tax_id` | `text` | no |  | string |
| `gst_document_url` | `text` | no |  | string |
| `cin_document_url` | `text` | no |  | string |
| `industry` | `text` | no |  | string |
| `company_size` | `text` | no |  | string |
| `timezone` | `text` | no | `UTC` | string |
| `last_active_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `application_id` | `text` | yes |  | Immutable company identifier (format: xen__). Used for API auth and storage paths. |
| `status` | `text` | no | `active` | Company account status: active, suspended, closed |
| `billing_plan` | `text` | no |  | string |
| `api_key_hash` | `text` | no |  | Bcrypt hash of API key (NEVER store plaintext) |
| `api_enabled` | `boolean` | no | `false` | true/false |
| `api_key_created_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `api_key_last_rotated_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `currency` | `text` | no | `INR` | string |
| `deleted_at` | `timestamp with time zone` | no |  | Soft delete timestamp (NULL = active) |
| `environment` | `text` | yes | `test` | Logical environment: dev (local), test (staging), beta (pre-prod), prod (production). Used for safety guards, not tenant isolation. |
| `business_type` | `text` | no |  | Primary business domain of the company. Used to filter certificate categories and subcategories. |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Admins can update own company` — UPDATE — USING (id = public.get_user_company_id() AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view own company` — SELECT — USING (id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_companies_active`: CREATE INDEX IF NOT EXISTS idx_companies_active ON public.companies(id) WHERE deleted_at IS NULL AND status = 'active'; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_companies_api_enabled`: CREATE INDEX IF NOT EXISTS idx_companies_api_enabled ON public.companies(api_enabled) WHERE api_enabled = true AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_companies_application_id` (unique): CREATE UNIQUE INDEX IF NOT EXISTS idx_companies_application_id ON public.companies(application_id); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_companies_deleted_at`: CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON public.companies(deleted_at) WHERE deleted_at IS NOT NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_companies_env_status`: CREATE INDEX IF NOT EXISTS idx_companies_env_status ON public.companies(environment, status) WHERE deleted_at IS NULL; (source: `supabase/05_ENVIRONMENT_TRACKING.sql`)
  - `idx_companies_environment`: CREATE INDEX IF NOT EXISTS idx_companies_environment ON public.companies(environment) WHERE deleted_at IS NULL; (source: `supabase/05_ENVIRONMENT_TRACKING.sql`)
  - `idx_companies_status`: CREATE INDEX IF NOT EXISTS idx_companies_status ON public.companies(status) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `company_settings`

- **Domain:** Tenancy
- **Purpose:** Per-company feature toggles + messaging configuration (email/whatsapp).
- **Row count (live):** 4
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `email_delivery_enabled` | `boolean` | no | `true` | true/false |
| `whatsapp_delivery_enabled` | `boolean` | no | `false` | true/false |
| `api_access_enabled` | `boolean` | no | `false` | true/false |
| `email_from_name` | `text` | no |  | string |
| `email_from_address` | `text` | no |  | string |
| `email_reply_to` | `text` | no |  | string |
| `whatsapp_business_account_id` | `text` | no |  | Meta Business Account ID |
| `whatsapp_phone_number_id` | `text` | no |  | Meta Phone Number ID (used in API calls) |
| `whatsapp_access_token` | `text` | no |  | Meta access token (encrypted, long-lived) |
| `logo_url` | `text` | no |  | string |
| `primary_color` | `text` | no | `#ff5400` | string |
| `max_certificates_per_batch` | `integer` | no | `50` | integer |
| `max_import_rows` | `integer` | no | `10000` | integer |
| `branding` | `jsonb` | no |  | JSON object/array |
| `limits` | `jsonb` | no |  | JSON object/array |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Admins can update settings` — UPDATE — USING (company_id = public.get_user_company_id() AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view settings` — SELECT — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_company_settings_company`: CREATE INDEX IF NOT EXISTS idx_company_settings_company ON public.company_settings(company_id); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `email_messages`

- **Domain:** Messaging
- **Purpose:** Outbound email send log with frozen subject/body and delivery status.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `certificate_id` → `certificates.id`, `email_template_id` → `email_templates.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `certificate_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificates.id`. |
| `email_template_id` | `uuid` | no |  | Note: This is a Foreign Key to `email_templates.id`. |
| `recipient_email` | `text` | yes |  | string |
| `subject_snapshot` | `text` | yes |  | Frozen email subject at send time |
| `body_snapshot` | `text` | yes |  | Frozen email body at send time (for audit/legal) |
| `provider` | `text` | no |  | string |
| `provider_message_id` | `text` | no |  | string |
| `status` | `text` | yes | `queued` | string |
| `failure_reason` | `text` | no |  | string |
| `sent_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `delivered_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `opened_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can insert emails` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company emails` — SELECT — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_email_messages_certificate`: CREATE INDEX IF NOT EXISTS idx_email_messages_certificate ON public.email_messages(certificate_id) WHERE certificate_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_messages_company`: CREATE INDEX IF NOT EXISTS idx_email_messages_company ON public.email_messages(company_id, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_messages_company_time`: CREATE INDEX IF NOT EXISTS idx_email_messages_company_time ON public.email_messages(company_id, created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_email_messages_pending`: CREATE INDEX IF NOT EXISTS idx_email_messages_pending ON public.email_messages(created_at) WHERE status IN ('queued', 'sent'); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_messages_provider_id`: CREATE INDEX IF NOT EXISTS idx_email_messages_provider_id ON public.email_messages(provider_message_id) WHERE provider_message_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_messages_recipient`: CREATE INDEX IF NOT EXISTS idx_email_messages_recipient ON public.email_messages(recipient_email, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_messages_status`: CREATE INDEX IF NOT EXISTS idx_email_messages_status ON public.email_messages(status, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `email_templates`

- **Domain:** Messaging
- **Purpose:** Email template definitions (subject/body/variables).
- **Row count (live):** 3
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`
- **Referenced by (incoming):** `email_messages.email_template_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | no |  | Note: This is a Foreign Key to `companies.id`. |
| `name` | `text` | yes |  | string |
| `subject` | `text` | yes |  | string |
| `body` | `text` | yes |  | string |
| `variables` | `jsonb` | no |  | JSON object/array |
| `is_system` | `boolean` | no | `false` | true/false |
| `active` | `boolean` | no | `true` | true/false |
| `version` | `integer` | no | `1` | integer |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Users can create email templates` — INSERT — WITH CHECK (company_id = public.get_user_company_id() AND is_system = false) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can delete email templates` — DELETE — USING (company_id = public.get_user_company_id() AND is_system = false AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can update email templates` — UPDATE — USING (company_id = public.get_user_company_id() AND is_system = false AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view email templates` — SELECT — USING ((is_system = true AND active = true) OR (company_id = public.get_user_company_id() AND deleted_at IS NULL)) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_email_templates_company`: CREATE INDEX IF NOT EXISTS idx_email_templates_company ON public.email_templates(company_id) WHERE active = true AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_templates_system`: CREATE INDEX IF NOT EXISTS idx_email_templates_system ON public.email_templates(is_system) WHERE is_system = true AND active = true AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_email_templates_unique_name` (unique): CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_unique_name ON public.email_templates(COALESCE(company_id::text, 'NULL'), name) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `import_data_rows`

- **Domain:** Imports
- **Purpose:** Optional persisted import rows (JSON per row) linked to import_jobs.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `import_job_id` → `import_jobs.id`, `company_id` → `companies.id`, `deleted_by` → `users.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `import_job_id` | `uuid` | yes |  | Note: This is a Foreign Key to `import_jobs.id`. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `row_number` | `integer` | yes |  | integer |
| `data` | `jsonb` | yes |  | JSON object/array |
| `is_deleted` | `boolean` | no | `false` | true/false |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `deleted_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Users can insert import data` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can update import data` — UPDATE — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view import data` — SELECT — USING (company_id = public.get_user_company_id() AND is_deleted = false) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_import_data_rows_company`: CREATE INDEX IF NOT EXISTS idx_import_data_rows_company ON public.import_data_rows(company_id) WHERE is_deleted = false; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_import_data_rows_data_gin`: CREATE INDEX IF NOT EXISTS idx_import_data_rows_data_gin ON public.import_data_rows USING GIN (data); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_import_data_rows_job`: CREATE INDEX IF NOT EXISTS idx_import_data_rows_job ON public.import_data_rows(import_job_id) WHERE is_deleted = false; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `import_jobs`

- **Domain:** Imports
- **Purpose:** Bulk import job metadata (file path, processing status, counts).
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `created_by` → `users.id`, `certificate_category_id` → `certificate_categories.id`, `certificate_subcategory_id` → `certificate_categories.id`
- **Referenced by (incoming):** `import_data_rows.import_job_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `created_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `file_name` | `text` | no |  | string |
| `storage_path` | `text` | yes |  | string |
| `status` | `text` | yes | `pending` | string |
| `total_rows` | `integer` | no | `0` | integer |
| `success_count` | `integer` | no | `0` | integer |
| `failure_count` | `integer` | no | `0` | integer |
| `error_message` | `text` | no |  | string |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `template_id` | `uuid` | no |  | UUID string |
| `file_storage_path` | `text` | no |  | string |
| `mapping` | `jsonb` | no |  | JSON object/array |
| `processed_rows` | `integer` | no | `0` | integer |
| `succeeded_rows` | `integer` | no | `0` | integer |
| `failed_rows` | `integer` | no | `0` | integer |
| `errors` | `jsonb` | no |  | JSON object/array |
| `uploaded_by` | `uuid` | no |  | UUID string |
| `started_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `completed_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `source_type` | `text` | no | `csv` | Import source: csv, excel, api |
| `data_persisted` | `boolean` | no | `false` | True if rows stored in import_data_rows table |
| `reusable` | `boolean` | no | `true` | true/false |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `certificate_category_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificate_categories.id`. |
| `certificate_subcategory_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificate_categories.id`. |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Users can insert imports` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can update imports` — UPDATE — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company imports` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_import_jobs_active`: CREATE INDEX IF NOT EXISTS idx_import_jobs_active ON public.import_jobs(company_id, created_at DESC) WHERE deleted_at IS NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_import_jobs_pending`: CREATE INDEX IF NOT EXISTS idx_import_jobs_pending ON public.import_jobs(created_at) WHERE status IN ('queued', 'processing') AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_import_jobs_status`: CREATE INDEX IF NOT EXISTS idx_import_jobs_status ON public.import_jobs(company_id, status, created_at DESC) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `invoice_line_items`

- **Domain:** Billing
- **Purpose:** Line items for invoices (per-certificate or fees).
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `invoice_id` → `invoices.id`, `certificate_id` → `certificates.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `invoice_id` | `uuid` | yes |  | Note: This is a Foreign Key to `invoices.id`. |
| `certificate_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificates.id`. |
| `description` | `text` | yes |  | string |
| `quantity` | `integer` | yes | `1` | integer |
| `unit_price` | `numeric` | yes |  | decimal number |
| `amount` | `numeric` | yes |  | decimal number |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can insert line items` — INSERT — WITH CHECK (EXISTS ( SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.company_id = public.get_user_company_id() AND invoices.deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view line items` — SELECT — USING (EXISTS ( SELECT 1 FROM public.invoices WHERE invoices.id = invoice_line_items.invoice_id AND invoices.company_id = public.get_user_company_id() AND invoices.deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_invoice_line_items_certificate`: CREATE INDEX IF NOT EXISTS idx_invoice_line_items_certificate ON public.invoice_line_items(certificate_id) WHERE certificate_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_invoice_line_items_invoice`: CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice ON public.invoice_line_items(invoice_id); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `invoices`

- **Domain:** Billing
- **Purpose:** Invoices generated for a company for a billing period.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`
- **Referenced by (incoming):** `certificates.invoice_id`, `invoice_line_items.invoice_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `invoice_number` | `text` | yes |  | string |
| `period_start` | `date` | yes |  | ISO date (YYYY-MM-DD) |
| `period_end` | `date` | yes |  | ISO date (YYYY-MM-DD) |
| `subtotal` | `numeric` | yes |  | decimal number |
| `tax_amount` | `numeric` | yes |  | decimal number |
| `total_amount` | `numeric` | yes |  | decimal number |
| `currency` | `text` | no | `INR` | string |
| `status` | `text` | yes | `pending` | string |
| `payment_method` | `text` | no |  | string |
| `payment_gateway_id` | `text` | no |  | string |
| `payment_gateway_response` | `jsonb` | no |  | JSON object/array |
| `paid_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `due_date` | `date` | yes |  | ISO date (YYYY-MM-DD) |
| `notes` | `text` | no |  | string |
| `pdf_url` | `text` | no |  | string |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `gst_rate_snapshot` | `numeric` | no |  | GST rate (%) snapshot copied from billing_profiles at invoice creation time |
| `razorpay_invoice_id` | `text` | no |  | Invoice ID returned by Razorpay |
| `razorpay_payment_id` | `text` | no |  | Successful Razorpay payment ID |
| `razorpay_order_id` | `text` | no |  | Razorpay order reference |
| `razorpay_payment_link` | `text` | no |  | Hosted payment link generated by Razorpay |
| `razorpay_status` | `text` | no |  | Razorpay invoice status (issued, paid, expired, cancelled) |
| `issued_via` | `text` | no | `razorpay` | string |
| `company_snapshot` | `jsonb` | yes |  | Company legal details snapshot at invoice creation time |
| `billing_snapshot` | `jsonb` | yes |  | Billing profile snapshot (pricing, GST, currency) at invoice creation time |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can manage invoices` — ALL — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view invoices` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_invoices_company_period`: CREATE INDEX IF NOT EXISTS idx_invoices_company_period ON public.invoices(company_id, period_start, period_end) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_invoices_number`: CREATE INDEX IF NOT EXISTS idx_invoices_number ON public.invoices(invoice_number); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_invoices_status`: CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status, due_date) WHERE status IN ('pending', 'overdue') AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `razorpay_events`

- **Domain:** Billing
- **Purpose:** Immutable log of Razorpay webhook events received by the platform.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | no |  | Note: This is a Foreign Key to `companies.id`. |
| `razorpay_event_id` | `text` | yes |  | string |
| `event_type` | `text` | yes |  | string |
| `payload` | `jsonb` | yes |  | JSON object/array |
| `signature_verified` | `boolean` | no | `false` | true/false |
| `received_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `razorpay_entity_id` | `text` | no |  | string |
| `razorpay_entity_type` | `text` | no |  | string |
| `processed` | `boolean` | no | `false` | true/false |
| `amount` | `numeric` | no |  | Amount from Razorpay event entity |
| `currency` | `text` | no |  | string |
| `status` | `text` | no |  | string |
| `payment_method` | `text` | no |  | string |
| `fee` | `numeric` | no |  | Razorpay processing fee snapshot |
| `tax` | `numeric` | no |  | GST / tax applied by Razorpay |
| `error_code` | `text` | no |  | string |
| `error_reason` | `text` | no |  | string |

### RLS
- **Enabled:** unknown (not detected in parsed repo migrations)
- **Policies:** not found in parsed repo migrations (verify in Supabase)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:** none found for this table

---

## Table: `razorpay_refunds`

- **Domain:** Billing
- **Purpose:** Refund tracking entries for Razorpay (if used).
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | no |  | Note: This is a Foreign Key to `companies.id`. |
| `razorpay_refund_id` | `text` | yes |  | string |
| `razorpay_payment_id` | `text` | yes |  | string |
| `amount` | `numeric` | yes |  | decimal number |
| `currency` | `text` | yes |  | string |
| `status` | `text` | yes |  | string |
| `reason` | `text` | no |  | string |
| `payload` | `jsonb` | yes |  | JSON object/array |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** unknown (not detected in parsed repo migrations)
- **Policies:** not found in parsed repo migrations (verify in Supabase)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:** none found for this table

---

## Table: `user_invitations`

- **Domain:** Tenancy
- **Purpose:** Invite tokens and lifecycle for adding users to a company.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `invited_by` → `users.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `email` | `text` | yes |  | string |
| `role` | `text` | yes | `member` | string |
| `invited_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `token` | `text` | yes | `encode(extensions.gen_random_bytes(32), 'hex'::text)` | string |
| `status` | `text` | yes | `pending` | string |
| `expires_at` | `timestamp with time zone` | yes | `(now() + '7 days'::interval)` | ISO timestamp |
| `accepted_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Admins can create invitations` — INSERT — WITH CHECK (company_id = public.get_user_company_id() AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Admins can update invitations` — UPDATE — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view invitations` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_user_invitations_company`: CREATE INDEX IF NOT EXISTS idx_user_invitations_company ON public.user_invitations(company_id) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_user_invitations_pending`: CREATE INDEX IF NOT EXISTS idx_user_invitations_pending ON public.user_invitations(company_id, created_at DESC) WHERE status = 'pending' AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_user_invitations_token`: CREATE INDEX IF NOT EXISTS idx_user_invitations_token ON public.user_invitations(token) WHERE status = 'pending' AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_user_invitations_unique_pending` (unique): CREATE UNIQUE INDEX IF NOT EXISTS idx_user_invitations_unique_pending ON public.user_invitations(company_id, email) WHERE status = 'pending' AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `users`

- **Domain:** Tenancy
- **Purpose:** User profile scoped to a company (maps to Supabase auth users by id).
- **Row count (live):** 4
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `invited_by` → `users.id`
- **Referenced by (incoming):** `audit_logs.user_id`, `certificate_events.actor_id`, `certificate_templates.created_by`, `certificates.issued_by`, `certificates.revoked_by`, `import_data_rows.deleted_by`, `import_jobs.created_by`, `user_invitations.invited_by`, `users.invited_by`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes |  | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `email` | `text` | yes |  | string |
| `full_name` | `text` | no |  | string |
| `role` | `text` | yes | `member` | string |
| `invited_by` | `uuid` | no |  | Note: This is a Foreign Key to `users.id`. |
| `last_login_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `status` | `text` | no | `active` | User status: active (logged in), invited (pending), disabled |
| `last_seen_at` | `timestamp with time zone` | no |  | Last activity timestamp (updated on each request) |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Admins can insert users` — INSERT — WITH CHECK (company_id = public.get_user_company_id() AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can update own profile` — UPDATE — USING (id = auth.uid() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company users` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_users_active`: CREATE INDEX IF NOT EXISTS idx_users_active ON public.users(company_id) WHERE deleted_at IS NULL AND status = 'active'; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_users_last_seen`: CREATE INDEX IF NOT EXISTS idx_users_last_seen ON public.users(last_seen_at DESC) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_users_status`: CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(company_id, status) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `verification_logs`

- **Domain:** Certificates
- **Purpose:** Public verification audit (QR scans / verification attempts).
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `certificate_id` → `certificates.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `certificate_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificates.id`. |
| `verifier_ip` | `text` | no |  | string |
| `verifier_user_agent` | `text` | no |  | string |
| `verifier_location` | `text` | no |  | string |
| `result` | `text` | yes |  | string |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `ip_address` | `inet` | no |  | IP address |
| `user_agent` | `text` | no |  | string |
| `verified_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Anyone can insert verification logs` — INSERT — WITH CHECK (true) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company logs` — SELECT — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_verification_logs_cert`: CREATE INDEX IF NOT EXISTS idx_verification_logs_cert ON public.verification_logs(certificate_id, verified_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_verification_logs_certificate`: CREATE INDEX IF NOT EXISTS idx_verification_logs_certificate ON public.verification_logs(certificate_id, verified_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_verification_logs_company`: CREATE INDEX IF NOT EXISTS idx_verification_logs_company ON public.verification_logs(company_id, verified_at DESC) WHERE company_id IS NOT NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_verification_logs_company_time`: CREATE INDEX IF NOT EXISTS idx_verification_logs_company_time ON public.verification_logs(company_id, verified_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_verification_logs_result`: CREATE INDEX IF NOT EXISTS idx_verification_logs_result ON public.verification_logs(result, verified_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_verification_logs_time`: CREATE INDEX IF NOT EXISTS idx_verification_logs_time ON public.verification_logs(verified_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `whatsapp_messages`

- **Domain:** Messaging
- **Purpose:** Outbound WhatsApp send log + Meta delivery/billing fields.
- **Row count (live):** 0
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`, `certificate_id` → `certificates.id`, `whatsapp_template_id` → `whatsapp_templates.id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | yes |  | Note: This is a Foreign Key to `companies.id`. |
| `certificate_id` | `uuid` | no |  | Note: This is a Foreign Key to `certificates.id`. |
| `whatsapp_template_id` | `uuid` | no |  | Note: This is a Foreign Key to `whatsapp_templates.id`. |
| `conversation_type` | `text` | no |  | Meta conversation category (user_initiated, business_initiated, etc.) |
| `conversation_id` | `text` | no |  | string |
| `recipient_phone` | `text` | yes |  | string |
| `message_payload` | `jsonb` | yes |  | Exact JSON payload sent to Meta API (for debugging/replay) |
| `meta_message_id` | `text` | no |  | Meta-assigned message ID (returned from send API, used in webhooks) |
| `status` | `text` | yes | `queued` | string |
| `failure_reason` | `text` | no |  | string |
| `error_code` | `text` | no |  | string |
| `pricing_model` | `text` | no |  | Meta pricing model (conversation-based pricing) |
| `price_category` | `text` | no |  | string |
| `billable` | `boolean` | no | `true` | Whether this message incurs Meta charges |
| `sent_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `delivered_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `read_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `cost_amount` | `numeric` | no |  | decimal number |
| `cost_currency` | `text` | no |  | string |
| `cost_snapshot` | `jsonb` | no |  | Meta billing cost snapshot at send time |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `System can insert whatsapp messages` — INSERT — WITH CHECK (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view company whatsapp messages` — SELECT — USING (company_id = public.get_user_company_id()) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_whatsapp_messages_billable`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_billable ON public.whatsapp_messages(company_id, created_at DESC) WHERE billable = true; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_messages_certificate`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_certificate ON public.whatsapp_messages(certificate_id) WHERE certificate_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_messages_company`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company ON public.whatsapp_messages(company_id, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_messages_company_time`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_company_time ON public.whatsapp_messages(company_id, created_at DESC); (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_whatsapp_messages_meta_id`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_meta_id ON public.whatsapp_messages(meta_message_id) WHERE meta_message_id IS NOT NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_messages_pending`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_pending ON public.whatsapp_messages(created_at) WHERE status IN ('queued', 'sent'); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_messages_provider_id`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_provider_id ON public.whatsapp_messages(meta_message_id) WHERE meta_message_id IS NOT NULL; (source: `supabase/04_HARDEN_SCHEMA.sql`)
  - `idx_whatsapp_messages_status`: CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_status ON public.whatsapp_messages(status, created_at DESC); (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

---

## Table: `whatsapp_templates`

- **Domain:** Messaging
- **Purpose:** WhatsApp message templates and Meta sync metadata.
- **Row count (live):** 2
- **Primary key:** `id`
- **Foreign keys (outgoing):** `company_id` → `companies.id`
- **Referenced by (incoming):** `whatsapp_messages.whatsapp_template_id`

| column | type | required | default | value notes |
|---|---|---|---|---|
| `id` | `uuid` | yes | `extensions.uuid_generate_v4()` | Note: This is a Primary Key. |
| `company_id` | `uuid` | no |  | Note: This is a Foreign Key to `companies.id`. |
| `name` | `text` | yes |  | string |
| `meta_template_name` | `text` | yes |  | Template name registered with Meta (e.g., certificate_delivery_v2) |
| `meta_template_id` | `text` | no |  | Meta-assigned template ID (returned after approval) |
| `language_code` | `text` | yes | `en_US` | string |
| `category` | `text` | yes |  | string |
| `status` | `text` | yes | `pending` | string |
| `quality_rating` | `text` | no |  | Meta quality rating (affects rate limits): GREEN (high), YELLOW (medium), RED (low) |
| `rejection_reason` | `text` | no |  | string |
| `body_template` | `text` | yes |  | string |
| `variables` | `jsonb` | no |  | JSON object/array |
| `is_system` | `boolean` | no | `false` | true/false |
| `last_synced_at` | `timestamp with time zone` | no |  | ISO timestamp |
| `created_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `updated_at` | `timestamp with time zone` | no | `now()` | ISO timestamp |
| `deleted_at` | `timestamp with time zone` | no |  | ISO timestamp |

### RLS
- **Enabled:** yes (from repo migrations)
- **Policies (from repo migrations):**
  - `Admins can manage whatsapp templates` — ALL — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL AND EXISTS ( SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin' AND deleted_at IS NULL )) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `Users can view whatsapp templates` — SELECT — USING (company_id = public.get_user_company_id() AND deleted_at IS NULL) (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

### Indexes
- **Implicit:** primary key index (Postgres)
- **Declared in repo migrations:**
  - `idx_whatsapp_templates_company`: CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_company ON public.whatsapp_templates(company_id) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_templates_meta_id`: CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_meta_id ON public.whatsapp_templates(meta_template_id) WHERE meta_template_id IS NOT NULL AND deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)
  - `idx_whatsapp_templates_status`: CREATE INDEX IF NOT EXISTS idx_whatsapp_templates_status ON public.whatsapp_templates(company_id, status) WHERE deleted_at IS NULL; (source: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`)

# Database Functions

## RPC functions (live via PostgREST)

- `event_trigger_fn`
- `generate_api_key` — Generates API key for company (returns plaintext ONCE, stores bcrypt hash)
- `get_user_company_id` — Returns company_id of current authenticated user
- `get_user_role` — Returns role of current authenticated user
- `verify_api_key` — Verifies API key via bcrypt, returns company_id if valid
- `verify_certificate` — Public verification function (used by QR code scans)

## Functions found in repo SQL (inventory)

_Source files: `supabase/04_HARDEN_SCHEMA.sql`, `supabase/05_ENVIRONMENT_TRACKING.sql`, `supabase/storage-setup.sql`, `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`_

- `create_company_settings`
  - signatures: `create_company_settings()`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`
- `generate_api_key` — Generates API key for company (returns plaintext ONCE, stores bcrypt hash)
  - signatures: `generate_api_key(company_uuid UUID)`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`
- `get_user_company_id` — Returns company_id for authenticated user (used in RLS)
  - signatures: `get_user_company_id()`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`, `supabase/storage-setup.sql`
- `increment_template_version`
  - signatures: `increment_template_version()`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`
- `prevent_application_id_update`
  - signatures: `prevent_application_id_update()`
  - sources: `supabase/04_HARDEN_SCHEMA.sql`
- `prevent_email_snapshot_update`
  - signatures: `prevent_email_snapshot_update()`
  - sources: `supabase/04_HARDEN_SCHEMA.sql`
- `prevent_environment_downgrade`
  - signatures: `prevent_environment_downgrade()`
  - sources: `supabase/05_ENVIRONMENT_TRACKING.sql`
- `prevent_whatsapp_payload_update`
  - signatures: `prevent_whatsapp_payload_update()`
  - sources: `supabase/04_HARDEN_SCHEMA.sql`
- `update_certificate_expiry_status`
  - signatures: `update_certificate_expiry_status()`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`
- `verify_api_key` — Verifies API key via bcrypt, returns company_id if valid
  - signatures: `verify_api_key(provided_key TEXT)`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`
- `verify_certificate` — Public verification function (used by QR code scans)
  - signatures: `verify_certificate(token TEXT)`
  - sources: `supabase/FINAL_PRODUCTION_MIGRATION_FIXED.sql`

# Supabase Storage

**Inspected at:** 2026-01-09T06:40:17.821Z

## Bucket: `minecertificate`

- **Public:** yes
- **File size limit:** 50 MB
- **Allowed MIME types:** `image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`, `application/pdf`, `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`, `text/csv`, `text/html`, `text/css`, `application/javascript`, `font/ttf`, `font/woff`, `font/woff2`, `application/zip`

- **Top-level folders (15):** `audit-files/`, `branding/`, `bulk-downloads/`, `certificates-previews/`, `certificates/`, `company-logos/`, `email-attachments/`, `enterprise/`, `failed-rows/`, `imports/`, `qrcodes/`, `temp/`, `template-assets/`, `templates-previews/`, `templates/`

### Folder conventions (observed + code usage)
- `templates/<application_id>/...`: uploaded template PDFs/images; `templates.storage_path` stores this path
- `company-logos/<application_id>/...`: uploaded logos; `companies.logo` stores public URL
- `imports/<application_id>/...`: uploaded import spreadsheets (bulk generation)
- `certificates/<application_id>/...`: generated certificate PDFs (if persisted)
- `qrcodes/`: generated QR code images (if persisted)
- `bulk-downloads/`: generated ZIP downloads

---
