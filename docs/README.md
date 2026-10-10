# ERP System — Technical Documentation Index

> **Generated:** 2026-10-10
> **Scope:** Complete technical blueprint of the CampusOne ERP System
> **Methodology:** Evidence-based analysis of all source code, configuration, database schema, migration files, and existing documentation. No information was invented.
>
> **Verification Labels Used Throughout:**
> - **Verified** — confirmed from direct source code or configuration
> - **Inferred** — reasonable conclusion from evidence, not directly stated
> - **Unverified** — claimed but not confirmed in available files
> - **Missing** — expected but not found anywhere
> - **Inconsistent** — conflicts between two or more sources

---

## Documentation Map

### Architecture
| Document | Contents |
|---|---|
| [01-repository-and-system-inventory.md](architecture/01-repository-and-system-inventory.md) | Directory tree, technology stack matrix, entry points, domain modules |
| [02-system-architecture.md](architecture/02-system-architecture.md) | Layered architecture diagram, request lifecycle, state management, deployment topologies |
| [03-frontend-architecture.md](architecture/03-frontend-architecture.md) | Provider hierarchy, all 47 routes, authentication state machine, API client design |
| [04-backend-controllers-and-logic.md](architecture/04-backend-controllers-and-logic.md) | Controller inventory, business logic analysis, middleware pipeline, seed architecture |

### Database
| Document | Contents |
|---|---|
| [01-database-overview.md](database/01-database-overview.md) | Table inventory, enum catalog, connection configuration, migration strategy |
| [02-complete-schema.md](database/02-complete-schema.md) | Full column-by-column data dictionary for all 24 tables |
| [03-indexes-and-performance.md](database/03-indexes-and-performance.md) | All 72 indexes, high-frequency query patterns, missing index analysis |
| [04-relationships-and-constraints.md](database/04-relationships-and-constraints.md) | All 26 FKs, unique constraints, cascade chains, circular references |
| [05-entity-relationship-diagram.md](database/05-entity-relationship-diagram.md) | Complete ERD (Mermaid), domain-specific sub-ERDs |
| [06-migration-analysis.md](database/06-migration-analysis.md) | Migration inventory, schema drift finding, seed file analysis |

### API & Connections
| Document | Contents |
|---|---|
| [01-frontend-backend-map.md](connections/01-frontend-backend-map.md) | Feature ? API function ? HTTP endpoint ? controller ? DB table mapping |
| [02-api-inventory.md](connections/02-api-inventory.md) | All 57 endpoints with methods, paths, auth requirements, roles, handlers |

### Diagrams
| Document | Contents |
|---|---|
| [01-data-flow-diagrams.md](diagrams/01-data-flow-diagrams.md) | 7 sequence diagrams: login, student dashboard, fee payment, attendance, library issue/return, analytics |

### Security
| Document | Contents |
|---|---|
| [01-security-and-access-control.md](security/01-security-and-access-control.md) | Auth flow, RBAC matrix, JWT design, CORS, security middleware, known vulnerabilities |

### Infrastructure
| Document | Contents |
|---|---|
| [01-infrastructure-and-deployment.md](infrastructure/01-infrastructure-and-deployment.md) | Docker Compose topology, Vercel deployment, environment variables, data flow |

### Audit & Quality
| Document | Contents |
|---|---|
| [01-quality-and-gap-analysis.md](audit/01-quality-and-gap-analysis.md) | Schema drift, security gaps, missing features, code quality, risk matrix |

---

## System at a Glance

| Property | Value |
|---|---|
| System Name | CampusOne ERP |
| Application Type | Higher-education management system |
| Architecture | 3-tier monolith (React SPA + Express REST API + PostgreSQL) |
| Backend Language | TypeScript (Node.js / Express) |
| Frontend Language | TypeScript (React 18 + Vite) |
| Database | PostgreSQL 16 |
| ORM | Prisma v7 |
| Authentication | Stateless JWT (1-day expiry) |
| Authorization | Role-based (7 roles) |
| Deployment Options | Docker Compose (self-hosted) / Vercel (cloud serverless) |
| Total DB Tables | 21 (migration) + 3 drift (SystemActivity, ExpenseRecord, ResearchGrant) |
| Total DB Enums | 15 |
| Total DB Indexes | 72 |
| Total API Endpoints | 57 |
| Total Frontend Routes | 47 |
| Domain Modules | 7 (Auth, Student, Faculty, Admin, Finance, Library, Analytics) |

---

## Top Priority Action Items

| # | Finding | Severity | File |
|---|---|---|---|
| 1 | Default passwords (`student123`, `faculty123`) for all new users | **Critical** | `studentController.ts:60`, `facultyController.ts:59` |
| 2 | Schema drift — 3 tables in schema.prisma missing from migrations | **Critical** | `schema.prisma` vs `migration.sql` |
| 3 | JWT stored in localStorage (XSS vulnerability) | **High** | `AuthContext.tsx:17` |
| 4 | Server-side logout not implemented — tokens remain valid post-logout | **High** | `authController.ts:93-95` |
| 5 | No input validation library — all validation is ad-hoc | **High** | All controllers |
| 6 | Fee payment race condition — no atomic balance check | **High** | `feeController.ts:158-165` |
| 7 | No token refresh mechanism | **Medium** | No `/auth/refresh` endpoint |
| 8 | `FRONTEND_URL` defaults to `localhost:5173` if not set | **Medium** | `backend/src/index.ts:18` |
| 9 | Hardcoded placeholder `JWT_SECRET` in `docker-compose.yml` | **Medium** | `docker-compose.yml:34` |
| 10 | Denormalised `Student.cgpa` and `attendancePercentage` risk staleness | **Medium** | `schema.prisma:Student` |
