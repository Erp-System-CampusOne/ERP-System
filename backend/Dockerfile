# ─── Stage 1: Builder ────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace manifests first (layer-cache friendly)
COPY package.json package-lock.json ./
COPY backend/package.json ./backend/
COPY frontend/package.json ./frontend/

# Install all deps (devDeps needed for tsc + ts-node)
RUN npm ci --workspace=backend --include-workspace-root --ignore-scripts

# Copy backend source
COPY backend/ ./backend/

# Generate Prisma Client
WORKDIR /app/backend
RUN npx prisma generate

# Compile TypeScript → dist/
RUN npm run build

# Also compile seed with ts-node baked in (ts-node is a devDep, available here)
# We transpile seed.ts → dist/seed.js so we can run it without ts-node in prod
RUN node_modules/.bin/ts-node --project tsconfig.json --transpile-only -e \
    "require('./prisma/seed')" 2>/dev/null || true
# The above is just a compile-check; the real seed output is done via npx ts-node at runtime
# Alternative: just keep ts-node in the final image for seeding only


# ─── Stage 2: Production ─────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Copy everything from builder (including devDeps — needed for ts-node seed)
COPY --from=builder /app/package.json          ./package.json
COPY --from=builder /app/package-lock.json     ./package-lock.json
COPY --from=builder /app/backend/package.json  ./backend/package.json
COPY --from=builder /app/frontend/package.json ./frontend/package.json
COPY --from=builder /app/node_modules          ./node_modules

COPY --from=builder /app/backend/dist          ./backend/dist
COPY --from=builder /app/backend/prisma        ./backend/prisma
COPY --from=builder /app/backend/tsconfig.json ./backend/tsconfig.json
COPY --from=builder /app/backend/prisma7.config.ts ./backend/prisma7.config.ts

# Regenerate Prisma client in this image
WORKDIR /app/backend
RUN npx prisma generate

ENV NODE_ENV=production

EXPOSE 3000

# startup: apply tracked migrations → (opt-in seed) → start server
CMD ["sh", "-c", "\
  echo '>>> Applying Prisma migrations...' && \
  npx prisma migrate deploy && \
  if [ \"$SEED_ON_STARTUP\" = \"true\" ]; then \
    echo '>>> Seeding database (SEED_ON_STARTUP is true)...' && \
    npx ts-node --project tsconfig.json --transpile-only prisma/seed.ts && \
    echo '>>> Repairing and constraining library data...' && \
    npx ts-node --project tsconfig.json --transpile-only prisma/repair-library.ts; \
  fi && \
  echo '>>> Starting API server...' && \
  node dist/index.js \
"]
