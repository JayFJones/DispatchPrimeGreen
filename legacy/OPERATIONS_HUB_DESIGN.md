# Operations Hub - Design Specification

## Overview
The Operations Hub is a **terminal-centric** unified workspace that consolidates the top three operational priorities into a single interface:
1. **Live Dispatch Management**
2. **Driver Login Status Monitoring**
3. **Driver Scheduling & Communications**

**CRITICAL ARCHITECTURE**: All operations are scoped to a specific terminal. Users must select a terminal to view operations data, as aggregating data across all terminals would be overwhelming and organizationally irrelevant. Each terminal operates independently with its own staff, drivers, routes, and operations.

This replaces the current fragmented workflow that requires jumping between multiple pages for core daily operations.

## Navigation Changes

### Current Sidebar Structure
```
Operations
├── Dispatch Center
├── Driver Management  
├── Terminal Operations
```

### Proposed Sidebar Structure
```
Operations
├── Operations Hub (NEW - Primary workspace)
├── Driver Management (Enhanced with real-time data)
├── Terminal Operations  
├── Route Management (Enhanced)
```

### Header Navigation Enhancement
- **Current**: T (Terminals), R (Routes), D (Drivers) icons
- **Add**: O (Operations Hub) icon as first/primary quick navigation

## Terminal Selection Architecture

### Terminal-Centric Design Principles
1. **No Cross-Terminal Data**: Operations Hub never aggregates data across all terminals
2. **Home Terminal**: Users can set a preferred "home terminal" that auto-loads on hub access
3. **Favorite Terminals**: Users can mark frequently accessed terminals as favorites
4. **Terminal Switching**: Easy switching between terminals without losing session state
5. **User Preferences**: Terminal selections are stored in user profile for persistence

### Terminal Selection Flow
1. **First-Time Users**: Prompted to select and set home terminal
2. **Returning Users**: Auto-loads home terminal if set, otherwise shows terminal selection
3. **Terminal Switching**: Dropdown selector in header for quick terminal changes
4. **Favorites Access**: Heart icon menu shows favorite terminals for quick switching

### Data Scoping Rules
- **All driver data**: Filtered by selected terminal only
- **All route data**: Only routes associated with selected terminal  
- **All schedule data**: Terminal-specific scheduling and assignments
- **All communication**: Scoped to terminal staff and drivers
- **All alerts**: Only alerts relevant to selected terminal operations

## Operations Hub Layout Structure

### Terminal Selection Header (New Top Section)
```
┌─────────────────────────────────────────────────────────────────────┐
│ [Terminal Icon] Operations Hub                    [Terminal Select ▼]│
│ Terminal-focused dispatch and driver management        [Favorites ♡] │
└─────────────────────────────────────────────────────────────────────┘
```

### Critical Status Bar (Below Terminal Selection)
```
┌─────────────────────────────────────────────────────────────────────┐
│ 🔴 3 Drivers Offline | 🟡 2 Schedule Conflicts | 🟢 12 Active Routes │
│ Last Update: 2:34 PM | Next Check-in: Driver #247 in 15 min         │
└─────────────────────────────────────────────────────────────────────┘
```

### Main Content: Three-Panel Layout

#### Left Panel (40% width): Live Dispatch Control
- **Driver Login Status Board**
  - Color-coded list of all drivers (Green: Online, Red: Should be online but aren't, Yellow: Break/Lunch)
  - Quick communication buttons per driver
  - "Expected online" vs "Actually online" status
  - One-click deep link to GEOtab for driver verification

- **Route Status Summary** 
  - Active routes with progress indicators
  - ETA updates and delays
  - Driver assignments per route
  - Quick reassignment controls

#### Center Panel (35% width): Today's Schedule & Changes
- **Schedule Overview**
  - Timeline view of today's planned activities
  - Schedule changes/conflicts highlighted
  - Driver availability windows
  - Unassigned routes needing attention

- **Communication Center**
  - Recent messages/alerts
  - Schedule change notifications
  - End-of-shift reports queue
  - Quick broadcast message tool

#### Right Panel (25% width): Quick Actions & Alerts
- **Immediate Attention Required**
  - Drivers who should have checked in
  - Routes with issues
  - Schedule conflicts
  - System alerts

- **Quick Navigation**
  - Jump to specific driver/route/terminal
  - External tool links (GEOtab, etc.)
  - Report generation shortcuts

## Specific Page Changes Required

### 1. New Route: `/operations-hub`
- **Purpose**: Primary daily workspace
- **Access**: Prominent in sidebar, possibly default landing page for operations roles
- **Data Sources**: Real-time APIs for driver status, route progress, schedule data

### 2. Main Dashboard Changes
- **Reduce**: Quick Actions grid (9 cards → 4-5 essential ones)
- **Add**: Operations Hub as primary action card
- **Enhance**: Show critical alerts from Operations Hub data
- **Move**: Administrative cards lower in hierarchy

### 3. Sidebar Reorganization
- **Current Order**: Dashboard → Operations → Reports → Admin
- **Proposed Order**: Dashboard → **Operations Hub** → Operations → Reports → Admin

## Data Integration Requirements

### Real-time Data Streams Needed
1. **Driver Login Status** (via APIs)
   - Who should be online right now
   - Who is actually online  
   - Last check-in times
   - Current locations

2. **Route Progress Data**
   - Real-time ETAs
   - Completed vs planned stops
   - Driver assignments
   - Delay notifications

3. **Schedule Compliance**
   - Planned vs actual start times
   - Break compliance
   - End-of-shift status
   - Schedule changes

### Communication Data
- Message queues
- Alert notifications
- Schedule change logs
- End-of-shift reports

## Visual Design Specifications

### Color Coding System
- **🔴 Red**: Critical issues (offline drivers, major delays)
- **🟡 Yellow**: Warnings (potential conflicts, minor delays)  
- **🟢 Green**: Good status (on-time, online, compliant)
- **🔵 Blue**: Information (scheduled breaks, planned changes)
- **⚫ Gray**: Inactive/Off-duty

### Layout Responsiveness
- **Desktop**: Three-panel layout as described
- **Tablet**: Stack panels vertically, keep status bar
- **Mobile**: Single-column with expandable sections

### Update Frequency
- **Driver Status**: Every 30 seconds
- **Route Progress**: Every 2 minutes  
- **Schedule Data**: Every 5 minutes
- **Communications**: Real-time as they occur

## Workflow Integration

### Primary User Flow
1. **Start of Day**: Operations Hub shows schedule, identifies issues
2. **Active Management**: Monitor driver status, handle communications
3. **Problem Resolution**: Quick access to driver contact, reassignment tools
4. **End of Day**: Review end-of-shift reports, plan tomorrow

### Integration with Existing Pages
- **Driver Management**: Click driver name → opens driver detail page
- **Route Details**: Click route → opens route management page
- **Terminal Ops**: Context-aware terminal links
- **Planning**: Quick schedule adjustment tools

## Communication Features

### Built-in Communication Tools
1. **Driver Contact Panel**
   - Quick message/call buttons
   - Status update requests
   - Location verification
   
2. **Schedule Change Broadcasting**
   - Select affected drivers
   - Send schedule updates
   - Confirmation tracking

3. **End-of-Shift Reporting**
   - Driver check-out process
   - Issue reporting workflow
   - Next-day preparation notes

## Implementation Strategy

### Phase 1: Core Structure ✅ COMPLETED
- [x] Three-panel layout
- [x] Basic driver status display
- [x] Schedule overview panel
- [x] Critical alerts section
- [x] Operations Hub page created at `/operations-hub`
- [x] Added to sidebar navigation as primary operations item
- [x] Added to header quick navigation icons
- [x] Featured prominently on main dashboard
- [x] GEOtab testing page moved to `/admin/geotab`
- [x] **Terminal-centric architecture implemented**
- [x] **Terminal selection functionality**
- [x] **Home terminal and favorites system**
- [x] **User preferences storage**
- [x] **Terminal-scoped data filtering**

### Phase 2: Real-time Integration (IN PROGRESS)
- [ ] API connections for live data
- [ ] Auto-refresh mechanisms
- [ ] Deep linking to external tools
- [x] Mock data structure implemented for testing

### Phase 3: Communication Tools
- [ ] Message center
- [ ] Alert notifications
- [ ] Report generation

## Third-Party Integration Notes

### GEOtab Integration Context
- **Current GEOtab page**: Move to `/admin/geotab` as testing/verification tool
- **Production Integration**: Embedded API calls throughout Operations Hub
- **Deep Linking**: Quick verification links from DispatchPrime to GEOtab web interface
- **Multiple APIs**: Framework supports various third-party integrations

### API Integration Points
- Driver login status monitoring
- Real-time vehicle location tracking
- Route progress and ETA calculations
- Schedule compliance verification
- Deep link generation for external tool verification

## Key Design Decisions Pending

1. **Default View**: Should Operations Hub be the default landing page for operations users?
2. **Panel Flexibility**: Should panels be resizable/collapsible by user preference?
3. **Alert Persistence**: Should critical alerts remain visible until manually dismissed?
4. **Communication Method**: In-app messaging only, or integrate with SMS/email systems?
5. **Historical Data**: How much historical information (yesterday's issues, trends) should be visible?
6. **Role-based Views**: Should different user roles see different panel arrangements?

## Success Metrics

### Operational Efficiency Goals
- Reduce time spent switching between pages for core tasks
- Faster identification and resolution of driver login issues
- Improved communication response times for schedule changes
- More efficient end-of-shift reporting workflow

### User Experience Goals
- Single-screen workflow for daily dispatch operations
- Real-time awareness of critical operational status
- Streamlined communication with drivers
- Quick access to detailed management tools when needed

## Implementation Notes

### Completed Features
- **Operations Hub Page**: Fully functional three-panel layout with terminal-scoped mock data
- **Navigation Integration**: Added to sidebar and header navigation
- **Dashboard Integration**: Featured as primary quick action
- **GEOtab Reorganization**: Moved testing tools to admin section
- **Responsive Layout**: Works on desktop, tablet, and mobile
- **Terminal-Centric Architecture**: Complete terminal selection and scoping system
- **User Preferences**: Home terminal and favorites with localStorage persistence
- **Mock Data Structure**: Complete terminal-specific data framework ready for real API integration

### Current Mock Data Includes
- Terminal selection with 5 sample terminals (Atlanta, Houston, Chicago, Phoenix, Denver)
- Terminal-specific driver status with online/offline/break states
- Terminal-scoped active routes with progress indicators
- Terminal-relevant critical alerts system
- Communication center structure scoped to terminal
- Home terminal and favorites management
- Quick actions and navigation

### Next Steps for Real Implementation
1. Connect to terminal-scoped driver status APIs
2. Integrate terminal-filtered route progress data
3. Implement terminal-specific communication systems
4. Add terminal-relevant alert generation
5. Connect deep linking to external tools with terminal context
6. Integrate with user profile service for persistent terminal preferences
7. Add terminal-based role/permission checking
8. Implement terminal-specific scheduling APIs

---

*Last Updated: August 29, 2025*
*Status: Phase 1 Complete (Including Terminal-Centric Architecture) - Ready for Phase 2 (Real Data Integration)*