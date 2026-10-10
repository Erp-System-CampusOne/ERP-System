# System Architecture

> **Verification Status:** All layers and connections verified from source code unless marked otherwise.

## 1. Architectural Layers

The application has the following layers. The **service layer directory exists but is empty** — there is no service abstraction between controllers and the database.

```
+------------------------------------------------------+
¦                  PRESENTATION LAYER                  ¦
¦   React SPA — 44 pages, 6 feature modules            ¦
¦   TailwindCSS + Radix UI + Recharts + Motion         ¦
+------------------------------------------------------+
                       ¦ user interaction
+----------------------?-------------------------------+
¦              FRONTEND APPLICATION LAYER               ¦
¦   React Router DOM v6 (42 routes, lazy-loaded)       ¦
¦   TanStack Query (server state / caching)            ¦
¦   AuthContext (JWT token management)                 ¦
+------------------------------------------------------+
                       ¦ HTTP fetch()
+----------------------?-------------------------------+
¦              API COMMUNICATION LAYER                  ¦
¦   apiCall.ts (auto-generated typed client)            ¦
¦   customApi.ts (handwritten supplemental calls)       ¦
¦   Base URL: /api (relative — proxied by Nginx/Vercel)¦
+------------------------------------------------------+
                       ¦ HTTP requests ? /api/*
+----------------------?-------------------------------+
¦              BACKEND ROUTING LAYER                    ¦
¦   Express.js Router (13 route modules)                ¦
¦   Rate limiter: 100 req / 15 min / IP                ¦
¦   CORS: configured origin from FRONTEND_URL env var  ¦
+------------------------------------------------------+
                       ¦
+----------------------?-------------------------------+
¦              MIDDLEWARE LAYER                         ¦
¦   helmet (secure HTTP headers)                        ¦
¦   morgan (request logging — combined format)          ¦
¦   authenticateJWT (verifies Bearer token)             ¦
¦   authorizeRoles (role whitelist check)               ¦
¦   errorHandler (centralised 500 handler)              ¦
+------------------------------------------------------+
                       ¦
+----------------------?-------------------------------+
¦              BUSINESS LOGIC / CONTROLLER LAYER        ¦
¦   13 controllers — each handles one domain            ¦
¦   Input parsing, validation (inline, no library)      ¦
¦   Data transformation before DB calls                 ¦
¦   No dedicated service layer exists                   ¦
+------------------------------------------------------+
                       ¦ Prisma ORM calls
+----------------------?-------------------------------+
¦              DATA ACCESS LAYER                        ¦
¦   Prisma Client (v7) + @prisma/adapter-pg             ¦
¦   Connection pool via node-postgres (pg)              ¦
+------------------------------------------------------+
                       ¦ TCP/IP
+----------------------?-------------------------------+
¦              PERSISTENCE LAYER                        ¦
¦   PostgreSQL 16 (single instance)                     ¦
¦   Schema: public                                      ¦
¦   21 tables, 15 enums                                 ¦
+------------------------------------------------------+
```

---

## 2. Key Design Decisions

### 2.1 Two-Layer Backend (No Service Layer)
- **Verified:** `backend/src/services/` directory is empty.
- Business logic (validation, computation, status sync) resides directly in controllers.
- **Impact:** Controllers are long and multi-responsibility (e.g., `analyticsController.ts` is 350 lines). Reuse requires copy-paste.

### 2.2 Auto-Generated API Client
- `frontend/src/api/apiCall.ts` is marked "automatically generated — do not modify manually."
- Typed against `apiInterface.ts`.
- `customApi.ts` is hand-written for operations not covered by the generator.

### 2.3 Auto-Generated Router
- `frontend/src/app/router.generated.tsx` is marked "PROTECTED ROUTER DEFINITION — DETERMINISTICALLY GENERATED."
- All routes use `React.lazy()` for code splitting.

### 2.4 Token Storage
- JWT stored in `localStorage` under key `campusone_jwt_token` (verified: `AuthContext.tsx:17`).
- Token injected into every API request via `Authorization: Bearer <token>` header.
- `setApiConfig()` mutates a module-level config object.

### 2.5 Role-Based Access Control
- Seven roles: `student`, `faculty`, `hod`, `admin`, `finance_officer`, `librarian`, `management`.
- Enforced via `authorizeRoles()` middleware at the route level.
- Some resource-ownership checks in controllers (e.g., students can only view their own fees).

### 2.6 Database Design
- Single PostgreSQL instance, single schema (`public`).
- 15 PostgreSQL enums enforce domain values (no raw strings).
- Circular relationship between `Department` and `Faculty` (HOD) resolved with named Prisma relations.
- Comprehensive indexes on all FK columns and common filter columns.

---

## 3. Request Lifecycle (Verified)

```
1. User action in browser
2. React component calls apiCall.ts function
3. fetch() with {method, url, headers: {Authorization: Bearer <token>}}
4. Nginx (Docker) or Vercel rewrites /api/* to backend
5. Express rate limiter checks IP
6. helmet sets security headers
7. morgan logs request
8. express.json() parses body (limit: 10kb)
9. Route matched ? authenticateJWT verifies JWT
10. authorizeRoles checks user role against whitelist
11. Controller function executes
12. Prisma constructs and runs SQL query
13. PostgreSQL returns result
14. Controller transforms and serialises response
15. JSON response sent to frontend
16. TanStack Query caches response
17. React re-renders with new data
```

---

## 4. Frontend State Management Architecture

| State Type | Mechanism | Evidence |
|---|---|---|
| Authentication state | `AuthContext` (React Context) | `frontend/src/contexts/AuthContext.tsx` |
| JWT token persistence | `localStorage` | `AuthContext.tsx:17,38` |
| Server data caching | TanStack Query (`useQuery`, `useMutation`) | `frontend/src/main.tsx:22-30` |
| UI state (modals, forms) | Local component `useState` | Inferred from page components |
| Toast notifications | Sonner (`toast()` calls) | `frontend/src/main.tsx:38` |

---

## 5. Deployment Topologies

### Docker Compose (Local/Self-hosted)

```
Browser ? localhost:8080 ? [Nginx in erp_web container]
                                  ¦ /api/*
                             [erp_api container] ? [erp_db PostgreSQL]
```

Services:
- `erp_db`: PostgreSQL 16, persisted with named volume `pgdata`
- `erp_api`: Node.js Express, port 3000 (internal)
- `erp_web`: Nginx serving React build + proxy, port 8080 (exposed)

Health checks:
- `erp_db`: `pg_isready` every 5s
- `erp_api`: `wget http://localhost:3000/api/health` every 10s
- `erp_web`: depends on `erp_api` being healthy

### Vercel (Cloud)

```
Browser ? Vercel Edge ? /api/* ? Backend serverless function
                      ? /*    ? Frontend static deployment
```

- Backend runs as serverless (conditional `listen()` at `index.ts:83-87`).
- Frontend served as static Vite build.
- Rewrites defined in root `vercel.json`.
