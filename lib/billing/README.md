# Billing Module

Production-grade monthly invoice generation for pay-as-you-go SaaS billing.

---

## Overview

This module handles:
- **Monthly invoice generation** - Automated billing for previous month
- **Usage aggregation** - Counts unbilled certificates per company
- **Pricing application** - Platform fee + per-certificate charges
- **GST compliance** - Tax rate snapshot at invoice creation
- **Razorpay integration** - Creates hosted invoices with payment links
- **Idempotency** - Safe to run multiple times, never double-bills

---

## Quick Start

### Manual Invoice Generation

```bash
# Generate invoices for previous month (all companies)
curl -X POST http://localhost:3000/api/admin/generate-invoices

# Generate for specific month
curl -X POST "http://localhost:3000/api/admin/generate-invoices?month=1&year=2025"

# Generate for specific company
curl -X POST "http://localhost:3000/api/admin/generate-invoices?company_id=uuid"

# Dry run (simulate without creating)
curl -X POST "http://localhost:3000/api/admin/generate-invoices?dry_run=true"
```

### Programmatic Usage

```typescript
import { runMonthlyInvoiceJob } from '@/lib/billing/monthly-invoice-job';

// Generate invoices for previous month
const result = await runMonthlyInvoiceJob();

console.log(`Created ${result.invoices_created} invoices`);
console.log(`Errors: ${result.errors.length}`);
```

---

## Module Structure

```
lib/billing/
├── types.ts                    - TypeScript type definitions
├── billing-period.ts           - Billing period calculations
├── usage-aggregator.ts         - Certificate usage counting
├── invoice-calculator.ts       - Amount and GST calculations
├── razorpay-client.ts          - Razorpay API wrapper
├── invoice-generator.ts        - Main invoice generation logic
├── monthly-invoice-job.ts      - Batch job orchestration
└── README.md                   - This file
```

---

## How It Works

### 1. Billing Period

Always generates invoices for **PREVIOUS calendar month**:

```typescript
// If today is 2025-02-15
const period = getPreviousMonthBillingPeriod();
// Returns: January 2025 (2025-01-01 to 2025-01-31)
```

### 2. Company Selection

Only bills companies where:
- `status = 'active'`
- `environment = 'prod'`
- Billing profile exists

### 3. Usage Aggregation

Counts unbilled certificates:

```typescript
const usage = await getUnbilledCertificateUsage(companyId, period, supabase);
// Returns: { certificate_count: 150, unbilled_certificate_ids: [...] }
```

**Key:** Only counts certificates where `invoice_id IS NULL`.

### 4. Invoice Calculation

```typescript
const calculation = calculateInvoice(billingProfile, usage, period);

// Line Items:
// 1. Platform fee: ₹500.00 (if > 0)
// 2. Certificate usage: 150 × ₹10.00 = ₹1,500.00

// Calculation:
// Subtotal: ₹2,000.00
// GST (18%): ₹360.00
// Total: ₹2,360.00
```

### 5. Invoice Creation

Creates:
- Local invoice record in `invoices` table
- Line items in `invoice_line_items` table
- Attaches certificates (sets `invoice_id`)
- Creates Razorpay hosted invoice
- Updates local invoice with Razorpay details

### 6. Idempotency

```typescript
// Check if invoice already exists
const existing = await findExistingInvoice(companyId, period, supabase);
if (existing) {
  return { skipped: true, invoice_id: existing.id };
}
```

Safe to run multiple times - existing invoices are detected and skipped.

---

## Invoice Structure

### Database Schema

**invoices table:**
```sql
id                  UUID
company_id          UUID (FK)
period_start        TIMESTAMPTZ
period_end          TIMESTAMPTZ
subtotal            NUMERIC(10,2)
tax_amount          NUMERIC(10,2)
total_amount        NUMERIC(10,2)
currency            TEXT
gst_rate_snapshot   NUMERIC(5,2)
status              TEXT (pending, paid, overdue, cancelled, refunded)
razorpay_invoice_id TEXT
razorpay_payment_link TEXT
razorpay_status     TEXT
```

**invoice_line_items table:**
```sql
id          UUID
invoice_id  UUID (FK)
company_id  UUID (FK)
description TEXT
quantity    INTEGER
unit_price  NUMERIC(10,2)
amount      NUMERIC(10,2)
item_type   TEXT (platform_fee, certificate_usage)
```

### Example Invoice

```json
{
  "id": "inv-uuid",
  "company_id": "company-uuid",
  "period_start": "2025-01-01T00:00:00Z",
  "period_end": "2025-01-31T23:59:59Z",
  "subtotal": 2000.00,
  "tax_amount": 360.00,
  "total_amount": 2360.00,
  "currency": "INR",
  "gst_rate_snapshot": 18.00,
  "status": "pending",
  "razorpay_invoice_id": "inv_xxxxx",
  "razorpay_payment_link": "https://rzp.io/i/xxxxx"
}
```

**Line Items:**
```json
[
  {
    "description": "Platform usage fee – Jan 2025",
    "quantity": 1,
    "unit_price": 500.00,
    "amount": 500.00,
    "item_type": "platform_fee"
  },
  {
    "description": "Certificates issued – Jan 2025",
    "quantity": 150,
    "unit_price": 10.00,
    "amount": 1500.00,
    "item_type": "certificate_usage"
  }
]
```

---

## API Endpoints

### POST /api/admin/generate-invoices

Generate monthly invoices.

**Query Parameters:**
- `month` (optional) - Month (1-12)
- `year` (optional) - Year (e.g., 2025)
- `company_id` (optional) - Generate for specific company
- `dry_run` (optional) - Set to "true" to simulate

**Response:**
```json
{
  "success": true,
  "summary": {
    "period": "January 2025",
    "companies_processed": 10,
    "invoices_created": 8,
    "invoices_skipped": 2,
    "errors": 0,
    "duration_ms": 4532
  },
  "errors": [],
  "results": [...]
}
```

### GET /api/admin/generate-invoices

Get API documentation.

---

## Configuration

### Billing Profile (per company)

```sql
INSERT INTO billing_profiles (
  company_id,
  platform_fee_amount,      -- Fixed monthly fee (₹500)
  certificate_unit_price,   -- Per-certificate charge (₹10)
  gst_rate,                 -- GST percentage (18%)
  currency,                 -- Currency code (INR)
  razorpay_customer_id      -- Razorpay customer ID
) VALUES (
  'company-uuid',
  500.00,
  10.00,
  18.00,
  'INR',
  'cust_xxxxx'
);
```

### Environment Variables

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (critical!)
- `NEXT_PUBLIC_RAZORPAY_KEY_ID_PROD`
- `RAZORPAY_KEY_SECRET_PROD`
- `NEXT_PUBLIC_ENVIRONMENT=prod`

---

## Testing

### Run Dry Run

```bash
curl -X POST "http://localhost:3000/api/admin/generate-invoices?dry_run=true"
```

### Generate Test Invoice

```bash
curl -X POST "http://localhost:3000/api/admin/generate-invoices?month=1&year=2025&company_id=test-uuid"
```

### Verify Invoice in Database

```sql
SELECT
  i.id,
  c.name,
  i.total_amount,
  i.status,
  (SELECT COUNT(*) FROM certificates WHERE invoice_id = i.id) as cert_count
FROM invoices i
JOIN companies c ON c.id = i.company_id
WHERE i.created_at::date = CURRENT_DATE;
```

---

## Cron Setup (Future)

**vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/admin/generate-invoices",
      "schedule": "0 0 1 * *"
    }
  ]
}
```

Runs on 1st of every month at 00:00 UTC.

---

## Error Handling

### Retries

All operations are idempotent. Safe to retry:

```bash
# If job fails, re-run same command
curl -X POST "http://localhost:3000/api/admin/generate-invoices"
```

Existing invoices will be detected and skipped.

### Common Errors

**"Billing profile not found"**
- Create billing profile for company

**"Razorpay invoice creation failed"**
- Check Razorpay credentials
- Verify customer ID exists

**"Failed to attach certificates"**
- Check database permissions
- Verify service role key is set

---

## Monitoring

### Check Today's Invoices

```sql
SELECT COUNT(*), SUM(total_amount)
FROM invoices
WHERE created_at::date = CURRENT_DATE;
```

### Check Unbilled Certificates

```sql
SELECT
  c.name,
  COUNT(*) as unbilled_count
FROM certificates cert
JOIN companies c ON c.id = cert.company_id
WHERE cert.invoice_id IS NULL
  AND cert.deleted_at IS NULL
  AND cert.issued_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
GROUP BY c.name;
```

### Revenue Report

```sql
SELECT
  DATE_TRUNC('month', period_start) as month,
  SUM(total_amount) as revenue,
  COUNT(*) as invoice_count
FROM invoices
GROUP BY month
ORDER BY month DESC;
```

---

## Integration

### With Phase 8 (Webhooks)

Webhooks automatically update invoice status:
- `invoice.paid` → Updates `status` to 'paid'
- `invoice.expired` → Updates `status` to 'overdue'

### With Razorpay

1. Invoice created in Razorpay
2. Customer receives email/SMS with payment link
3. Customer pays
4. Webhook updates local invoice status

---

## Best Practices

1. **Always test with dry_run first**
2. **Run manually before setting up cron**
3. **Monitor logs on first production run**
4. **Set up alerts for failures**
5. **Review unbilled certificates regularly**
6. **Keep billing profiles up to date**

---

## Documentation

- **Complete Guide:** `PHASE9_MONTHLY_INVOICING.md`
- **Setup Guide:** `PHASE9_SETUP_GUIDE.md`
- **Implementation Checklist:** `PHASE9_IMPLEMENTATION_CHECKLIST.md`

---

## Support

**Common Issues:** See troubleshooting section in `PHASE9_MONTHLY_INVOICING.md`

**Database Queries:** See monitoring section above

**Testing:** See `PHASE9_SETUP_GUIDE.md`

---

**Ready for production!** 🚀
