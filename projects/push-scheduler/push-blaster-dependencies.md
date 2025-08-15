# Push Blaster Dependencies Map

This document outlines the architecture and key dependencies of the `push-blaster` application, providing a centralized reference to guide future development and debugging.

**Project Overview:** A complete toolchain for manual, scheduled, and fully automated push notifications, including audience creation, cadence management, and persistent process management.

---

## 1. High-Level Architecture

The `push-blaster` is a Next.js application with four primary functions:
1.  **Audience Builder:** A UI for creating user segments based on various filters and data packs.
2.  **Push Notification Sender:** A UI for uploading a user CSV and sending personalized push notifications.
3.  **Push Scheduling System:** (Legacy) A system for scheduling manual pushes, now being superseded by the Automation Engine.
4.  **Universal Automation Engine:** A powerful system for creating, scheduling, and executing multi-step, automated push notification sequences (e.g., onboarding funnels, retention campaigns).

### Unified Service Architecture & Process Management

**🔗 Tightly Coupled Services:** Push-blaster runs as a unified system with the push-cadence-service to ensure responsible notification delivery.

**⚙️ Persistent Process Management with PM2:** The application is managed by `pm2`, a process manager that ensures the services run persistently in the background, independent of any terminal session.

The application follows a **dual-service model**:
-   **Push-Blaster Service:** Main Next.js application on port 3001
-   **Push-Cadence Service:** Notification filtering microservice on port 3002
-   **Configuration:** Both services are defined in `apps/push-blaster/ecosystem.config.js`.

### Service Components:
-   **Frontend:** A single-page React application built with Next.js App Router (`apps/push-blaster/src/app/page.tsx`).
-   **Backend:** A set of Next.js API Routes (`apps/push-blaster/src/app/api/*`) that handle business logic.
-   **Core Logic:** A `lib` directory containing modules for database access, external service integrations, and utility functions.
-   **Automation & Scheduling Data:** JSON file-based storage systems for automation recipes (`.automations/`) and legacy scheduled pushes (`.scheduled-pushes/`).
-   **Cadence Logic:** Separate microservice managing notification frequency rules and user tracking.

### Startup & Development

**🚀 Persistent Development Startup (Recommended):**
```bash
cd apps/push-blaster
npm run pm2:start
```
This command starts both services as background daemons. Use the following commands to manage them:
-   `npm run pm2:stop`: Stops both services.
-   `npm run pm2:restart`: Restarts both services.
-   `npm run pm2:logs`: Tails the logs for both services.

**Individual Service Commands (for direct debugging):**
```bash
# Push-blaster only
npm run dev:push-only

# Cadence service only (from push-blaster directory)
npm run dev:cadence
```

**⚠️ Service Dependency:** Push-blaster requires the cadence service for all notification operations.

---

## 2. Component & Module Breakdown

### A. Frontend (`apps/push-blaster/src/app/page.tsx`)

This is the main entry point and UI for the entire application, now encompassing four major tabs: Create Push, Track Results, Scheduled Pushes, and Restore Data.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/page.tsx` (3000+ lines - very complex state management)
-   **Interacting Modules:**
    -   Calls all `/api/*` endpoints.
    -   Manages state for audience creation, manual pushes, scheduling, calendar views, modals, and the new automation system UI (when built).
-   **Risk Notes:**
    -   **CRITICAL:** This component's size and state complexity make it a high-risk area. Future development should prioritize refactoring and extracting components to reduce complexity.
    -   State management is highly coupled. Changes in one area (e.g., modals) can have unintended consequences elsewhere.

### B. Universal Automation Engine (`apps/push-blaster/src/lib/`)

This is the new core system for handling all automated and scheduled push notifications. It is composed of several interconnected modules.

-   **Affected Files:**
    -   `lib/automationEngine.ts`: The main orchestrator, uses `node-cron` to schedule jobs.
    -   `lib/sequenceExecutor.ts`: Executes the steps of a multi-push sequence, handling timing and delays.
    -   `lib/audienceProcessor.ts`: Generates and caches audiences for push sequences in parallel.
    -   `lib/sequenceSafety.ts`: Provides real-time monitoring and safety checks for running sequences.
    -   `lib/automationStorage.ts`: Manages saving and loading automation recipes from JSON files in the `.automations/` directory.
    -   `lib/automationLogger.ts`: A detailed logging system for all automation activities.
    -   `lib/automationIntegration.ts`: A layer to communicate with external services like the `push-cadence-service`.
    -   `lib/timelineCalculator.ts`: Calculates the execution timeline for automation events.
    -   `lib/safeguardMonitor.ts`: Enforces global safety limits and handles violations.
    -   `lib/automationTemplates.ts`: Defines pre-built automation recipes (e.g., onboarding funnel).
-   **Interacting Modules:**
    -   Called by the new `/api/automation/*` routes.
    -   Integrates heavily with `push-cadence-service` via `automationIntegration.ts`.
-   **Risk Notes:**
    -   **MEMORY USAGE:** This engine is powerful but memory-intensive. The initial implementation caused server crashes due to eager loading of all modules. As a temporary fix, all singleton exports in these files have been **stubbed out** and the primary API routes are **disabled**. The system is architecturally sound but requires a lazy-loading implementation before it can be fully activated.

### C. API Layer (`apps/push-blaster/src/app/api/`)

#### `automation/*`
A new suite of API routes to manage the Universal Automation Engine.

-   **Affected Files:**
    -   `api/automation/recipes/[id]/route.ts` & `route.ts`: CRUD for automation recipes.
    -   `api/automation/sequences/[id]/route.ts` & `route.ts`: Control and monitor sequence execution.
    -   `api/automation/templates/[id]/route.ts` & `route.ts`: Manage and use automation templates.
    -   `api/automation/control/route.ts`: Emergency stop and other manual controls.
    -   `api/automation/monitor/route.ts`: Real-time monitoring endpoints.
    -   `api/automation/test/route.ts`: Run safety and validation tests.
    -   `api/automation/migrate/route.ts`: (Future) Migrate legacy scheduled pushes.
-   **Risk Notes:**
    -   **CURRENTLY DISABLED:** The core logic within `sequences/route.ts` is stubbed out to prevent server crashes from memory overload. The underlying libraries are built, but this API does not yet use them. Re-enabling this requires implementing lazy loading for the automation libraries.

#### `query-audience/route.ts`
(No significant changes, remains a core service)

#### `send-push/route.ts`
-   **Recent Changes:**
    -   Now integrates with `push-cadence-service` to filter the audience before sending, respecting cadence rules.
    -   CSV parsing logic was improved to handle Windows-style line endings (`\r\n`) by explicitly setting the `newline` option in Papa Parse. This fixed the "Unable to auto-detect delimiting character" error.
-   **Risk Notes:**
    -   Now has a hard dependency on the `push-cadence-service` running on `localhost:3002`.

#### `scheduled-pushes/*` (Legacy)
-   **Risk Notes:**
    -   This system is now considered legacy. New scheduling should be implemented through the Universal Automation Engine. It remains functional but should be phased out.

### D. Core Logic (`apps/push-blaster/src/lib/`)
(No significant changes to the modules listed below, but they are now consumed by the new Automation Engine.)

-   `databaseQueries.ts` & `db.ts`
-   `firebaseAdmin.ts`
-   `graphql.ts` & `variableProcessor.ts`
-   **Risk Notes:** All core logic modules are now indirect dependencies of the Automation Engine, increasing their importance.

---

## 3. External Systems & Environment Variables

The application relies on the following external systems and the environment variables used to configure them:

-   **PostgreSQL Database:**
    -   `DATABASE_URL`: The connection string for our database.
-   **Firebase Cloud Messaging (FCM):**
    -   `FIREBASE_PROJECT_ID`
    -   `FIREBASE_CLIENT_EMAIL`
    -   `FIREBASE_PRIVATE_KEY`
-   **Internal GraphQL API (Hasura):**
    -   `HASURA_ADMIN_SECRET`
    -   `NEXT_PUBLIC_HASURA_URL`

---

## 4. Key Dependencies & Integration Points

### Next.js Framework Integration
- **Path Aliases:** `@/components/*` used throughout for component imports
- **API Route Structure:** App Router pattern with proper async/await handling
- **Build System:** Integrated TypeScript compilation with JSX support
- **Validation:** Use `npm run dev:push` for proper Next.js validation, NOT `npx tsc --noEmit`

### State Management Complexity
- **Main App State:** Push mode, form inputs, response handling, loading states
- **Calendar State:** Current date, view mode, selected pushes, navigation
- **Modal State:** Editing push, modal responses, audience generation, file operations
- **Isolation:** Modal state designed to not interfere with main app state

### Component Architecture
- **Reusability:** Button, Input, Textarea components used across all forms
- **Consistency:** Shared styling patterns with Tailwind CSS utility classes
- **Accessibility:** Consistent contrast ratios and form labeling patterns

---

## 5. Testing & Validation Protocols

### Process Management
- **Startup:** Always use `npm run pm2:start` for persistent background operation.
- **Status Checks:** Use `npm run pm2:logs` to monitor the live output of both services.
- **NEVER run `npm run dev` in the main chat terminal, as it will be killed.**

### Next.js Validation (CRITICAL)
- **Development Server:** Always use `npm run dev:push` for validation
- **Status Checks:** Verify HTTP 200 responses with `curl -I http://localhost:3001`
- **Console Monitoring:** Watch Next.js dev console for real TypeScript errors
- **NEVER use `npx tsc --noEmit`** - inappropriate for Next.js projects

### Functional Testing
- **API Endpoints:** Test all CRUD operations (GET, POST, PUT, DELETE)
- **Calendar Navigation:** Verify month/week switching with proper date boundaries
- **Modal Workflows:** Test push editing, audience generation, and sending workflows
- **Form Validation:** Verify future date requirements and field validation

### UI/UX Testing
- **Responsive Design:** Test across mobile, tablet, and desktop layouts
- **Accessibility:** Verify contrast ratios and keyboard navigation
- **Loading States:** Confirm proper loading indicators and error handling
- **Visual Feedback:** Test hover effects, transitions, and state changes

---

## 6. Recent Enhancements & Risk Areas

### Persistent Server with PM2
- **Implementation:** Added `pm2` as a dev dependency and an `ecosystem.config.js` file to manage both `push-blaster` and `push-cadence-service`.
- **Benefit:** Servers now run as stable, persistent background processes, solving the issue of the server dying during interactive sessions.
- **New Commands:** `npm run pm2:start`, `pm2:stop`, `pm2:restart`, `pm2:logs`.

### Universal Automation Engine (Phase 3)
- **Status:** Core libraries are built but currently **disabled** at the API layer due to high memory consumption on startup.
- **Risk:** The primary risk is the memory usage of the automation engine. Before this system can be fully utilized, a lazy-loading or dynamic import strategy must be implemented to prevent the server from crashing.
-   **File Storage:** Current JSON file system for automations is located at `.automations/`.

---

## 7. Future Maintenance Considerations

### Activating the Automation Engine
- **Priority #1:** Implement lazy loading for the automation libraries (`sequenceExecutor`, `audienceProcessor`, etc.) so they are only loaded into memory when their respective API endpoints are called.
- **Refactoring:** Once activated, the `page.tsx` will need to be updated to integrate with the new automation APIs, and the legacy scheduling system can be fully deprecated.

### Code Organization
- **Component Extraction:** Large page.tsx could benefit from extracting calendar and modal components
- **Utility Functions:** Date utilities and validation logic could be extracted to separate modules
- **Type Definitions:** Consider centralizing TypeScript interfaces for better maintainability

### Dependencies Management
- **External Libraries:** Current implementation uses minimal dependencies for maintainability
- **Framework Updates:** Next.js updates may require API route pattern changes
- **Styling System:** Tailwind CSS provides good maintainability for current approach