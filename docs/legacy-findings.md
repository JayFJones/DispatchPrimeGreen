# Legacy Codebase Findings

Review of the FeathersJS + MongoDB + Vue 3 implementation in `/legacy/`.
Produced for the greenfield Fastify + PostgreSQL rebuild.

---

## 1. Business Logic to Preserve

### 1.1 Terminal-Centric Data Model

Everything is scoped to a terminal. Terminals map to Geotab groups via a `group` field (Geotab group ID). Drivers and vehicles belong to terminals through shared Geotab group membership.

**Filtering rule**: A driver or vehicle belongs to a terminal if their `groups` array contains the terminal's `group` value.

This is the single most important architectural invariant. The legacy system relies on client-side discipline to enforce it — the rebuild must enforce it at the query/middleware layer.

### 1.2 Daily Dispatch Workflow

The dispatcher's daily loop:

1. Open Operations Hub, select a terminal
2. Review pre-planned routes for the day (routes have weekly schedules — `sun/mon/tue/...` booleans)
3. Confirm or substitute driver/truck assignments
4. Monitor real-time route progress via Geotab GPS
5. Flag HOS violations and schedule deviations
6. Communicate with drivers and customers (stubbed in legacy, not built)

Route statuses: `planned` → `assigned` → `dispatched` → `in-transit` → `completed` | `cancelled` | `delayed`

### 1.3 Route Estimation Calculations

File: `legacy/backend/src/services/routes/routes-hooks.ts` and `legacy/frontend/src/utils/route-estimations.ts`

- **Haversine distance**: Earth radius 3959 miles. Used for terminal-to-first-stop, stop-to-stop, and last-stop-to-terminal segments.
- **Duration fallback**: When actual ETA/ETD are unavailable, estimate at 48 mph average speed.
- **Day rollover handling**: Routes that cross midnight are handled within a 24-hour window.
- Calculates: `totalStops`, `estimatedDuration` (minutes), `estimatedDistance` (miles, round-trip including terminal legs).

### 1.4 Route Substitutions

Temporary overrides to a route's default driver, truck, or sub-unit for a date range. Stored separately from the route definition. Fields: `routeId`, `startDate`, `endDate`, `driverId`, `truckNumber`, `subUnitNumber`, `scanner`, `fuelCard`, `reason`, `notes`.

Long-term substitutions are distinct from single-day assignments. The planning store tracks pending changes in session storage before committing.

### 1.5 Route Execution Tracking

Each stop in a route execution tracks:
- Planned vs actual arrival/departure times
- On-time status: early | on-time (<=15 min late) | delayed (<=30 min) | late
- Geotab telemetry: lat/lng, odometer, fuel used
- Arrival detection: within 100 meters of stop coordinates
- Auto status transitions: `scheduled` → `in-progress` (first stop arrived) → `completed` (all stops done) | `exception`
- Performance metrics: on-time percentage, total service time

### 1.6 User Activity Tracking

Tracks: LOGIN, LOGOUT, FAILED_LOGIN, PROFILE_UPDATE, PASSWORD_CHANGE. Captures IP address (from X-Forwarded-For, X-Real-IP, X-Client-IP, CF-Connecting-IP headers), user agent, and metadata. Updates `user.lastLoggedIn` on successful login.

### 1.7 Data Import Pipeline

Supports three Excel import formats:
1. **terminal-routes** — terminal and route data
2. **lanter-endpoints** — multi-sheet: customers, terminals, routes, stops
3. **driver-board** — driver and truck assignment data

Import flow: preview (validate structure) → process (create/update records). Generates URL-compliant terminal names, parses city/state formats, tracks processing summaries with counts and warnings.

### 1.8 Role Model

Terminal-level: `DISPATCHER`, `TERMINAL_MANAGER`
Corporate-level: `OPERATIONS_MANAGER`
System: `ADMIN`
Special: `DRIVER`, `DASHBOARD`

Users can hold multiple roles. The legacy system checks roles but does not scope them to specific terminals — a `DISPATCHER` role applies globally. The rebuild should scope terminal-level roles to specific terminals per the new CLAUDE.md design.

### 1.9 Driver Availability

Tracks windows of availability/unavailability per driver: `startDate`, `endDate`, `availabilityType` (Available, Not Available, PTO, Vacation, Sick, Personal), `reason`, `notes`. Used by the planning view to flag routes that need driver reassignment.

---

## 2. Data Shapes

All shapes below are from the legacy TypeBox schemas. These must be converted to Zod for the rebuild. PostgreSQL column types are suggested.

### 2.1 Terminal

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| name | string | text NOT NULL | Hub display name (e.g., "CHICAGO DOCK") |
| agent | string | text | Full agent field (e.g., "TOMASEK-CHICAGO") |
| dcp | string | text | |
| cName | string | text UNIQUE | URL-compliant slug |
| city | string | text | |
| state | string | text | |
| streetAddress | string | text | |
| streetAddress2 | string | text | |
| zip | string | text | |
| country | string | text | |
| latitude | number | numeric(10,7) | |
| longitude | number | numeric(10,7) | |
| timeZone | string | text | IANA timezone |
| group | string | text | Geotab group ID — critical for scoping |
| terminalType | enum | text CHECK | 'terminal' or 'hub' |
| worklist | string | text | |
| bench | string[] | text[] or join table | Array of driver IDs on the bench |
| leaders | object[] | jsonb | Array of {name, title} |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.2 User

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| email | string | text UNIQUE NOT NULL | Login identifier |
| password | string | text NOT NULL | Hashed, never exposed externally |
| firstName | string | text | |
| lastName | string | text | |
| roles | string[] | text[] or join table | Array of role names |
| homeTerminalId | ObjectId | uuid FK | Default terminal |
| favoriteTerminalIds | ObjectId[] | uuid[] or join table | Quick-switch terminals |
| lastLoggedIn | DateTime | timestamptz | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.3 Driver

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| firstName | string | text | |
| lastName | string | text | |
| dob | string | date | |
| driverId | string | text | Employee number (from import/Geotab employeeNo) |
| geotab | string | text | Geotab username — used for Geotab↔DB linkage |
| licenseNumber | string | text | |
| licenseState | string | text | |
| licenseType | string | text | CDL type |
| licenseExpDate | string | date | |
| status | string | text | "Hired", "On Leave", etc. |
| workerClassification | string | text CHECK | 'W2' or 'Contract' |
| operatingAuthority | string | text | |
| hireDate | string | date | |
| terminationDate | string | date | |
| rehireDate | string | date | |
| primaryPhone | string | text | |
| drivingExperience | string | text | |
| cdlDrivingExperience | string | text | |
| totalYearsExperience | string | text | |
| groups | string[] | text[] | Geotab group names — used for terminal association |
| worklist | string | text | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.4 Fleet (Vehicle)

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| truckID | string | text NOT NULL | Display name (e.g., "Truck001") |
| terminalId | ObjectId | uuid FK | Being deprecated; use groups for association |
| vin | string | text | |
| licensePlate | string | text | |
| licenseState | string | text | |
| odometer | number | numeric | Current reading in km |
| lastLocationLatitude | number | numeric(10,7) | |
| lastLocationLongitude | number | numeric(10,7) | |
| vehicleType | enum | text CHECK | 'ST' (straight), 'TT' (tractor-trailer), '??' |
| lastLocationUpdated | DateTime | timestamptz | |
| status | enum | text CHECK | active, inactive, maintenance, out-of-service |
| notes | string | text | |
| groups | string[] | text[] | Geotab group names |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.5 Equipment

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| equipmentNumber | string | text | |
| equipmentType | enum | text CHECK | truck, trailer, sub-unit |
| status | enum | text CHECK | active, inactive, maintenance, retired |
| equipmentStatus | enum | text CHECK | dedicated, substitute, spare, out-of-service |
| truckType | string | text | |
| make | string | text | |
| model | string | text | |
| year | string | text | |
| vin | string | text | |
| licensePlate | string | text | |
| registrationState | string | text | |
| registrationExpiry | string | date | |
| insurancePolicy | string | text | |
| insuranceExpiry | string | date | |
| lastMaintenanceDate | string | date | |
| nextMaintenanceDate | string | date | |
| mileage | number | numeric | |
| fuelType | string | text | |
| capacity | string | text | |
| notes | string | text | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.6 Customer

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| cid | string | text UNIQUE | Customer identifier from import |
| name | string | text | Dealership name |
| address | string | text | |
| city | string | text | |
| state | string | text | |
| zipCode | string | text | |
| latitude | number | numeric(10,7) | |
| longitude | number | numeric(10,7) | |
| timeZone | string | text | |
| openTime | string | time | Business hours |
| closeTime | string | time | |
| lanterID | string | text | |
| customerPDC | string | text | |
| geoResult | string | text | Geocoding result status |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.7 Route

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| trkid | string | text UNIQUE | Route identifier (e.g., "ALBE.BES.1") |
| terminalId | ObjectId | uuid FK NOT NULL | |
| legNumber | string | text | |
| truckNumber | string | text | Default truck |
| subUnitNumber | string | text | |
| defaultDriverId | string | text | Default driver ID |
| fuelCard | string | text | |
| scanner | string | text | |
| departureTime | string | time | Planned departure |
| sun/mon/tue/wed/thu/fri/sat | boolean | boolean | Weekly schedule flags |
| totalStops | number | integer | Calculated from stops |
| estimatedDuration | number | numeric | Minutes, calculated |
| estimatedDistance | number | numeric | Miles, calculated |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.8 RouteStop

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| routeId | ObjectId | uuid FK NOT NULL | |
| customerId | ObjectId | uuid FK | |
| sequence | number | integer NOT NULL | Order in route |
| cid | string | text | Customer ID (denormalized) |
| custName | string | text | Customer name (denormalized) |
| address/city/state/zipCode | string | text | Denormalized from customer |
| latitude | number | numeric(10,7) | |
| longitude | number | numeric(10,7) | |
| eta | string | time | Estimated time of arrival |
| etd | string | time | Estimated time of departure |
| commitTime | string | text | |
| fixedTime | string | text | Delivery window |
| cube | string | text | |
| timeZone | string | text | |
| openTime | string | time | Customer hours (denormalized) |
| closeTime | string | time | |
| lanterID | string | text | |
| customerPDC | string | text | |
| geoResult | string | text | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

**Note**: RouteStop denormalizes customer data intentionally — the stop-level values are the source of truth, not the customer record. A customer's address at the time of route creation is what matters for that route.

### 2.9 DispatchedRoute

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| routeId | ObjectId | uuid FK NOT NULL | |
| terminalId | ObjectId | uuid FK NOT NULL | |
| executionDate | string | date NOT NULL | YYYY-MM-DD |
| assignedDriverId | ObjectId | uuid FK | |
| assignedTruckId | string | text | |
| assignedSubUnitId | string | text | |
| status | enum | text CHECK | planned, assigned, dispatched, in-transit, completed, cancelled, delayed |
| priority | enum | text CHECK | normal, high, urgent |
| plannedDepartureTime | string | time | |
| actualDepartureTime | DateTime | timestamptz | |
| estimatedReturnTime | string | time | |
| actualReturnTime | DateTime | timestamptz | |
| estimatedDelayMinutes | number | integer | |
| dispatchNotes | string | text | |
| operationalNotes | string | text | |
| lastLocationUpdate | DateTime | timestamptz | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.10 RouteExecution

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| routeId | ObjectId | uuid FK | |
| terminalId | ObjectId | uuid FK | |
| executionDate | string | date | |
| assignedDriverId | string | text | |
| assignedTruckNumber | string | text | |
| status | enum | text CHECK | scheduled, in-progress, completed, cancelled, exception |
| cancellationReason | string | text | |
| cancellationNotes | string | text | |
| plannedDepartureTime | string | time | |
| actualDepartureTime | DateTime | timestamptz | |
| estimatedCompletionTime | DateTime | timestamptz | |
| actualCompletionTime | DateTime | timestamptz | |
| totalMiles | number | numeric | |
| totalServiceTime | number | numeric | Minutes |
| fuelUsed | number | numeric | |
| onTimePerformance | number | numeric | Percentage |
| lastGeotabSync | DateTime | timestamptz | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

**RouteExecution.stops** (child rows or jsonb):

| Field | Type | Notes |
|-------|------|-------|
| stopId | uuid FK | References route_stop |
| sequence | integer | |
| plannedETA | time | |
| plannedETD | time | |
| actualArrivalTime | timestamptz | |
| actualDepartureTime | timestamptz | |
| serviceTime | numeric | Minutes |
| status | text CHECK | pending, arrived, completed, skipped, exception |
| onTimeStatus | text CHECK | early, on-time, late |
| latitude | numeric | From Geotab |
| longitude | numeric | From Geotab |
| odometer | numeric | From Geotab |
| fuelUsed | numeric | From Geotab |
| notes | text | |
| exceptionReason | text | |
| skipReason | text | |
| showInAttention | boolean | Flags for dispatcher attention |

**Decision needed**: DispatchedRoute and RouteExecution overlap significantly. Legacy CATCHUP.md flags this as a P0 issue. Recommendation: merge into a single `dispatch_events` table with an `execution_stops` child table.

### 2.11 RouteSubstitution

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| routeId | ObjectId | uuid FK NOT NULL | |
| startDate | string | date NOT NULL | |
| endDate | string | date NOT NULL | |
| driverId | string | text | Substitute driver |
| truckNumber | string | text | Substitute truck |
| subUnitNumber | string | text | |
| scanner | string | text | |
| fuelCard | string | text | |
| routeStopsModifications | string | jsonb | Encoded stop changes |
| reason | string | text | |
| createdBy | string | text | |
| notes | string | text | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.12 Availability

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| driverId | ObjectId | uuid FK NOT NULL | |
| startDate | string | date | |
| endDate | string | date | |
| availabilityType | enum | text CHECK | Available, Not Available, PTO, Vacation, Sick, Personal |
| reason | string | text | |
| notes | string | text | |
| userId | ObjectId | uuid FK | Who created the record |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.13 History (Audit)

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| historyType | enum | text CHECK | availability, customer_contact, route_change, truck_maintenance, driver_contact, system_change |
| entityType | enum | text CHECK | driver, customer, route, truck, terminal, system |
| entityId | string | uuid | Polymorphic reference |
| timestamp | DateTime | timestamptz | |
| userId | ObjectId | uuid FK | |
| userEmail | string | text | Denormalized |
| summary | string | text | Human-readable description |
| data | object | jsonb | Key-value details |
| notes | string | text | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.14 UserActivity

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| userId | ObjectId | uuid FK NOT NULL | |
| type | enum | text CHECK | LOGIN, LOGOUT, FAILED_LOGIN, PROFILE_UPDATE, PASSWORD_CHANGE |
| description | string | text | |
| ipAddress | string | text | |
| userAgent | string | text | |
| acknowledged | boolean | boolean | |
| acknowledgedAt | DateTime | timestamptz | |
| metadata | object | jsonb | |
| createdAt | DateTime | timestamptz | |

### 2.15 FleetStatus (Geotab Snapshot)

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| deviceId | string | text | Geotab device ID |
| deviceName | string | text | Truck number |
| latitude | number | numeric(10,7) | |
| longitude | number | numeric(10,7) | |
| speed | number | numeric | |
| bearing | number | numeric | |
| isDriving | boolean | boolean | |
| driverId | string | text | Geotab driver ID |
| driverInfo | object | jsonb | {id, name, firstName, lastName, employeeNo} |
| responseTimestamp | DateTime | timestamptz | |
| recordedAt | DateTime | timestamptz | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

### 2.16 Geotab (Session)

| Field | Legacy Type | PG Type | Notes |
|-------|------------|---------|-------|
| _id | ObjectId | uuid (PK) | |
| database | string | text | Geotab database name |
| username | string | text | |
| sessionId | string | text | Active session token |
| isAuthenticated | boolean | boolean | |
| lastAuthenticated | DateTime | timestamptz | |
| server | string | text | Geotab server URL |
| authExpiry | DateTime | timestamptz | |
| createdAt | DateTime | timestamptz | |
| updatedAt | DateTime | timestamptz | |

**Note**: Legacy stores this in MongoDB but credentials are only held in memory. The rebuild must encrypt and persist credentials in PostgreSQL.

---

## 3. Geotab Integration Patterns

### 3.1 API Library

Uses `mg-api-js` v3.0.0 (official Geotab Node.js SDK). Callback-based API. All calls go through a single authenticated API instance.

### 3.2 Authentication

```
Credentials: { database, userName, password }
Options: { rememberMe: true, timeout: 10 }
Result: { credentials: { sessionId, userName, database }, path: server_url }
```

Sessions expire after 14 days of inactivity. Max 100 concurrent sessions per user. The rebuild must store encrypted credentials in PostgreSQL and re-authenticate automatically when sessions expire.

### 3.3 API Methods Used

| Method | TypeName | Purpose | Cache? |
|--------|----------|---------|--------|
| Get | Device | Vehicle master data (name, VIN, plate, groups) | Yes (1h) |
| Get | DeviceStatusInfo | Real-time GPS, speed, bearing, isDriving | No (real-time) |
| Get | User | Driver roster (name, employeeNo, groups) | Yes (1h) |
| Get | Group | Organizational hierarchy (name, parent, children) | Yes (1h) |
| GetFeed | Trip | Historical trip data (device, driver, distance, times) | Yes (by date) |
| Get | ExceptionEvent | HOS violations (rule, duration, distance, device, driver) | No |

### 3.4 MultiCall Pattern

Batch multiple API calls into a single HTTP request:
```
calls = [
  ['Get', { typeName: 'Device', resultsLimit: 1000 }],
  ['Get', { typeName: 'User', resultsLimit: 1000 }],
  ['Get', { typeName: 'Group', resultsLimit: 1000 }]
]
api.multiCall(calls, successCallback, errorCallback)
```

Use multiCall whenever fetching multiple entity types simultaneously. Reduces round-trips and avoids rate limits.

### 3.5 Caching Strategy

**Memory cache** (lost on restart):
- Fleet data: 15-minute staleness threshold
- Driver, device, group data: 1-hour validity
- Trip data: cached by date key (e.g., "2026-02-28")
- Each cache has `version` and `lastUpdated` tracking

**Database snapshots** (FleetStatus collection):
- Written during API calls and polling
- Used as fallback when memory cache is empty
- Contains: device info, driver info, GPS, timestamps

**Feed versioning** (Trip data):
- GetFeed returns `toVersion` for pagination resume
- Allows incremental data fetching

### 3.6 Data Enrichment

The `enrichTripDataWithFleetStatus` method joins Geotab data with local DB records:

1. Build lookup maps: device ID → truck info, driver ID → driver info
2. For each trip record: attach truck number, driver name, VIN, plate, group names
3. Calculate common groups (intersection of driver groups and device groups) — this determines terminal association
4. Mark records as `enriched`, `deviceEnriched`, `driverEnriched`

### 3.7 Database Sync

The `updateDatabaseGroups` method syncs Geotab data into local records:

**Drivers**: For each active Geotab user with groups → find by Geotab username in DB → update groups (as names, not IDs). Create new driver if not found.

**Vehicles**: For each active Geotab device with "Vehicle" group designation → find by truck number in DB → update VIN, plate, groups. Create new fleet entry if not found.

Group IDs are resolved to group names using the group cache before storing.

### 3.8 Rate Limiting

Detects: OverLimitException, "API calls quota exceeded", "Maximum admitted" messages.
Response: Throttle for 1 minute, return `GEOTAB_THROTTLED` error code to client.

### 3.9 Key Geotab Data Mappings

| Geotab Field | Local Field | Entity |
|-------------|-------------|--------|
| Device.name | fleet.truckID | Vehicle |
| Device.vehicleIdentificationNumber | fleet.vin | Vehicle |
| Device.licensePlate | fleet.licensePlate | Vehicle |
| Device.groups[] | fleet.groups[] (as names) | Vehicle |
| User.name | driver.geotab | Driver |
| User.firstName/lastName | driver.firstName/lastName | Driver |
| User.employeeNo | driver.driverId | Driver |
| User.driverGroups[] | driver.groups[] (as names) | Driver |
| Group.id | terminal.group | Terminal |
| Group.name | group name in driver/fleet groups[] | All |

---

## 4. Frontend Patterns Worth Noting

### 4.1 Pages and Views

| Page | Purpose |
|------|---------|
| / | Dashboard — quick actions, system overview |
| /user-auth | Login/register split view |
| /user-profile | Profile, activity history, home terminal |
| /operations-hub | Primary dispatch workspace — terminal selector, driver/route status |
| /dispatch | Terminal list with status cards (urgent, in-transit, starting-soon, completed) |
| /dispatch/terminals/[id] | Terminal-specific route monitoring |
| /planning | Route planning, missing assignments, weekly change management |
| /routes, /routes/[id] | Route list and detail |
| /drivers, /drivers/[id] | Driver list and detail |
| /fleet | Vehicle fleet management |
| /terminals, /terminals/[id] | Terminal list and detail |
| /customers, /customers/[id] | Customer/dealership list and detail |
| /admin/* | Users, activity, Geotab config, logging, history, import |

### 4.2 Operations Hub Design

Three-panel layout (from OPERATIONS_HUB_DESIGN.md):
- **Live Dispatch**: Real-time route status, driver positions
- **Schedule**: Today's planned routes, assignments
- **Alerts**: HOS violations, unassigned drivers, schedule deviations

Terminal selection is required. Home terminal persists. Favorite terminals for quick switching.

Status indicators: active routes count, routes needing drivers, drivers not logged in.

### 4.3 Planning Store Pattern

The `planning` Pinia store tracks uncommitted changes in `sessionStorage`:
- Pending changes stored as a Map keyed by change ID
- Change types: schedule, cancel, driver-assignment, truck-assignment, combined-assignment, driver-substitution, truck-substitution
- Week-based change management with auto-generation for new weeks
- Changes are previewed before committing

This pattern (session-persisted draft state) should be preserved in the rebuild.

### 4.4 UI Framework

Legacy uses Vuetify 3 (Material Design). The rebuild specifies Tailwind CSS instead. All Vuetify component usage (v-data-table, v-dialog, v-form, etc.) must be replaced with Tailwind-styled equivalents.

### 4.5 Real-Time Events

Socket.io via FeathersJS channels. All authenticated users receive all service events (created, updated, patched, removed). No terminal-scoped channels exist — all filtering is client-side.

The rebuild should implement terminal-scoped Socket.io rooms so clients only receive events for their active terminal.

---

## 5. What to Discard

### 5.1 FeathersJS Framework

The entire FeathersJS service/hook/channel architecture is replaced. Do not carry over:
- MongoDBService class hierarchy
- FeathersJS hooks (before/after/error pattern)
- FeathersJS channel publishing
- TypeBox schema definitions (replace with Zod)
- FeathersJS authentication strategy classes
- The `feathers.ts` client configuration
- Auto-generated CRUD endpoints (declare all routes explicitly)

### 5.2 MongoDB Patterns

- ObjectId types → UUID
- Embedded arrays for relationships → proper join tables where appropriate
- Schemaless flexibility → strict PostgreSQL schemas with Zod validation
- No transactions → use PostgreSQL transactions for multi-entity operations

### 5.3 Vuetify

Replace with Tailwind CSS. Do not port Vuetify component APIs.

### 5.4 TypeBox Schemas

Replace all TypeBox (`@sinclair/typebox`) schemas with Zod. The field names and shapes are the valuable part — the schema library is not.

### 5.5 Barrel Exports and Auto-Imports

Legacy uses `unplugin-auto-import` and `unplugin-vue-components` for automatic component registration. The rebuild uses explicit imports only.

### 5.6 Global Error Handler Pattern

FeathersJS global error hook that catches everything. Replace with Fastify's structured error handling with consistent response shapes.

### 5.7 Client-Side Terminal Scoping

Legacy relies on the frontend to filter by terminal. The rebuild must enforce terminal scoping server-side in middleware/query layer.

### 5.8 Seed Data Pattern

Legacy seeds a default admin user on startup. The rebuild should use a migration or CLI command for initial setup, not runtime seeding.

### 5.9 Default Credentials in Config

Legacy has JWT secret and admin credentials in `config/default.json`. The rebuild must use environment variables for all secrets.

---

## 6. Known Issues and P0 Blockers from Legacy

From `legacy/CATCHUP.md` (Feb 2026):

1. **syncFleetOdometers missing**: Method referenced in routes but never implemented. Route-breaking bug.
2. **Geotab credentials not persisted**: Stored only in memory, lost on restart. Must encrypt and store in PostgreSQL.
3. **DispatchedRoute vs RouteExecution overlap**: Two entities tracking the same concept with different shapes. Must consolidate into one model.
4. **Communications feature**: Entirely stubbed. No backend service exists. Needs scope decision.
5. **Activity log not wired**: UI exists but doesn't fetch data from backend.

---

## 7. Recommended Schema Agent Priorities

Based on this review, the Schema Agent should:

1. Define the consolidated dispatch model (merge DispatchedRoute + RouteExecution into `dispatch_events` + `dispatch_event_stops`)
2. Scope the role model properly — roles tied to specific terminals, not global
3. Add `terminal_id` as a required FK on all operational tables
4. Design the Geotab credential storage with encryption columns
5. Create proper join tables for many-to-many relationships (user-roles-terminals, terminal-bench-drivers)
6. Keep RouteStop denormalization (stop-level customer data is source of truth)
7. Add the HolidayCalendar entity (mentioned in new CLAUDE.md but absent from legacy)
8. Add the Alert entity with acknowledgment workflow (mentioned in new CLAUDE.md, only partially present in legacy as History records)
