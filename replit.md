# Workspace

## Overview

InvoiceFlow — A full-stack SaaS web application for Indian shopkeepers and freelancers to create professional PDF invoices, manage customers, track sales, and share invoices.

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite, Tailwind CSS, shadcn/ui, Recharts
- **Routing**: Wouter
- **Forms**: React Hook Form + Zod

## Structure

```text
artifacts-monorepo/
├── artifacts/
│   ├── api-server/         # Express API server
│   └── invoiceflow/        # React + Vite frontend (served at /)
├── lib/                    # Shared libraries
│   ├── api-spec/           # OpenAPI spec + Orval codegen config
│   ├── api-client-react/   # Generated React Query hooks
│   ├── api-zod/            # Generated Zod schemas from OpenAPI
│   └── db/                 # Drizzle ORM schema + DB connection
├── scripts/                # Utility scripts
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── tsconfig.json
└── package.json
```

## InvoiceFlow App Features

### Pages
- `/` — Landing page (marketing)
- `/onboarding` — 3-step business profile setup (redirected to automatically if no profile exists after login)
- `/dashboard` — Stats, revenue chart, recent invoices, top customers
- `/invoices` — Invoice list with status filters and search
- `/invoices/new` — Create invoice with dynamic line items
- `/invoices/:id` — Invoice preview with Print/Share/Edit/Mark Paid actions
- `/invoices/:id/edit` — Edit invoice
- `/customers` — Customer directory
- `/customers/:id` — Customer detail with invoice history
- `/products` — Product/service library
- `/settings` — Business profile and invoice settings

### Authentication
- **Replit Auth (OIDC)** — Handles login via Replit's OpenID Connect provider (supports Google sign-in)
- Session stored in PostgreSQL (`sessions` table) using `connect-pg-simple`
- User identity stored in `users` table
- All routes protected by `authMiddleware` — returns 401 if not authenticated
- All data queries scoped by `userId` (per-user isolation)
- Auth endpoints: `GET /api/login`, `GET /api/callback`, `GET /api/logout`, `GET /api/auth/user`
- Frontend: `useAuth()` hook from `@workspace/replit-auth-web`; `AuthGuard` component wraps all protected pages

### Database Schema (Drizzle ORM)
- `users` — Authenticated user records (id, name, email, profile image)
- `sessions` — Server-side session storage
- `business_profiles` — Business info, bank details, invoice settings (scoped by userId)
- `customers` — Customer directory (scoped by userId)
- `products` — Product/service library with default rates (scoped by userId)
- `invoices` — Invoice records with computed totals (scoped by userId)
- `invoice_items` — Line items per invoice

### API Endpoints (under /api)
- `GET/POST/PATCH /business-profile`
- `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`
- `GET/POST /products`, `PATCH/DELETE /products/:id`
- `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id`
- `PATCH /invoices/:id/mark-paid`
- `GET /invoices/next-number`
- `GET /dashboard/stats`
- `GET /dashboard/monthly-revenue`
- `GET /dashboard/top-customers`

## TypeScript & Composite Projects

Every package extends `tsconfig.base.json` which sets `composite: true`. The root `tsconfig.json` lists all packages as project references.

## Root Scripts

- `pnpm run build` — runs `typecheck` first, then recursively runs `build` in all packages
- `pnpm run typecheck` — runs `tsc --build --emitDeclarationOnly` using project references

## Packages

### `artifacts/invoiceflow` (`@workspace/invoiceflow`)
React + Vite frontend served at `/`. Uses generated React Query hooks from `@workspace/api-client-react`.

### `artifacts/api-server` (`@workspace/api-server`)
Express 5 API server. Routes live in `src/routes/`.

### `lib/db` (`@workspace/db`)
Database layer using Drizzle ORM with PostgreSQL.
- `pnpm --filter @workspace/db run push` — sync schema

### `lib/api-spec` (`@workspace/api-spec`)
OpenAPI 3.1 spec and Orval codegen config.
- `pnpm --filter @workspace/api-spec run codegen` — regenerate hooks and Zod schemas

### `lib/api-zod` (`@workspace/api-zod`)
Generated Zod schemas from OpenAPI spec.

### `lib/api-client-react` (`@workspace/api-client-react`)
Generated React Query hooks from OpenAPI spec.
