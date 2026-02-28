# Shipping Dispatch Program — Claude Code Guide

## Project Overview

This is a **greenfield rebuild** of a shipping dispatch web application for a contracted trucking company.
The `legacy/` subdirectory contains the previous FeathersJS implementation — use it as a reference for
business logic, data shapes, and Geotab integration patterns. Do **not** copy its structure or dependencies.

The system supports dispatchers and managers at individual shipping terminals, as well as corporate-level
roles that span all terminals. The core focus is **dispatch communication and compliance monitoring** —
not route optimization or shipment management (those are handled by external tools).

Routes are pre-planned dealership deliveries. The dispatcher's job is to monitor drivers, manage
appointment timing, flag HOS issues, and communicate with drivers and customers.

---

## Architecture Principles

**No framework.** There is no application framework (no FeathersJS, no NestJS, no Adonis). Structure is
enforced through consistent patterns defined here, not through a framework's scaffolding.

**Terminal-centric data model.** Every piece of data belongs to a terminal. All queries, views, and
business logic are scoped to one or more terminals. There are no "global" records except system
configuration and corporate user roles.

**Shared Zod schemas are the source of truth.** All types — database shapes, API request/response
bodies, form validation — are derived from Zod schemas in `/shared/types`. If the schema changes,
everything downstream should break loudly at compile time.

**Explicit over implicit.** Routes are declared explicitly. No auto-generated REST endpoints. No magic
hooks. If behavior happens, it is visible in the code that calls it.

**Flat over nested.** Prefer a plain function over a class. Prefer a module over a class hierarchy.
Only use classes when encapsulating stateful lifecycle (e.g., a WebSocket connection manager).

---

## Tech Stack

### Backend
- **Runtime**: Node.js (current LTS), TypeScript
- **HTTP Server**: Fastify — use its built-in schema validation with Zod via `fastify-type-provider-zod`
- **Database**: PostgreSQL via `postgres` (node-postgres) — no ORM. Write explicit SQL. Use parameterized
  queries always.
- **Real-time**: Socket.io — used for dispatch board updates, driver status changes, HOS alerts
- **Auth**: JWT (access token) + refresh token stored in httpOnly cookie. Hand-rolled, no auth library.
- **Session**: Stateless JWT for API; Geotab sessions managed separately per user in a server-side cache.

### Frontend
- **Framework**: Vue 3 with Composition API and `<script setup>` syntax
- **Build**: Vite
- **State**: Pinia — one store per domain (auth, terminal, dispatch, fleet)
- **HTTP**: Native `fetch` wrapped in a thin typed client — no Axios
- **Styling**: Tailwind CSS
- **Real-time**: Socket.io client

### Shared
- `/shared/types` — Zod schemas and inferred TypeScript types, imported by both frontend and backend
- `/shared/constants` — Enums, role definitions, status codes

### Testing
- **Vitest** for all testing (unit and integration)
- **Supertest** for HTTP route integration tests against the Fastify instance
- Each domain agent writes tests alongside implementation — tests are not a separate phase

---

## Project Structure

```
/
├── CLAUDE.md
├── legacy/                  # Previous FeathersJS implementation — reference only
├── shared/
│   ├── types/               # Zod schemas → TypeScript types (source of truth)
│   └── constants/           # Enums, roles, status values
├── backend/
│   ├── src/
│   │   ├── server.ts        # Fastify instance creation and plugin registration
│   │   ├── routes/          # One file per domain (auth, terminals, fleet, dispatch, etc.)
│   │   ├── services/        # Business logic, called by routes
│   │   ├── db/
│   │   │   ├── client.ts    # postgres connection pool
│   │   │   ├── migrations/  # SQL migration files, numbered sequentially
│   │   │   └── queries/     # SQL query functions, one file per domain
│   │   ├── geotab/          # All Geotab API interaction isolated here
│   │   ├── auth/            # JWT generation, verification, middleware
│   │   ├── realtime/        # Socket.io server setup and event handlers
│   │   └── middleware/      # Role checks, terminal scoping, request logging
│   └── test/
│       └── routes/          # Integration tests per route file
├── frontend/
│   ├── src/
│   │   ├── main.ts
│   │   ├── App.vue
│   │   ├── router/          # Vue Router, guards for auth and role checks
│   │   ├── stores/          # Pinia stores, one per domain
│   │   ├── views/           # Page-level components, one per route
│   │   ├── components/      # Reusable UI components
│   │   ├── api/             # Typed fetch wrappers for each backend domain
│   │   └── realtime/        # Socket.io client setup and composables
│   └── test/
└── package.json             # Workspace root (npm workspaces)
```

---

## Data Model Overview

### Core Entities
- **Terminal** — the organizational unit everything belongs to
- **User** — has one or more roles; each role is scoped to a terminal (or all terminals for corporate roles)
- **Driver** — belongs to a terminal; classified as W2 or Contract
- **Vehicle** — belongs to a terminal; mapped to a Geotab device ID
- **Route** — pre-planned dealership delivery route; belongs to a terminal
- **HolidayCalendar** — terminal-level calendar of non-operating days
- **DispatchEvent** — a driver assigned to a route on a specific date
- **Alert** — HOS violation, appointment deviation, or schedule issue; requires acknowledgment

### Terminal-Scoping Rule
Every database query that returns operational data **must** include a `terminal_id` filter. The terminal
context comes from the authenticated user's session. Services receive `terminalId` as an explicit
parameter — they do not read it from a global context.

### Role Model
Terminal-level roles (scoped to one terminal):
- `dispatcher` — monitors routes, communicates with drivers, acknowledges alerts
- `team_lead` — dispatcher + can reassign drivers within a terminal
- `terminal_manager` — full terminal access including driver/vehicle assignment

Corporate roles (apply to all terminals):
- `equipment_manager`
- `safety_manager`
- `compliance_manager`
- `operations_management`

System-level:
- `system_admin` — full access, user management, system configuration

Users may hold multiple roles. A corporate role does not override terminal-level permission checks —
both are evaluated. Role definitions live in `/shared/constants/roles.ts`.

---

## Geotab Integration

All Geotab API calls are isolated in `/backend/src/geotab/`. Nothing outside this directory imports
from Geotab directly.

**Authentication**: Geotab sessions are per-user. When a user authenticates with Geotab credentials
(stored in the app), a Geotab session token is obtained and cached server-side, keyed by user ID.
Geotab data returned is filtered by what the user's Geotab account has permission to see.

**Caching strategy** (tiered):
- Memory cache: 24-hour TTL for infrequently changing data (vehicle list, driver list)
- Weekly snapshots: 5 versions retained
- Monthly snapshots: 12 months retained
- Yearly snapshots: indefinite

**Real-time data** (do not cache):
- Current vehicle GPS position
- ETA to next stop
- Current HOS status

**Key data consumed from Geotab**:
- Vehicle location and movement
- ETA calculations for next appointment stop
- Hours of Service (HOS) records and violation flags
- Route deviation detection

---

## Coding Style

**Readable over clever.** Code should be understandable to someone who did not write it. Avoid
abbreviations, one-letter variables (except loop indices), and chained operations that obscure intent.

**Comments explain why, not what.** Do not comment on what code does — the code should say that.
Comment when there is a non-obvious business rule, external constraint, or gotcha.

**TypeScript strictly.** `strict: true` in tsconfig. No `any`. Infer types from Zod schemas using
`z.infer<typeof MySchema>` rather than writing types manually.

**Error handling is explicit.** Do not swallow errors. Backend route handlers return structured error
responses using a consistent shape. Frontend handles errors at the call site, not globally.

**No barrel files** (`index.ts` that re-exports everything). Import directly from the file that defines
the thing.

**SQL is written as SQL.** No query builders. Queries live in `/backend/src/db/queries/`, are named
clearly, and accept typed parameters. Each query function returns a typed result inferred from the
Zod schema for that entity.

---

## Multi-Agent Development Approach

This project is built using Claude Code agents with isolated git worktrees. The development sequence is:

1. **Review Agent** — reads `legacy/` and produces `/docs/legacy-findings.md`: business logic to
   preserve, data shapes, Geotab patterns, and what to discard
2. **Schema Agent** — produces `/shared/types` and `/backend/src/db/migrations/001_initial.sql`;
   all other agents depend on this output and should not modify shared types unilaterally
3. **Auth Agent** — user management, JWT, role middleware
4. **Terminal & Fleet Agent** — terminal CRUD, driver management, vehicle management
5. **Geotab Agent** — all Geotab API integration, caching layer, real-time data pipeline
6. **Dispatch Agent** — dispatch board, alert system, acknowledgment workflow, Socket.io events
7. **Reporting Agent** — route history, HOS reports, audit logs, billing summaries
8. **Test Agent** — integration test suite; runs against each agent's output after merge

Each agent works in its own worktree branch. No agent modifies `/shared/types` without coordinating
with the schema agent. When in doubt, open a placeholder type and flag it for schema agent review.

---

## What to Avoid

- Do not use FeathersJS, NestJS, Adonis, or any opinionated backend framework
- Do not use an ORM (Sequelize, TypeORM, Prisma) — write SQL directly
- Do not use Axios — use the typed fetch wrapper in `/frontend/src/api/`
- Do not generate REST endpoints automatically — declare every route explicitly
- Do not write classes for things that are just a bag of functions — use a module
- Do not put business logic in route handlers — routes call services, services contain logic
- Do not read terminal context from a global — pass `terminalId` explicitly to every service call
- Do not write a test as an afterthought — tests are written alongside the feature

---

## Definition of Done (per feature)

- [ ] Zod schema exists in `/shared/types` and is used for both validation and TypeScript types
- [ ] SQL migration exists if schema changed
- [ ] Route handler is declared explicitly with typed request/response
- [ ] Service function contains the business logic, not the route handler
- [ ] Terminal scoping is enforced — every query includes `terminal_id` where applicable
- [ ] Role check middleware is applied to the route
- [ ] At least one integration test covers the happy path and one covers an auth/role failure
- [ ] No `any` types, no disabled lint rules
