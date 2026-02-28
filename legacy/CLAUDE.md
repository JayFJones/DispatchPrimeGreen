# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DispatchPrime is a full-stack TypeScript application for day-to-day dispatch and shipping process management. It consists of a FeathersJS backend API and a Vue.js 3 frontend with Vuetify UI components.

## Development Commands

**IMPORTANT**: Use these exact commands with full paths to avoid directory confusion.

### Backend (FeathersJS)
```bash
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm install
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run dev          # Start development server with nodemon
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run compile      # Compile TypeScript to lib/
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run start        # Start production server
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm test             # Run tests with mocha
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run prettier     # Format code
cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run bundle:client # Compile and package client for frontend linking
```

### Frontend (Vue.js 3)
```bash
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm install
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run dev          # Start Vite development server (port 3000)
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run build        # Build for production
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run type-check   # Run TypeScript compiler checks ⚠️ FRONTEND ONLY
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run lint         # Run ESLint with auto-fix
cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run preview      # Preview production build
```

### Most Common Commands (copy these exactly)
- **Type checking**: `cd /home/jfjones/DEVELOPMENT/dispatchPrime/frontend && npm run type-check`
- **Backend compilation**: `cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run compile`
- **Backend client bundle**: `cd /home/jfjones/DEVELOPMENT/dispatchPrime/backend && npm run bundle:client`

## Architecture Overview

### Backend Structure
- **Framework**: FeathersJS with Koa.js server
- **Database**: MongoDB (requires Docker: `docker run -d --name my-mongodb -p 27017:27017 -v mongodb_data:/data/db mongo`)
- **Authentication**: JWT + Local strategy with email/password
- **Transport**: REST API + WebSocket support
- **Validation**: TypeBox schema validation
- **Services**: Users service with authentication hooks

Key files:
- `src/app.ts` - Main application configuration
- `src/services/` - Service implementations
- `src/authentication.ts` - Auth configuration
- `config/default.json` - Server configuration (port 3031)

### Frontend Structure
- **Framework**: Vue.js 3 with Composition API
- **UI**: Vuetify 3 with Material Design Icons
- **State**: Pinia for state management
- **Routing**: Vue Router with file-based routing (unplugin-vue-router)
- **Build**: Vite with TypeScript support
- **Auto-imports**: Components and composables auto-imported

Key features:
- Layout system with `src/layouts/default.vue`
- Page-based routing from `src/pages/`
- Auto-generated type definitions for router and components

## Client Library Integration

The backend generates a client library that the frontend can use:

1. **Backend**: `npm run bundle:client` creates a packaged client in `public/`
2. **Link backend**: `npm link` (from backend directory)
3. **Frontend**: `npm link backend` creates symlink in `node_modules/backend`

This allows the frontend to import backend services directly with full type safety.

## Database Setup

MongoDB is required. Start with Docker:
```bash
docker run -d --name my-mongodb -p 27017:27017 -v mongodb_data:/data/db mongo
```

Default connection: `mongodb://127.0.0.1:27017/backend`

## Development Workflow

1. Start MongoDB Docker container
2. Backend: `cd backend && npm run dev` (port 3031)
3. Frontend: `cd frontend && npm run dev` (port 3001)
4. Use client library linking for type-safe backend integration

## Authentication

- Strategy: JWT + Local authentication
- User entity: `users` service
- Login field: `email` and `password`
- JWT expires in 1 day
- Auth hooks applied to protected services

## Current Status

Active development on `authWork` branch implementing authentication features.

## Backend Development Guidelines

### ⚠️ CRITICAL: FeathersJS-Only Approach
- **NEVER use Express directly** - All backend functionality must use FeathersJS service patterns
- **NO Express middleware, routes, or app.get('express')** - Use FeathersJS hooks and services instead
- **File uploads**: Use FeathersJS file upload best practices (not Express multer middleware)
- **Custom endpoints**: Create FeathersJS services with custom methods, not Express routes
- **Authentication**: Use FeathersJS authentication hooks and strategies exclusively

### Approved Patterns:
✅ FeathersJS services with hooks
✅ FeathersJS authentication and authorization
✅ TypeBox schema validation
✅ MongoDB adapter services
✅ Custom service methods within FeathersJS framework

### Forbidden Patterns:
❌ `app.get('express')` or direct Express usage
❌ Express middleware (`app.use()` with Express functions)
❌ Express routes (`express.post()`, `express.get()`, etc.)
❌ Multer or other Express-specific middleware
❌ Bypassing FeathersJS service layer
❌ `npx feathers generate service` - Interactive CLI has input handling issues

### Service Creation Guidelines:
✅ Create new services manually using existing services as templates
✅ Copy service directory structure from similar existing service
✅ Update schema, class, and hooks files appropriately
✅ Register service in services/index.ts manually

## FeathersJS Query Patterns

### ⚠️ CRITICAL: Query Limitations and Workarounds
Some FeathersJS query operators may not work as expected with this MongoDB configuration. Use these patterns instead:

### Loading Multiple Records by ID
**❌ Avoid `$in` queries - they may fail:**
```javascript
// This pattern may not work reliably
const response = await feathersClient.service('drivers').find({
  query: { _id: { $in: [id1, id2, id3] }, $limit: 1000 }
})
```

**✅ Use individual `get()` calls in a loop:**
```javascript
// Use this pattern instead
const loadMultipleDrivers = async (driverIds: string[]) => {
  const drivers = []
  for (const driverId of driverIds) {
    try {
      const driver = await feathersClient.service('drivers').get(driverId)
      drivers.push(driver)
    } catch (error) {
      console.error(`Failed to load driver ${driverId}:`, error)
    }
  }
  return drivers
}
```

### Safe Query Patterns
**✅ Simple field queries work reliably:**
```javascript
// These patterns are safe to use
const routes = await feathersClient.service('routes').find({
  query: { terminalId: 'some-id', $limit: 1000 }
})

const history = await feathersClient.service('history').find({
  query: { historyType: 'availability', $limit: 1000 }
})
```

**✅ Single record lookups work reliably:**
```javascript
// Direct get() calls are the most reliable
const driver = await feathersClient.service('drivers').get(driverId)
const route = await feathersClient.service('routes').get(routeId)
```

### Performance Notes
- Individual `get()` calls are slower than bulk queries but more reliable
- Future optimization may replace individual calls with working bulk patterns
- Always include error handling for individual record lookups
- Consider implementing caching patterns for frequently accessed data

## Git Workflow Guidelines

### ⚠️ CRITICAL: Git Commands Require Explicit Permission
- **NEVER perform git commits without explicit user request**
- **DO NOT automatically stage, commit, or push changes**
- **ONLY perform git operations when the user specifically asks**
- **ALWAYS wait for user permission before any git workflow steps**

Examples of what to wait for:
- "Please commit these changes"
- "Stage and commit this work"
- "Create a commit with message X"

## Geotab Integration Guidelines

### ⚠️ CRITICAL: Geotab API Best Practices
When implementing Geotab integration, follow these patterns:

### Required Package:
- **ALWAYS use `mg-api-js`** - Official Geotab API library for Node.js
- **NEVER use axios or custom HTTP clients** for Geotab API calls

### Authentication Pattern:
```javascript
import api from 'mg-api-js'

// Authenticate and get session
const session = await api.authenticate(userName, password, database)
// session contains: { credentials: { database, sessionId, userName }, path }
```

### API Call Patterns:
```javascript
// Single API call
const devices = await api.call('Get', {
  typeName: 'Device',
  resultsLimit: 1000
}, session.credentials, session.path)

// Multiple calls (more efficient)
const calls = [
  ['Get', { typeName: 'Device' }],
  ['Get', { typeName: 'User' }]
]
const results = await api.multiCall(calls, session.credentials, session.path)
```

### Session Management:
- ✅ Sessions expire after 14 days
- ✅ Maximum 100 concurrent sessions per user  
- ✅ Store sessionId and path for subsequent calls
- ✅ Handle InvalidUserException for expired sessions
- ✅ Re-authenticate when sessions expire

### Data Handling:
- ✅ Use metric units (km/h, meters) - Geotab default
- ✅ Convert dates to UTC ISO 8601 format
- ✅ Implement pagination for large datasets (resultsLimit: 500-1000)
- ✅ Use MultiCall for efficiency with multiple requests

### Error Handling:
```javascript
try {
  const result = await api.call(method, params, credentials, path)
  if (result.error) {
    // Handle API-level errors
    throw new Error(result.error.message)
  }
} catch (error) {
  // Handle network/authentication errors
  if (error.name === 'InvalidUserException') {
    // Re-authenticate
  }
}
```

### Security Requirements:
- ✅ Use TLS v1.2 or higher
- ✅ Store credentials securely (never in plain text)
- ✅ Implement proper session cleanup on logout
- ✅ Use AES-256 cipher suites

## Source Data
The directory `sData` contains spreadsheets and other data used in the initial formation and testing of the program.
