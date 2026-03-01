# Dispatch Prime Green

Shipping dispatch web application for a contracted trucking company. Dispatchers monitor drivers, manage appointment timing, flag HOS issues, and communicate with drivers and customers. All data is scoped to individual shipping terminals.

## Project Status

| Layer | Status | Notes |
|-------|--------|-------|
| **Shared types** | Complete | 17 Zod schemas, compiled and exported |
| **Database schema** | Complete | 15 tables in `001_initial.sql` |
| **Backend API** | Complete | 14 route domains, 14 services, 16 query modules |
| **Auth & middleware** | Complete | JWT, bcrypt, role checks, terminal scoping |
| **Geotab integration** | Complete | API client, encrypted credentials, caching |
| **Backend tests** | 196 passing | 19 test files (unit + integration) |
| **Frontend** | Scaffolded | Login page works; dispatch board and other views not yet built |

## Prerequisites

- **Node.js** >= 22.0.0 (LTS)
- **PostgreSQL** >= 15
- **npm** (ships with Node)

## Setup

### 1. Clone and install dependencies

```bash
git clone <repo-url> dispatchPrimeGreen
cd dispatchPrimeGreen
npm install
```

### 2. Create the database

```bash
# Connect to your Postgres instance and create the database
psql -U postgres -c "CREATE DATABASE dispatch_prime;"
```

### 3. Apply the schema migration

```bash
psql -U postgres -d dispatch_prime -f backend/src/db/migrations/001_initial.sql
```

This creates all 15 tables: terminals, users, drivers, vehicles, routes, route_stops, dispatch_events, dispatch_event_stops, alerts, availability, route_substitutions, equipment, holiday_calendar, audit_logs, and geotab_sessions.

### 4. Configure environment variables

```bash
cp .env.example .env
```

Edit `.env` with your values:

```
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/dispatch_prime
JWT_SECRET=a-secure-random-string-at-least-32-characters
REFRESH_TOKEN_SECRET=a-different-secure-random-string-at-least-32-characters
PORT=3031
```

The backend reads `DATABASE_URL` for Postgres and `JWT_SECRET` / `REFRESH_TOKEN_SECRET` for auth tokens. `PORT` defaults to 3031.

### 5. Build the shared types

```bash
npm run build -w shared
```

Both backend and frontend depend on `@dispatch/shared` — this must be built first.

### 6. Seed a test user (optional)

There is no seed script yet, but you can register a user through the API once the backend is running:

```bash
curl -X POST http://localhost:3031/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "YourPassword123!",
    "firstName": "Admin",
    "lastName": "User"
  }'
```

Then promote to `system_admin` in the database:

```bash
psql -U postgres -d dispatch_prime -c \
  "UPDATE users SET roles = '{system_admin}' WHERE email = 'admin@example.com';"
```

You'll also want at least one terminal:

```bash
psql -U postgres -d dispatch_prime -c \
  "INSERT INTO terminals (name, slug, city, state, timezone)
   VALUES ('Main Terminal', 'main', 'Dallas', 'TX', 'America/Chicago');"
```

## Running

### Start the backend

```bash
npm run dev:backend
```

The Fastify server starts on `http://localhost:3031` with hot reload (tsx watch). You should see `Server listening at http://0.0.0.0:3031` in the logs. Hit the health check to verify:

```bash
curl http://localhost:3031/health
# {"status":"ok"}
```

### Start the frontend

```bash
npm run dev:frontend
```

Vite dev server starts on `http://localhost:5173` and proxies `/api` requests to the backend at `localhost:3031`. The login page is functional — other views are placeholder scaffolding.

### Run both

Open two terminal windows and run `npm run dev:backend` and `npm run dev:frontend` separately.

## Testing

```bash
# Run all backend tests
npm test

# Run just backend tests
npm run test -w backend

# Run a specific test file
npx vitest run backend/test/routes/alerts.test.ts

# Type-check all workspaces
npm run typecheck
```

Tests use mocked database queries and do not require a running Postgres instance.

## API Overview

All endpoints are prefixed with `/api`. Auth-protected routes require a `Bearer` token in the `Authorization` header. Terminal-scoped routes require an `X-Terminal-Id` header or `terminalId` param.

| Domain | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `POST /auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout` | Registration, login, JWT refresh, logout |
| Users | `GET/PATCH /users/me` | Current user profile |
| Terminals | CRUD under `/terminals` | Terminal management |
| Drivers | CRUD under `/terminals/:terminalId/drivers` | Driver management, bench drivers |
| Vehicles | CRUD under `/terminals/:terminalId/vehicles` | Vehicle management |
| Equipment | CRUD under `/equipment` | Equipment tracking |
| Routes | CRUD under `/terminals/:terminalId/routes` | Route definitions and stops |
| Dispatch | CRUD under `/terminals/:terminalId/dispatch` | Dispatch events and stop tracking |
| Alerts | CRUD under `/terminals/:terminalId/alerts` | HOS violations, appointment alerts |
| Availability | CRUD under `/drivers/:driverId/availability` | Driver PTO/availability windows |
| Substitutions | CRUD under `/routes/:routeId/substitutions` | Temporary route overrides |
| Reporting | `GET /reports/*` | Route history, HOS, billing, audit logs |
| Geotab | `POST /geotab/auth`, `GET /geotab/*` | Geotab session and data access |
| Health | `GET /health` | Server health check |

## Project Structure

```
shared/types/          Zod schemas (source of truth for all types)
shared/constants/      Role definitions, status enums
backend/src/routes/    Fastify route handlers (one file per domain)
backend/src/services/  Business logic (called by routes)
backend/src/db/        Postgres client, migrations, typed SQL queries
backend/src/auth/      JWT generation/verification, password hashing
backend/src/middleware/ authenticate, authorize (role), terminal-scope
backend/src/geotab/    All Geotab API interaction (isolated)
backend/src/realtime/  Socket.io server setup
frontend/src/          Vue 3 app (scaffolded, minimal UI)
legacy/                Previous FeathersJS implementation (reference only)
docs/                  Legacy findings and architecture notes
```

See `CLAUDE.md` for full architecture guide, coding conventions, and role definitions.
