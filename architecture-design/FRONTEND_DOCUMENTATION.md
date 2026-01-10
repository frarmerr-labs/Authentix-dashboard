# Frontend Architecture & Documentation

## Overview

The Authentix frontend is a Next.js 15 application built with React 18, TypeScript, and Tailwind CSS. It serves as a pure UI layer that communicates exclusively with the backend API. All business logic, database operations, and external service integrations are handled by the dedicated backend.

## Tech Stack

### Core Framework
- **Next.js**: 15.0.3 (App Router)
- **React**: 18.3.1
- **TypeScript**: 5.7.2
- **Node.js**: >=20.0.0

### UI & Styling
- **Tailwind CSS**: 3.4.1
- **shadcn/ui**: Component library (Radix UI primitives)
- **lucide-react**: 0.555.0 (Icons)
- **class-variance-authority**: 0.7.1 (Component variants)
- **tailwind-merge**: 3.4.0 (Class merging)
- **tailwindcss-animate**: 1.0.7 (Animations)

### Data & State Management
- **No state management library**: Uses React hooks (useState, useEffect, useCallback)
- **API Client**: Centralized client in `lib/api/client.ts` for all backend communication
- **Local Storage**: Token storage via `lib/auth/storage.ts`

### File Processing
- **pdf-lib**: 1.17.1 (PDF manipulation)
- **react-pdf**: 10.3.0 (PDF rendering)
- **xlsx**: 0.18.5 (Excel file parsing)
- **jszip**: 3.10.1 (ZIP file creation)
- **csv-stringify**: 6.6.0 (CSV generation)
- **qrcode**: 1.5.4 (QR code generation)

### Utilities
- **date-fns**: 4.1.0 (Date formatting)
- **date-fns-tz**: 3.2.0 (Timezone handling)
- **uuid**: 13.0.0 (ID generation)
- **react-colorful**: 5.6.1 (Color picker)
- **react-dropzone**: 14.3.8 (File uploads)
- **react-resizable**: 3.1.3 (Resizable components)
- **@dnd-kit/core**: 6.3.1 (Drag and drop)

## Project Structure

```
MineCertificate/
├── app/                          # Next.js App Router pages
│   ├── (auth)/                  # Auth route group
│   │   ├── login/
│   │   │   └── page.tsx         # Login page
│   │   └── signup/
│   │       ├── page.tsx         # Signup page
│   │       └── success/
│   │           └── page.tsx     # Email verification waiting page
│   ├── dashboard/                # Protected dashboard routes
│   │   ├── layout.tsx           # Dashboard layout with sidebar
│   │   ├── page.tsx              # Dashboard home (stats)
│   │   ├── templates/
│   │   │   └── page.tsx         # Template management
│   │   ├── generate-certificate/
│   │   │   ├── page.tsx         # Certificate generation tool
│   │   │   └── components/      # Generation tool components
│   │   ├── imports/
│   │   │   └── page.tsx         # Data import management
│   │   ├── certificates/
│   │   │   └── page.tsx         # Certificate listing
│   │   ├── billing/
│   │   │   ├── page.tsx         # Billing overview
│   │   │   ├── invoices/[id]/
│   │   │   │   └── page.tsx     # Invoice detail
│   │   │   └── components/      # Billing components
│   │   ├── company/
│   │   │   └── page.tsx         # Company profile
│   │   ├── settings/
│   │   │   ├── page.tsx         # General settings
│   │   │   └── api/
│   │   │       └── page.tsx     # API key management
│   │   ├── users/
│   │   │   └── page.tsx         # User management
│   │   └── verification-logs/
│   │       └── page.tsx         # Verification history
│   ├── layout.tsx               # Root layout
│   ├── page.tsx                 # Landing/home page
│   └── globals.css              # Global styles
├── components/                   # Reusable components
│   ├── ui/                      # shadcn/ui components
│   ├── templates/
│   │   └── TemplateUploadDialog.tsx
│   └── onboarding/
│       └── OnboardingModal.tsx
├── lib/                         # Utilities and helpers
│   ├── api/
│   │   └── client.ts           # Backend API client
│   ├── auth/
│   │   └── storage.ts          # Token storage
│   ├── hooks/
│   │   └── use-certificate-categories.ts
│   ├── billing-ui/
│   │   ├── hooks/              # Billing hooks
│   │   ├── types.ts
│   │   └── utils/              # Billing utilities
│   ├── types/
│   │   └── certificate.ts     # TypeScript types
│   └── utils/                  # General utilities
└── architecture-design/         # Documentation
```

## File Structure Details

### `/app` Directory

#### Authentication Pages (`app/(auth)/`)

**`login/page.tsx`**
- **Purpose**: User login page
- **Data Source**: `api.auth.login()` from backend
- **State Management**: Local state with `useState`
- **Key Features**:
  - Email/password form
  - Password visibility toggle
  - Error handling and display
  - Token storage in localStorage after successful login
  - Redirects to `/dashboard` on success
- **API Endpoint**: `POST /api/v1/auth/login`
- **Storage**: Stores `access_token` and `refresh_token` in localStorage

**`signup/page.tsx`**
- **Purpose**: User registration page
- **Data Source**: `api.auth.signup()` from backend
- **State Management**: Local state
- **Key Features**:
  - Email, password, full name, company name form
  - Email domain validation (rejects personal emails)
  - Password strength requirements
  - Redirects to success page after signup
- **API Endpoint**: `POST /api/v1/auth/signup`
- **Storage**: Stores tokens in localStorage

**`signup/success/page.tsx`**
- **Purpose**: Email verification waiting page
- **Data Source**: `api.auth.getSession()` polling
- **State Management**: Local state with polling
- **Key Features**:
  - Polls session endpoint every 2 seconds
  - Shows verification status
  - Redirects to dashboard when verified
- **API Endpoint**: `GET /api/v1/auth/session`

#### Dashboard Layout (`app/dashboard/layout.tsx`)

**Purpose**: Main dashboard layout with sidebar navigation

**Components**:
- Sidebar with navigation menu
- Header with user info and company logo
- User dropdown with logout
- Theme toggle (light/dark/system)

**Data Sources**:
- `api.auth.getSession()` - User session verification
- `api.users.getProfile()` - User and company details

**State Management**:
- Server-side data loading with `useEffect`
- Client-side state for UI interactions

**Key Features**:
- Responsive sidebar (collapsible on mobile)
- Active route highlighting
- User avatar and company logo display
- Logout functionality
- Theme switching

**API Endpoints Used**:
- `GET /api/v1/auth/session`
- `GET /api/v1/users/me`

#### Dashboard Home (`app/dashboard/page.tsx`)

**Purpose**: Main dashboard with statistics and recent activity

**Data Source**: `api.dashboard.getStats()`

**Displays**:
1. **Statistics Cards**:
   - Total certificates issued
   - Pending import jobs
   - Verifications today
   - Revoked certificates

2. **Recent Imports**: List of recent import jobs with status

3. **Recent Verifications**: List of recent certificate verifications

**State Management**: 
- `useState` for stats, imports, verifications
- `useEffect` for data loading

**API Endpoint**: `GET /api/v1/dashboard/stats`

**Data Structure**:
```typescript
{
  stats: {
    totalCertificates: number;
    pendingJobs: number;
    verificationsToday: number;
    revokedCertificates: number;
  };
  recentImports: Array<{
    id: string;
    file_name: string;
    status: string;
    total_rows: number;
    created_at: string;
  }>;
  recentVerifications: Array<{
    id: string;
    result: string;
    verified_at: string;
    certificate: { recipient_name: string; course_name: string } | null;
  }>;
}
```

#### Templates Page (`app/dashboard/templates/page.tsx`)

**Purpose**: Certificate template management

**Data Source**: `api.templates.list()` and `api.templates.getPreviewUrl()`

**Features**:
- Grid display of templates
- Template preview (images and PDFs)
- Upload new template dialog
- Delete template functionality
- Filter by status
- Category/subcategory badges
- Template card with preview, name, category, status, certificate count

**State Management**:
- Templates list state
- Loading states
- Dialog states (upload, preview, delete)

**API Endpoints**:
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/:id/preview` - Get preview URL
- `POST /api/v1/templates` - Create template (via dialog)
- `DELETE /api/v1/templates/:id` - Delete template

**Template Card Display**:
- Preview image/PDF (aspect ratio 4:3)
- File type badge
- Template name
- Category and subcategory badges (color-coded)
- Certificate count
- Status badge (Active/Draft/Archived)
- Actions: Generate Certificate, Delete

**Preview Handling**:
- Images: Direct `<img>` tag with `object-contain`
- PDFs: `<iframe>` for browser rendering
- Signed URLs from backend (1-hour expiry)

#### Generate Certificate Page (`app/dashboard/generate-certificate/page.tsx`)

**Purpose**: Interactive certificate generation tool

**Data Sources**:
- `api.templates.list()` - Available templates
- `api.templates.get()` - Selected template details
- `api.templates.update()` - Auto-save field configurations
- `api.imports.list()` - Saved data imports
- `api.imports.getData()` - Import data rows
- `api.certificates.generate()` - Generate certificates

**Key Components** (in `components/` subdirectory):
1. **TemplateSelector**: Select template from saved templates
2. **CertificateCanvas**: Interactive canvas for field placement
3. **RightPanel**: Field configuration panel
4. **DataSelector**: Import data selection
5. **FieldTypeSelector**: Add new fields
6. **FieldLayersList**: Manage field layers
7. **ExportSection**: Generate and download certificates
8. **PDFViewer**: Preview PDF template
9. **PDFThumbnail**: Thumbnail view
10. **AssetLibrary**: Asset management
11. **DataImporter**: Import data files
12. **DraggableField**: Draggable field component
13. **LeftPanel**: Left sidebar panel
14. **TemplateUploader**: Upload new template

**State Management**:
- Template state (selected template, PDF file)
- Fields state (array of CertificateField objects)
- Imported data state
- Field mappings state
- UI state (canvas scale, current step, active tab)
- Hidden fields set

**Workflow**:
1. **Template Selection**: Choose template or upload new
2. **Design Phase**: 
   - Place fields on canvas (drag and drop)
   - Configure field properties (type, position, styling)
   - Auto-save field configurations to template
3. **Data Phase**:
   - Import data (CSV/XLSX) or use saved import
   - Map data columns to certificate fields
4. **Export Phase**:
   - Preview generated certificates
   - Generate batch certificates
   - Download as ZIP or individual PDFs

**Auto-save Features**:
- Template dimensions auto-saved when PDF loads
- Field configurations auto-saved after 1 second delay
- Uses `api.templates.update()` for persistence

**API Endpoints**:
- `GET /api/v1/templates` - List templates
- `GET /api/v1/templates/:id` - Get template
- `PUT /api/v1/templates/:id` - Update template (fields, dimensions)
- `GET /api/v1/import-jobs` - List imports
- `GET /api/v1/import-jobs/:id/data` - Get import data
- `POST /api/v1/certificates/generate` - Generate certificates

**Field Types Supported**:
- `name`: Recipient name
- `course`: Course name
- `date`: Date field
- `start_date`: Start date
- `end_date`: End date
- `custom`: Custom text
- `qr_code`: QR code for verification

**Field Properties**:
- Position (x, y)
- Size (width, height)
- Font size, family, color
- Text alignment
- Prefix/suffix
- Date format (for date fields)

#### Imports Page (`app/dashboard/imports/page.tsx`)

**Purpose**: Data import management

**Data Source**: `api.imports.list()`

**Features**:
- List all import jobs
- Status indicators (pending, processing, completed, failed)
- File name and row count display
- Created date
- Category/subcategory assignment
- Link to template (if assigned)
- Reusable flag

**State Management**: Local state for imports list

**API Endpoints**:
- `GET /api/v1/import-jobs` - List imports
- `POST /api/v1/import-jobs` - Create import (via upload)
- `GET /api/v1/import-jobs/:id` - Get import details
- `GET /api/v1/import-jobs/:id/data` - Get import data

**Import Process**:
1. Upload CSV/XLSX file
2. Backend parses and stores data
3. Import job created with status "pending"
4. Backend processes and validates data
5. Status updates to "completed" or "failed"
6. Data available for certificate generation

#### Certificates Page (`app/dashboard/certificates/page.tsx`)

**Purpose**: List all issued certificates

**Data Source**: `api.certificates.list()` (if implemented)

**Features**:
- Certificate listing
- Search and filter
- Verification status
- Download links
- Revocation status

**API Endpoints**:
- `GET /api/v1/certificates` - List certificates

#### Billing Pages

**`app/dashboard/billing/page.tsx`**
- **Purpose**: Billing overview and invoice listing
- **Data Source**: `api.billing.getOverview()` and `api.billing.listInvoices()`
- **Components Used**:
  - `BillingOverview` (from `components/billing-overview.tsx`)
  - `InvoiceList` (from `components/invoice-list.tsx`)
- **Displays**:
  - Current period usage
  - Estimated charges
  - Recent invoices
  - Total outstanding
- **API Endpoints**:
  - `GET /api/v1/billing/overview`
  - `GET /api/v1/billing/invoices`

**`app/dashboard/billing/invoices/[id]/page.tsx`**
- **Purpose**: Invoice detail view
- **Data Source**: `api.billing.getInvoice()`
- **Components Used**: `InvoiceDetail`
- **Displays**:
  - Invoice details
  - Line items
  - Payment status
  - Payment link (if available)
- **API Endpoint**: `GET /api/v1/billing/invoices/:id`

#### Company Page (`app/dashboard/company/page.tsx`)

**Purpose**: Company profile management

**Data Source**: `api.companies.get()` and `api.companies.update()`

**Features**:
- Company name, email, phone, website
- Industry selection
- Address fields (address, city, state, country, postal code)
- Tax information (GST, CIN)
- Logo upload
- Form validation
- Auto-save on change

**State Management**: Local form state

**API Endpoints**:
- `GET /api/v1/companies/me` - Get company
- `PUT /api/v1/companies/me` - Update company (supports file upload for logo)

**Form Fields**:
- Name (required)
- Email
- Phone
- Website
- Industry (dropdown)
- Address
- City
- State
- Country
- Postal Code
- GST Number
- CIN Number
- Logo (file upload)

#### Settings Pages

**`app/dashboard/settings/page.tsx`**
- **Purpose**: General settings
- **Features**: User preferences, notifications, etc.

**`app/dashboard/settings/api/page.tsx`**
- **Purpose**: API key management
- **Data Source**: `api.companies.getAPISettings()`
- **Features**:
  - View API settings
  - Bootstrap identity (generate application_id and API key)
  - Rotate API key
  - Toggle API enabled/disabled
  - Copy API key to clipboard
- **API Endpoints**:
  - `GET /api/v1/companies/me/api-settings`
  - `PUT /api/v1/companies/me/api-settings`
  - `POST /api/v1/companies/me/bootstrap-identity`
  - `POST /api/v1/companies/me/rotate-api-key`

#### Users Page (`app/dashboard/users/page.tsx`)

**Purpose**: User management (if multi-user support)

**Data Source**: User management API (if implemented)

#### Verification Logs Page (`app/dashboard/verification-logs/page.tsx`)

**Purpose**: Certificate verification history

**Data Source**: Verification logs API (if implemented)

### `/components` Directory

#### UI Components (`components/ui/`)

All shadcn/ui components built on Radix UI:
- `alert.tsx` - Alert/notification component
- `badge.tsx` - Badge component
- `button.tsx` - Button component
- `card.tsx` - Card container
- `dialog.tsx` - Modal dialog
- `dropdown-menu.tsx` - Dropdown menu
- `input.tsx` - Input field
- `label.tsx` - Form label
- `select.tsx` - Select dropdown
- `separator.tsx` - Visual separator
- `switch.tsx` - Toggle switch
- `tabs.tsx` - Tab component

#### Custom Components

**`components/templates/TemplateUploadDialog.tsx`**
- **Purpose**: Dialog for uploading certificate templates
- **Features**:
  - File upload (drag & drop or click)
  - Template name input
  - Category/subcategory selection
  - File type detection (PDF, PNG, JPG)
  - Preview before upload
  - Error handling
- **Data Source**: `api.templates.create()` and `api.templates.getCategories()`
- **State Management**: Local form state
- **API Endpoints**:
  - `GET /api/v1/templates/categories` - Get categories
  - `POST /api/v1/templates` - Create template

**`components/onboarding/OnboardingModal.tsx`**
- **Purpose**: Onboarding flow for new users
- **Features**: Step-by-step guide

### `/lib` Directory

#### API Client (`lib/api/client.ts`)

**Purpose**: Centralized backend API client

**Key Functions**:
- `apiRequest<T>()` - Generic API request handler
  - Handles authentication (Bearer token)
  - Error handling (network, parse, HTTP errors)
  - Response parsing
  - Type-safe responses

**API Domains**:

1. **`api.auth`**:
   - `login(email, password)` - User login
   - `signup(email, password, full_name, company_name)` - User registration
   - `logout()` - User logout
   - `getSession()` - Verify session

2. **`api.templates`**:
   - `list(params?)` - List templates (paginated)
   - `get(id)` - Get template by ID
   - `create(file, metadata)` - Create template
   - `update(id, updates)` - Update template
   - `delete(id)` - Delete template
   - `getPreviewUrl(id)` - Get signed preview URL
   - `getCategories()` - Get certificate categories

3. **`api.certificates`**:
   - `generate(params)` - Generate certificates

4. **`api.imports`**:
   - `list(params?)` - List import jobs
   - `get(id)` - Get import job
   - `create(file, metadata)` - Create import job
   - `getData(id, params?)` - Get import data rows
   - `getDownloadUrl(id)` - Get download URL

5. **`api.billing`**:
   - `getOverview()` - Get billing overview
   - `listInvoices(params?)` - List invoices
   - `getInvoice(id)` - Get invoice details

6. **`api.verification`**:
   - `verify(token)` - Verify certificate (public endpoint)

7. **`api.dashboard`**:
   - `getStats()` - Get dashboard statistics

8. **`api.companies`**:
   - `get()` - Get company profile
   - `update(data, logoFile?)` - Update company
   - `getAPISettings()` - Get API settings
   - `updateAPIEnabled(enabled)` - Toggle API
   - `bootstrapIdentity()` - Generate API credentials
   - `rotateAPIKey()` - Rotate API key

9. **`api.users`**:
   - `getProfile()` - Get user profile

**Error Handling**:
- `ApiError` class for structured errors
- Network error detection
- JSON parse error handling
- HTTP error handling
- Detailed error messages with codes

**Authentication**:
- Token retrieved from `localStorage` via `getAccessToken()`
- Bearer token in `Authorization` header
- `skipAuth` option for public endpoints (login, signup)

#### Auth Storage (`lib/auth/storage.ts`)

**Purpose**: Client-side token storage

**Functions**:
- `setAuthTokens(tokens)` - Store access and refresh tokens
- `getAccessToken()` - Get access token
- `getRefreshToken()` - Get refresh token
- `getExpiresAt()` - Get token expiry
- `clearAuthTokens()` - Clear all tokens
- `isTokenExpired()` - Check if token expired

**Storage Keys**:
- `auth_access_token`
- `auth_refresh_token`
- `auth_expires_at`

#### Hooks (`lib/hooks/`)

**`use-certificate-categories.ts`**
- **Purpose**: Fetch and manage certificate categories
- **Data Source**: `api.templates.getCategories()`
- **Returns**:
  - `categories`: Array of category names
  - `categoryMap`: Map of category to subcategories
  - `loading`: Loading state
  - `error`: Error message
  - `getSubcategories(category)`: Get subcategories for category
  - `requiresSubcategory(category)`: Check if category requires subcategory
  - `reload()`: Reload categories

**State Management**: 
- Uses `useState` for categories, loading, error
- Uses `useEffect` for initial load
- Uses `useCallback` for memoized functions

#### Billing UI (`lib/billing-ui/`)

**Hooks** (`hooks/`):
- `use-billing-overview.ts` - Fetch billing overview
- `use-invoice-list.ts` - Fetch invoice list
- `use-invoice-detail.ts` - Fetch invoice details

**Types** (`types.ts`):
- TypeScript interfaces for billing data

**Utils** (`utils/`):
- `currency-formatter.ts` - Format currency values
- `invoice-helpers.ts` - Invoice utility functions

#### Types (`lib/types/certificate.ts`)

**TypeScript Interfaces**:
- `CertificateField` - Field configuration
- `CertificateTemplate` - Template structure
- `ImportedData` - Imported data structure
- `FieldMapping` - Field to column mapping

## Data Flow

### Authentication Flow

1. User enters credentials on login page
2. `api.auth.login()` called with email/password
3. Backend validates and returns session tokens
4. Tokens stored in `localStorage` via `setAuthTokens()`
5. User redirected to dashboard
6. Subsequent API calls include Bearer token in header
7. Token retrieved via `getAccessToken()` from storage

### Template Upload Flow

1. User opens upload dialog
2. Categories loaded via `useCertificateCategories()` hook
3. User selects file (drag & drop or click)
4. File validated (type, size)
5. Template name auto-filled from filename
6. User selects category/subcategory
7. Form submitted with file and metadata
8. `api.templates.create()` called with FormData
9. Backend uploads file to Supabase Storage
10. Template record created in database
11. Success callback refreshes template list

### Certificate Generation Flow

1. User selects template
2. Template PDF loaded and displayed on canvas
3. User places fields (drag & drop)
4. Field configurations auto-saved to template
5. User imports data (CSV/XLSX) or selects saved import
6. User maps data columns to fields
7. User clicks "Generate Certificates"
8. `api.certificates.generate()` called with:
   - Template ID
   - Data array
   - Field mappings
   - Options (QR code, file name)
9. Backend generates certificates (async job)
10. Frontend polls for job completion
11. Certificates downloaded as ZIP or individual files

### Data Import Flow

1. User uploads CSV/XLSX file
2. `api.imports.create()` called with file
3. Backend parses file and creates import job
4. Backend processes data asynchronously
5. Frontend shows import in list with "pending" status
6. Status updates to "completed" or "failed"
7. User can view import data and use for certificate generation

## Environment Variables

**Required**:
- `NEXT_PUBLIC_API_URL` - Backend API base URL (default: `http://localhost:3000/api/v1`)

**Example**:
```
NEXT_PUBLIC_API_URL=https://authentix-backend.vercel.app/api/v1
```

## Build & Deployment

**Development**:
```bash
npm run dev
```

**Production Build**:
```bash
npm run build
npm start
```

**Linting**:
```bash
npm run lint
```

## Key Design Patterns

1. **Centralized API Client**: All backend communication through single client
2. **Token-based Authentication**: JWT tokens stored in localStorage
3. **Component Composition**: Reusable UI components from shadcn/ui
4. **Type Safety**: Full TypeScript coverage
5. **Error Boundaries**: Structured error handling with ApiError class
6. **Optimistic Updates**: UI updates before API confirmation where appropriate
7. **Auto-save**: Field configurations auto-saved with debouncing

## Important Notes

- **No Direct Database Access**: Frontend never directly accesses Supabase
- **No Business Logic**: All business logic in backend
- **Stateless**: Frontend is stateless, state managed via React hooks
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Accessibility**: Radix UI components are accessible by default
