# ── Stage 1: Install all dependencies ────────────────────────────────────────
# Use node:22-slim (Debian/glibc) so native packages like rollup match the
# lockfile's linux-x64-gnu binaries. Alpine (musl) causes MODULE_NOT_FOUND.
FROM node:22-slim AS deps

RUN corepack enable && corepack prepare pnpm@10 --activate
WORKDIR /app

# Copy workspace manifests first (for layer caching)
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./

# Copy every package.json so pnpm can resolve the workspace graph
COPY artifacts/api-server/package.json   ./artifacts/api-server/
COPY artifacts/invoiceflow/package.json  ./artifacts/invoiceflow/
COPY lib/api-client-react/package.json   ./lib/api-client-react/
COPY lib/api-spec/package.json           ./lib/api-spec/
COPY lib/api-zod/package.json            ./lib/api-zod/
COPY lib/db/package.json                 ./lib/db/
COPY lib/replit-auth-web/package.json    ./lib/replit-auth-web/

RUN pnpm install --no-frozen-lockfile

# ── Stage 2: Build the frontend ───────────────────────────────────────────────
FROM deps AS frontend-builder

COPY . .

# PORT is required by vite.config.ts validation (only affects dev server, not build output)
RUN PORT=3000 BASE_PATH=/ NODE_ENV=production \
    pnpm --filter @workspace/invoiceflow run build

# ── Stage 3: Build the API server ─────────────────────────────────────────────
FROM deps AS api-builder

COPY . .

RUN pnpm --filter @workspace/api-server run build

# ── Stage 4: DB migration image (run once to push schema) ─────────────────────
FROM deps AS migrate

COPY . .

ENV DATABASE_URL=""

CMD ["pnpm", "--filter", "@workspace/db", "run", "push-force"]

# ── Stage 5: Minimal production image ─────────────────────────────────────────
FROM node:22-slim AS runner

WORKDIR /app

# Copy bundled API (esbuild bundles everything including @opentelemetry)
COPY --from=api-builder  /app/artifacts/api-server/dist ./dist

# Copy frontend static files so Express can serve them at dist/public/
COPY --from=frontend-builder /app/artifacts/invoiceflow/dist/public ./dist/public

ENV NODE_ENV=production
EXPOSE 8080

CMD ["node", "--enable-source-maps", "./dist/index.mjs"]
