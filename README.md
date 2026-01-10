# MineCertificate

A multi-tenant certificate generation and verification platform built with Next.js, Supabase, and TypeScript.

## 🚀 Features

- **Bulk Certificate Generation**: Upload Excel files and generate certificates in bulk
- **Template Management**: Create and manage certificate templates with custom fields
- **Fast Search**: Full-text search with sub-2s response times for 100k+ certificates
- **Secure Verification**: Public verification with QR codes and rate limiting
- **Multi-Tenant**: Complete data isolation with Row-Level Security (RLS)
- **Bulk Operations**: Download multiple certificates as ZIP, bulk revoke with audit trail
- **Background Jobs**: Async processing for imports and bulk downloads
- **Audit Logging**: Complete audit trail for all actions

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
- **Search**: PostgreSQL Full-Text Search with GIN indices
- **File Processing**: XLSX parsing, PDF generation, QR code generation
- **State Management**: React Server Components, Server Actions

## 📦 Project Structure

```
minecertificate/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Authentication pages
│   ├── (dashboard)/              # Dashboard pages
│   │   ├── templates/            # Template management
│   │   ├── imports/              # Import jobs
│   │   ├── certificates/         # Certificate listing
│   │   ├── verification-logs/    # Verification logs
│   │   └── settings/             # Company settings
│   ├── api/                      # API routes
│   └── verify/                   # Public verification page
├── components/                   # React components
│   ├── dashboard/                # Dashboard components
│   ├── templates/                # Template components
│   ├── imports/                  # Import components
│   ├── certificates/             # Certificate components
│   ├── verification/             # Verification components
│   ├── shared/                   # Shared components
│   └── ui/                       # shadcn/ui components
├── lib/                          # Utilities and helpers
│   ├── supabase/                 # Supabase clients
│   ├── api/                      # API helpers
│   ├── jobs/                     # Background job logic
│   └── utils/                    # Utility functions
├── types/                        # TypeScript types
└── supabase/                     # Supabase migrations & functions
    ├── migrations/               # Database migrations
    └── functions/                # Edge Functions
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account (for production) or local Supabase setup

### Installation

1. **Clone the repository**
   ```bash
   cd MineCertificate
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**

   Copy `.env.local` and update with your Supabase credentials:
   ```bash
   # .env.local
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 📚 Documentation

### Complete Implementation Plan

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete implementation guide including:

1. **File Structure & Component Responsibilities**
2. **Complete Component Implementations** (TSX stubs with props, behaviors, acceptance criteria)
3. **Full API Contract** (endpoints with request/response JSON examples)
4. **SQL Schema, Indices & Full-Text Search Setup**
5. **Supabase RLS Policies** (multi-tenant security)
6. **Background Job Architecture** (imports, bulk downloads)
7. **Testing Checklist & QA Steps**
8. **Environment Setup Guide**

### Database Setup

1. **Create Supabase Project**
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Copy the project URL and anon key

2. **Run Migrations**

   Execute the SQL files in order:
   ```bash
   # Using Supabase CLI
   supabase db push

   # Or manually in Supabase SQL Editor
   # Run migrations in order:
   # - 001_initial_schema.sql
   # - 002_rls_policies.sql
   # - 003_indices.sql
   # - 004_full_text_search.sql
   ```

3. **Configure Storage Buckets**

   Create these buckets in Supabase Storage:
   - `templates` - For certificate templates
   - `certificates` - For generated PDFs and QR codes
   - `bulk-downloads` - For ZIP files

4. **Deploy Edge Functions**
   ```bash
   supabase functions deploy process-import
   supabase functions deploy generate-bulk-download
   ```

## 🎨 UI Components

This project uses [shadcn/ui](https://ui.shadcn.com/) components. Key components include:

- **Button** - Primary actions and navigation
- **Card** - Content containers with headers and footers
- **Badge** - Status indicators and labels
- **Table** - Data tables with sorting and filtering
- **Dialog** - Modals and confirmations
- **Select** - Dropdowns for forms
- **Checkbox** - Multi-selection in tables
- **Tabs** - Tabbed interfaces

To add more components:
```bash
npx shadcn-ui@latest add [component-name]
```

## 🔐 Security Features

- **Row-Level Security (RLS)**: All database queries scoped by company_id
- **Signed URLs**: All file downloads use signed URLs with expiration
- **Rate Limiting**: Verification endpoint limited to 100 requests/hour per IP
- **Input Validation**: All user inputs sanitized and validated
- **Audit Logging**: All actions logged with user ID, IP, and timestamp
- **HMAC Webhooks**: Webhook signatures for external integrations

## 📊 Performance Features

- **Server-Side Pagination**: Default 20 per page, max 200
- **Full-Text Search**: GIN index on certificates for sub-2s search
- **Optimized Indices**: Strategic indices on company_id, dates, tokens
- **Background Jobs**: Long-running tasks processed async
- **Chunked Processing**: Large imports processed in batches of 50

## 🧪 Testing

See the Testing Checklist in [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md#7-testing-checklist--qa-steps) for:

- Component testing (UI, accessibility, keyboard nav)
- API testing (endpoints, RLS, rate limiting)
- Security testing (cross-company access, XSS, SQL injection)
- Performance testing (search speed, bulk operations)
- Edge case testing (empty states, large files, errors)

## 📝 API Documentation

### Authentication

All authenticated endpoints require:
```
Authorization: Bearer <supabase_access_token>
```

### Key Endpoints

- `GET /api/me` - Get current user
- `GET /api/templates` - List templates
- `POST /api/imports` - Start import job
- `GET /api/certificates` - List certificates (with search, filters, pagination)
- `POST /api/certificates/bulk-download` - Bulk download
- `GET /api/public/verify` - Verify certificate (public)

See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md#3-complete-api-contract) for full API documentation.

## 🚢 Deployment

### Deploy to Vercel

1. **Connect to Vercel**
   ```bash
   vercel --prod
   ```

2. **Set Environment Variables**

   Add these in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_APP_URL`

3. **Configure Custom Domain** (optional)

   Update `NEXT_PUBLIC_APP_URL` to your production domain

### Production Checklist

- [ ] Database migrations run
- [ ] Storage buckets created and configured
- [ ] Edge Functions deployed
- [ ] Environment variables set
- [ ] RLS policies enabled
- [ ] Rate limiting configured
- [ ] Error tracking set up (Sentry)
- [ ] Uptime monitoring configured

## 🤝 Contributing

This is a reference implementation. Feel free to:

- Extend features based on your needs
- Customize UI components and styling
- Add additional authentication providers
- Implement custom template engines
- Add webhook integrations

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/)
- Backend powered by [Supabase](https://supabase.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
- Icons from [Lucide](https://lucide.dev/)

---

**Status**: ✅ Development server running at http://localhost:3000

For questions or issues, check the [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) documentation.
