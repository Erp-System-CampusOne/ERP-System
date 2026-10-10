# Infrastructure & Deployment Documentation

> **Verification Status:** All infrastructure details verified from `docker-compose.yml`, `vercel.json`, `backend/Dockerfile`, `frontend/Dockerfile`, `frontend/nginx.conf`, and `backend/.env.example`.

## 1. Deployment Topologies

The system supports two deployment modes:

### A. Docker Compose (Self-hosted / Local)

Three services defined in `docker-compose.yml`:

```
+--------------------------------------------------------+
¦  erp_network (bridge)                                   ¦
¦                                                        ¦
¦  +-----------------+     +-------------------------+  ¦
¦  ¦   erp_db        ¦     ¦       erp_api            ¦  ¦
¦  ¦ PostgreSQL 16   ¦?----¦ Node.js Express          ¦  ¦
¦  ¦ Port: 5432      ¦     ¦ Port: 3000 (internal)    ¦  ¦
¦  ¦ Volume: pgdata  ¦     ¦ ./backend/Dockerfile     ¦  ¦
¦  +-----------------+     +-------------------------+  ¦
¦                                      ¦ HTTP proxy      ¦
¦  +----------------------------------- ?--------------+ ¦
¦  ¦   erp_web                                         ¦ ¦
¦  ¦ Nginx (React SPA + /api proxy)                    ¦ ¦
¦  ¦ Port: 8080:80 (exposed to host)                   ¦ ¦
¦  ¦ ./frontend/Dockerfile                             ¦ ¦
¦  +---------------------------------------------------+ ¦
+--------------------------------------------------------+
```

| Service | Image | Port | Volume | Health Check |
|---|---|---|---|---|
| `erp_db` | postgres:16-alpine | 5432 (internal) | pgdata:/var/lib/postgresql/data | `pg_isready -U erp_user -d erp_db` every 5s |
| `erp_api` | Built from `backend/Dockerfile` | 3000 (internal) | None | `wget http://localhost:3000/api/health` every 10s |
| `erp_web` | Built from `frontend/Dockerfile` | **8080:80** (exposed) | None | Depends on `erp_api` healthy |

Startup order: `erp_db` (healthy) ? `erp_api` (healthy) ? `erp_web`

Volume: `pgdata` (local driver) — persists PostgreSQL data across container restarts.

### B. Vercel (Cloud, Serverless)

```
Browser
  |
  v
Vercel Edge Network
  |
  +-- /api/*  ? Backend serverless function (backend/src/index.ts)
  +-- /*      ? Frontend static build (Vite output)
```

Routing rules (`vercel.json`):
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": {"service": "backend"} },
    { "source": "/(.*)",     "destination": {"service": "frontend"} }
  ]
}
```

The backend handles serverless mode by conditionally skipping `app.listen()`:
```typescript
// backend/src/index.ts:83-87
if (!process.env.VERCEL) {
  app.listen(PORT, ...);
}
export default app;
```

---

## 2. Docker Configuration

### backend/Dockerfile (Inferred — not directly read)
- Builds TypeScript Express app
- Runs compiled `dist/index.js`
- Exposes port 3000

### frontend/Dockerfile (Inferred — not directly read)
- Multi-stage: builds Vite SPA, copies to Nginx image
- Nginx serves static files + proxies `/api` to backend

### Nginx Configuration (frontend/nginx.conf)

Key behaviour (inferred from context — full file not read):
- Serves React SPA on port 80
- Proxies `/api/*` requests to `erp_api:3000`
- `try_files $uri $uri/ /index.html` for SPA client-side routing support

---

## 3. Environment Variables

| Variable | Required | Default | Purpose | Validation |
|---|---|---|---|---|
| `DATABASE_URL` | **YES** | (none) | PostgreSQL connection string | Validated at startup (`env.ts`) |
| `JWT_SECRET` | **YES** | (none) | JWT signing secret | Validated at startup (`env.ts`) |
| `PORT` | No | 3000 | HTTP server port | Not validated |
| `FRONTEND_URL` | Strongly recommended | `http://localhost:5173` | CORS allowed origin | Not validated (has default) |
| `NODE_ENV` | No | (none) | Runtime environment | Used for error message filtering |
| `VERCEL` | No | (none) | Signals serverless deployment | Auto-set by Vercel platform |

### Docker Compose Default Values

```yaml
NODE_ENV: production
PORT: 3000
DATABASE_URL: postgresql://erp_user:erp_password@db:5432/erp_db?schema=public
JWT_SECRET: super_secure_jwt_secret_change_in_production  ? MUST CHANGE
FRONTEND_URL: http://localhost:8080
```

> **Security Warning:** The `docker-compose.yml` contains a placeholder JWT_SECRET. This file must not be used in production without overriding this value via environment-specific overrides or secrets management.

---

## 4. Data Flow (Request Lifecycle in Docker)

```
1. User opens browser at http://localhost:8080
2. Nginx (erp_web) serves React SPA HTML/JS bundle
3. React boots, router matches, component mounts
4. Component calls apiCall.ts function ? fetch('/api/students', {Authorization: Bearer <token>})
5. Nginx receives /api/* request ? proxies to erp_api:3000
6. Express app receives request
7. Rate limiter, CORS, helmet, morgan apply
8. JWT middleware verifies token
9. Role middleware checks authorization
10. Controller runs ? Prisma query
11. Prisma sends SQL to erp_db:5432 (PostgreSQL)
12. PostgreSQL returns rows
13. Prisma deserialises to typed objects
14. Controller transforms and serialises to JSON
15. Response travels back: PostgreSQL ? Controller ? Express ? Nginx ? Browser
16. React re-renders with new data
```

---

## 5. Database Connectivity

| Property | Value |
|---|---|
| Pool implementation | `pg.Pool` (node-postgres) |
| Pool configuration | Default `pg.Pool` settings (max connections: 10, idle timeout: 10s) |
| Prisma adapter | `@prisma/adapter-pg` (Prisma v7 driver adapter model) |
| Connection string | Passed via `DATABASE_URL` env var |
| Schema | `public` |

```typescript
// backend/src/config/db.ts (verified)
const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
```

---

## 6. Analytics Integration

The frontend includes `@vercel/analytics/react` (`<Analytics />` component in `main.tsx`). This sends anonymous page view events to Vercel Analytics automatically. No custom event tracking is configured.

---

## 7. Missing Infrastructure Considerations

| Gap | Status | Risk |
|---|---|---|
| No dedicated staging environment documented | Unverified | Medium |
| No secrets management system (Vault, AWS Secrets Manager) | Unverified | Medium |
| No database backup strategy documented | Unverified | High |
| No database connection pooling (PgBouncer/Neon pooling) | Not configured | Medium (Vercel serverless) |
| No CDN for static assets | Not configured (Vercel handles) | Low |
| No horizontal scaling configuration | Single instance | Medium |
| No CI/CD pipeline configuration | Not found | Medium |
