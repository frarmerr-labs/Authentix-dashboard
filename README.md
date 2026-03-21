# Authentix

Enterprise certificate generation, management, and verification platform.

## Quick Start

### Prerequisites

- **Node.js** ≥ 24.0.0 (LTS)
- **npm** ≥ 10.0.0
- Backend API running (see [Backend Setup](#backend-setup))

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd authentix

# Install dependencies
npm install

# Copy environment file
cp .env.example .env.local

# Configure environment variables
# Edit .env.local and set BACKEND_API_URL
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build & Deploy

```bash
# Type check
npm run typecheck

# Lint
npm run lint

# Production build
npm run build

# Start production server
npm start
```

## Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Required: Backend API URL (server-only, never exposed to browser)
BACKEND_API_URL=https://api.authentix.com/api/v1
```

> ⚠️ **Security Note**: `BACKEND_API_URL` must NOT start with `NEXT_PUBLIC_`. It's server-only.

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| [Next.js](https://nextjs.org) | 16.1.1 | React framework with App Router |
| [React](https://react.dev) | 19.2.3 | UI library with Server Components |
| [TypeScript](https://www.typescriptlang.org) | 5.9.3 | Type safety |
| [Tailwind CSS](https://tailwindcss.com) | 4.1.18 | Utility-first CSS |

## Project Structure

```
authentix/
├── app/                      # Next.js App Router
│   ├── (auth)/               # Auth pages (login, signup)
│   ├── api/                  # API Route Handlers (BFF)
│   │   ├── auth/             # Auth endpoints
│   │   └── proxy/            # Backend proxy
│   └── dashboard/            # Protected dashboard routes
│       └── org/[orgId]/      # Organization-scoped pages
├── src/
│   ├── components/           # React components
│   │   └── ui/               # shadcn/ui components
│   ├── features/             # Feature modules
│   └── lib/                  # Utilities and API clients
├── proxy.ts                  # Next.js middleware (auth/routing)
└── .env.example              # Environment template
```

## Architecture

### Authentication

All authentication uses **HttpOnly cookies** - tokens are never accessible via JavaScript.

```
Browser → /api/proxy/* → Backend API
              ↑
         Cookies sent automatically
```

### URL Structure

```
/login                          # Sign in
/signup                         # Register
/dashboard                      # Redirects to org dashboard
/dashboard/org/[orgId]          # Organization dashboard
/dashboard/org/[orgId]/templates
/dashboard/org/[orgId]/certificates
/dashboard/org/[orgId]/billing
```

### Data Flow

1. **Server Components** fetch data on the server
2. **Client Components** handle interactivity only
3. **Streaming** with `loading.tsx` for instant feedback

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with Turbopack |
| `npm run build` | Create production build |
| `npm start` | Start production server |
| `npm run typecheck` | Run TypeScript type checking |
| `npm run lint` | Run ESLint |

## Documentation

- [Changelog](./CHANGELOG.md) - All notable changes by version/date
- [Frontend Architecture](./architecture-design/FRONTEND_DOCUMENTATION.md) - Detailed architecture documentation
- [Email Templates](./email-templates/README.md) - Email template setup guide

## Development Guidelines

### Code Style

- **Server Components** by default for data fetching
- **`"use client"`** only for interactive components
- **TypeScript strict mode** enabled
- **ESLint + Prettier** for code formatting

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Folders | kebab-case | `generate-certificate/` |
| Components | PascalCase | `DashboardShell.tsx` |
| Hooks | camelCase with `use` prefix | `useOrg.ts` |
| Utilities | camelCase | `formatDate.ts` |

### Security Practices

- ✅ HttpOnly cookies for authentication
- ✅ Server-side token validation
- ✅ API proxy to hide backend URL
- ✅ CSP headers configured
- ✅ No sensitive data in client code

## Backend Setup

This frontend requires a backend API. Configure `BACKEND_API_URL` in your `.env.local` file.

### Expected API Endpoints

```
POST /auth/login
POST /auth/signup
POST /auth/logout
POST /auth/refresh
GET  /auth/session
GET  /templates
GET  /companies/:id
GET  /users/me
...
```

## Troubleshooting

### "BACKEND_API_URL not configured"

Ensure `.env.local` exists with `BACKEND_API_URL` set.

### "Session expired" errors

Clear browser cookies and sign in again.

### Build fails with type errors

Run `npm run typecheck` to see detailed errors.

## Contributing

1. Create a feature branch
2. Make changes following the guidelines above
3. Run `npm run typecheck && npm run lint && npm run build`
4. Submit a pull request

## License

Proprietary - All rights reserved.
