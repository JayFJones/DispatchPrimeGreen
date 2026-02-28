# DispatchPrime — Project Catchup

> **Last reviewed:** February 2026
> Purpose: Quick re-orientation after time away. Covers current state, what's working, what's broken, and a beta gameplan.

---

## What This App Is

A full-stack day-of-dispatch management system for a trucking/delivery operation (Lanter). The core loop is:

1. **Routes** are pre-defined runs tied to terminals (e.g., `KYLO.LOU.LND`)
2. Each route has a **default driver and truck**
3. Every day, a dispatcher opens the **Operations Hub**, confirms assignments, handles substitutions, and monitors route progress
4. Geotab GPS integration provides real-time telemetry and trip history
5. Terminals are matched to Geotab **groups** (e.g., "Louisville KY"), which ties drivers and fleet to a terminal

---

## Stack

| Layer | Tech |
|---|---|
| Backend | FeathersJS + Koa, MongoDB, TypeBox schemas |
| Frontend | Vue 3, Vuetify 3, Pinia, Vite |
| GPS | Geotab (mg-api-js) |
| Auth | JWT + Local strategy |
| DB | MongoDB (Docker) |

**Dev commands:**
```bash
# Backend (port 3031)
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run dev

# Frontend (port 3001)
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run dev
```

---

## Backend Services — Current State

| Service | Purpose | Status |
|---|---|---|
| `users` | Auth accounts | ✅ Complete |
| `terminals` | Terminal/hub definitions, group field | ✅ Complete |
| `routes` | Route definitions (trkid, stops, default driver/truck) | ✅ Complete |
| `route-stops` | Individual stop records within a route | ✅ Complete |
| `drivers` | Driver records, Geotab username, groups, license info | ✅ Complete |
| `fleet` | Vehicle records, groups, VIN, license plate | ✅ Complete |
| `customers` | Customer/stop location master data | ✅ Complete |
| `dispatched-routes` | Daily dispatch assignment per route (planning layer) | ⚠️ CRUD only, no business logic |
| `route-executions` | Stop-level execution tracking (what actually happened) | ⚠️ Partially wired — performance metrics disabled, Geotab sync disabled |
| `history` | Driver availability/status log | ✅ Complete |
| `fleet-status` | Geotab real-time GPS snapshots | ✅ Complete |
| `geotab` | All Geotab API integration (imports, trips, real-time) | ✅ Mostly complete |
| `import` / `import-preview` | Excel import pipeline | ✅ Complete |
| `activity-log` | Admin action logging | ✅ Backend complete, frontend stub |
| `users-management` | Admin user CRUD | ✅ Complete |

### ⚠️ Known Backend Bug
`syncFleetOdometers` is called from the Fleet page UI but **does not exist** in `fleet.class.ts`. Clicking "Sync Odometers" will throw a 404/method-not-found error.

---

## Frontend Pages — Current State

### Core Operational Pages

| Page | Route | Status |
|---|---|---|
| Operations Hub | `/operations-hub` | ✅ Main working screen — see details below |
| Dispatch Board | `/dispatch` | ⚠️ Terminal list works; per-terminal detail partially complete |
| Planning | `/planning` | ⚠️ Index works; `[id].vue` terminal-specific view missing save/apply |
| Terminals | `/terminals` | ✅ Filtered (no hubs, no ungrouped) |
| Terminal Detail | `/terminals/[id]` | ✅ Routes, Drivers, Fleet by group |
| Routes | `/routes` | ✅ List view complete |
| Route Detail | `/routes/[id]` | ⚠️ View works; editing incomplete |
| Drivers | `/drivers` | ✅ List with groups |
| Driver Detail | `/drivers/[id]` | ⚠️ View works; editing partially complete |
| Fleet | `/fleet` | ⚠️ View works; Sync Odometers button broken |
| Customers | `/customers` | ✅ List view complete |

### Admin Pages

| Page | Route | Status |
|---|---|---|
| Geotab Admin | `/admin/geotab` | ✅ Import Groups/Drivers/Devices, Trip Data, Real-time fleet |
| Import | `/admin/import` | ✅ Excel import pipeline |
| User Management | `/admin/users` | ✅ Complete |
| Activity Log | `/admin/activity` | ❌ UI stub — no data fetching |
| System Settings | `/admin/settings` | ❌ UI stub |
| Reports | `/reports` | ❌ UI stub |

---

## Operations Hub — Detailed State

This is the most important page and is substantially working.

### ✅ Working
- Terminal selector with home terminal + favorites
- Date navigation (prev/next/calendar)
- Active routes list per terminal per day
- Per-route driver and truck assignment/substitution
- Route status chips (planned, in-transit, completed, cancelled)
- Stop notes with badge counts
- Requires Attention alerts (driver unassigned — today/future only; driver not logged in — today only)
- Cancel routes dialog
- Route Details full-screen dialog with stop table
- Geotab trip enrichment for past dates (after recent fix)

### ⚠️ Incomplete / Stub
- `contactDriver()` — button exists, no implementation
- `viewRouteLocation()` — button exists, no map shown
- Communication Center — `communicationsList` is a stub, no backend messaging service
- `sendBroadcast()` — no backend endpoint exists for this

---

## Geotab Integration — Current State

### ✅ Working
- **Import Groups** — fetches and caches all Geotab groups with names
- **Import Drivers** — fetches and caches all Geotab drivers with group assignments
- **Import Devices** — fetches and caches all Geotab devices/trucks with group assignments
- **Update Database** — syncs groups/names to local drivers and fleet; creates new fleet/driver entries for active Geotab records with correct group names (not IDs)
- **Trip Data** — loads 24-hour trip records, enriched with cached driver/device data (full names, truck numbers, groups)
- **Real-time Fleet** — polls fleet GPS every 10 minutes when authenticated
- **Auto-cache on page load** — Groups, Drivers, Devices load automatically when admin/geotab page is opened

### ⚠️ Limitations
- **Credentials reset on server restart** — Geotab auth is in-memory only; after any backend restart you must re-authenticate via the admin panel
- **Automatic polling disabled** — real-time fleet polling requires active Geotab session; cannot run as a background daemon

### Data Flow: Geotab → Local DB
```
Import Groups → groupDataCache (in-memory)
Import Drivers → driverDataCache (in-memory)
Import Devices → deviceDataCache (in-memory)

Update Database:
  - Matches drivers by Geotab username → patches local driver.groups (names, not IDs)
  - Creates new driver if not found (active only, has driverGroups)
  - Matches fleet by truckNumber → patches fleet.groups + VIN + licensePlate + licenseState
  - Creates new fleet entry if not found (active only, has "Vehicle" in groups)
```

### Terminal ↔ Group Relationship
Terminals have a `group` field (e.g., "Louisville KY"). Drivers and fleet have a `groups` array. The terminal detail page shows all drivers and fleet whose `groups` array contains the terminal's `group` value.

---

## Key Data Models (Simplified)

### Route Assignment Flow
```
Route (trkid, defaultDriverId, truckNumber, terminalId)
  └─ dispatched-routes (routeId, executionDate, assignedDriverId, assignedTruckId, status)
       └─ route-executions (same + stops[], actualTimes, geotab telemetry)
```

> **Note:** `dispatched-routes` and `route-executions` overlap significantly. `dispatched-routes` is the planning/dispatch layer (who drives what, when); `route-executions` is the operational log (what happened at each stop). The operations hub uses `dispatched-routes` as its primary data source.

### Terminal → Drivers/Fleet (New Group-Based)
```
Terminal.group = "Louisville KY"
Driver.groups = ["Louisville KY", "Vehicle", "Diesel", ...]
Fleet.groups  = ["Louisville KY", "Vehicle", "Paccar", ...]
```
`terminalId` on fleet records is being deprecated in favor of group-based matching.

---

## What's Left for Beta

### P0 — Must Fix (Blockers)
- [ ] **Fix `syncFleetOdometers`** — implement the method in `fleet.class.ts` or remove the button
- [ ] **Geotab credential persistence** — credentials should survive server restarts (store encrypted in DB or config)
- [ ] **Route execution / dispatched-routes clarity** — decide which one is the source of truth; the overlap creates confusion and potential data inconsistency

### P1 — Core Features Needed for Beta
- [ ] **Planning page `[id].vue`** — add Apply/Revert save functionality (same as index.vue)
- [ ] **Truck assignment in planning missing-assignments panel** — only driver chip is clickable
- [ ] **Route editing** — route detail page edit mode is incomplete
- [ ] **Driver detail editing** — profile editing partially complete
- [ ] **Communications** — decide if this is in scope; if yes, need a backend messages service; if no, remove the stub UI

### P2 — Quality of Life
- [ ] **`contactDriver()` and `viewRouteLocation()`** in operations hub
- [ ] **Activity Log page** — wire up the admin activity log to the `activity-log` service
- [ ] **Reports page** — at minimum a basic route completion/on-time report
- [ ] **Geotab session recovery** — auto-prompt for re-auth when session expires mid-session

### P3 — Nice to Have
- [ ] Replace `dispatched-routes.terminalId` FK with group-based matching (aligns with fleet/driver migration)
- [ ] Fleet odometer sync from Geotab trip data (distance per device per day)
- [ ] Operations hub Communication Center if in scope

---

## Suggested Beta Sprint Order

### Week 1 — Stability
1. Fix `syncFleetOdometers` (30 min)
2. Store Geotab credentials in DB (encrypted) so restarts don't break it (2-3 hrs)
3. Clarify dispatched-routes vs route-executions — pick one, deprecate the other (1 day)

### Week 2 — Planning & Dispatch Completeness
4. Planning `[id].vue` save/apply functionality
5. Truck assignment in missing-assignments panel
6. Route detail editing

### Week 3 — Operations Hub Polish
7. `contactDriver()` — at minimum show phone number dialog
8. `viewRouteLocation()` — open Google Maps link with last known GPS
9. Activity Log page wired up

### Week 4 — Beta Prep
10. Basic Reports page (route completion by terminal by day)
11. End-to-end test: import Excel → plan routes → dispatch → view results
12. User acceptance testing with actual dispatcher

---

## Quick Reference: Running the App

```bash
# 1. Start MongoDB
docker start my-mongodb

# 2. Start backend
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run dev

# 3. Start frontend
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run dev

# 4. Open browser → http://localhost:3001
# 5. Go to Admin → Geotab → Authenticate → Import Groups / Drivers / Devices
```

---

## Files to Know

| File | Why It Matters |
|---|---|
| `frontend/src/pages/operations-hub.vue` | The main dispatch screen; most critical file |
| `backend/src/services/geotab/geotab.class.ts` | All Geotab logic; ~1700 lines |
| `backend/src/services/dispatched-routes/` | Daily dispatch records |
| `backend/src/services/route-executions/` | Stop-level tracking |
| `backend/src/services/fleet/fleet.class.ts` | Fleet service (missing syncFleetOdometers) |
| `frontend/src/pages/admin/geotab.vue` | Geotab admin panel; ~3500 lines |
| `frontend/src/pages/planning/index.vue` | Route planning / assignment |
