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
- `/invoices` — Invoice list with status filters, search, **bulk operations** (Select mode: mark paid/sent/delete), **WhatsApp Remind** quick-link on unpaid cards
- `/invoices/new` — Create invoice with dynamic line items, HSN/SAC per item, GST rate per item, placeOfSupply, supplyType (CGST/SGST vs IGST)
- `/invoices/:id` — Invoice preview with Print/Share/Edit/Mark Paid, **WhatsApp Reminder button**, payment recording UI, IGST/CGST display, payment history panel
- `/invoices/:id/edit` — Edit invoice
- `/estimates` — Estimates list with status filters (draft/sent/accepted/rejected/converted)
- `/estimates/new` — Create estimate (mirrors invoice form)
- `/estimates/:id` — Estimate detail with Convert-to-Invoice button
- `/estimates/:id/edit` — Edit estimate
- `/expenses` — Expenses list with category/date filters and summary cards
- `/expenses/new` — Log expense (date, category, vendor, amount, method)
- `/reports` — GST Report (GSTR-1 style by slab, month/year filter) + P&L (6-month bar chart, expense breakdown) + **Aging Report** (outstanding buckets: Current, 1-30, 31-60, 61-90, 90+ days)
- `/recurring` — **Recurring Invoices**: set up auto-billing schedules (weekly/monthly/quarterly/yearly), Run Now, Pause/Resume, edit template
- `/customers` — Customer directory
- `/customers/:id` — Customer detail with invoice history
- `/products` — Product/service library with HSN code and GST rate fields
- `/settings` — Business profile and invoice settings

### Authentication
- **Better Auth** — Fully self-hosted, stores everything in your own PostgreSQL database
- Sessions managed with secure HTTP-only cookies; no external auth service needed
- `requireAuth` middleware calls `auth.api.getSession()` on every protected route
- `BETTER_AUTH_SECRET` env var required; `BETTER_AUTH_URL` defaults to `REPLIT_DEV_DOMAIN` in dev
- All data queries scoped by `userId` (per-user isolation)
- Sign-in page at `/sign-in` and sign-up at `/sign-up` — custom forms built with shadcn/ui
- Landing page uses `<Link>` to `/sign-in` and `/sign-up` routes
- Google OAuth optional — enable by setting `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` env vars
- Frontend: `useSession()`, `signIn`, `signOut`, `signUp` from `better-auth/react` via `src/lib/auth-client.ts`
- DB tables: `auth_user`, `auth_session`, `auth_account`, `auth_verification` (managed by Better Auth)

### Database Schema (Drizzle ORM)
- `auth_user` — User records managed by Better Auth
- `auth_session` — Active session tokens
- `auth_account` — OAuth provider accounts linked to users
- `auth_verification` — Email verification tokens
- `business_profiles` — Business info, bank details, invoice settings (scoped by userId)
- `customers` — Customer directory (scoped by userId)
- `products` — Product/service library with default rates, hsnCode, taxRate (scoped by userId)
- `invoices` — Invoice records with computed totals, placeOfSupply, supplyType, paidAmount (scoped by userId)
- `invoice_items` — Line items per invoice with hsnCode, taxRate
- `estimates` — Estimate records mirroring invoice structure with status (draft/sent/accepted/rejected/converted), convertedToInvoiceId
- `estimate_items` — Line items per estimate with hsnCode, taxRate
- `expenses` — Expense records (date, category, amount, vendor, paymentMethod, reference, receiptUrl)
- `payments` — Payment records per invoice (amount, date, method, reference, notes); auto-recalculates invoice paidAmount and status (partial/paid)

### API Endpoints (under /api)
- `GET/POST/PATCH /business-profile`
- `GET/POST /customers`, `GET/PATCH/DELETE /customers/:id`
- `GET/POST /products`, `PATCH/DELETE /products/:id`
- `GET/POST /invoices`, `GET/PATCH/DELETE /invoices/:id`
- `PATCH /invoices/:id/mark-paid`
- `GET /invoices/next-number`
- `GET/POST /invoices/:invoiceId/payments`, `DELETE /invoices/:invoiceId/payments/:paymentId`
- `GET/POST /estimates`, `GET/PATCH/DELETE /estimates/:id`
- `POST /estimates/:id/convert` — converts estimate to invoice
- `GET /estimates/next-number`
- `GET/POST /expenses`, `GET/PATCH/DELETE /expenses/:id`
- `GET /reports/gst` — GSTR-1 style summary by tax slab with month/year filter
- `GET /reports/profit-loss` — 6-month P&L with expenses by category
- `GET /dashboard/stats` — now includes totalExpenses + netProfit
- `GET /dashboard/monthly-revenue`
- `GET /dashboard/top-customers`

### Key Implementation Notes
- supplyType `intra` → CGST + SGST split; `inter` → IGST only
- Payments auto-recalc invoice `paidAmount`; status set to `partial` if paidAmount < total, `paid` if equal
- `UpdateBusinessProfileResponse` is an alias for `GetBusinessProfileResponse` in api-zod (not auto-generated, added manually)
- api-zod schemas are manually maintained (not regenerated from OpenAPI) — edit `lib/api-zod/src/generated/api.ts` directly

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
