# Push Blaster Dependencies Map

This document outlines the architecture and key dependencies of the `push-blaster` application, providing a centralized reference to guide future development and debugging.

**Project Overview:** Complete push notification scheduling and management system with calendar interface and modern UI.

---

## 1. High-Level Architecture

The `push-blaster` is a Next.js application with three primary functions:
1.  **Audience Builder:** A UI for creating user segments based on various filters and data packs. This generates a CSV file.
2.  **Push Notification Sender:** A UI for uploading a user CSV and sending personalized push notifications.
3.  **Push Scheduling System:** A comprehensive scheduling interface with calendar management for drafting and scheduling future push notifications.

The application follows a standard client-server model:
-   **Frontend:** A single-page React application built with Next.js App Router (`apps/push-blaster/src/app/page.tsx`).
-   **Backend:** A set of Next.js API Routes (`apps/push-blaster/src/app/api/*`) that handle business logic.
-   **Core Logic:** A `lib` directory containing modules for database access, external service integrations, and utility functions.
-   **Scheduling Data:** JSON file-based storage system for scheduled push drafts (`.scheduled-pushes/` directory).

---

## 2. Component & Module Breakdown

### A. Frontend (`apps/push-blaster/src/app/page.tsx`)

This is the main entry point and UI for the entire application, now encompassing three major tabs: Make, Track, and Calendar.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/page.tsx` (2356+ lines - complex state management)
    -   `apps/push-blaster/src/components/Button.tsx`
    -   `apps/push-blaster/src/components/Input.tsx`
    -   `apps/push-blaster/src/components/Textarea.tsx`
-   **Interacting Modules:**
    -   Calls `/api/query-audience` to generate user CSVs and segment external files.
    -   Calls `/api/send-push` to send notifications.
    -   Calls `/api/push-logs` to track historical pushes.
    -   Calls `/api/scheduled-pushes` for CRUD operations on scheduled push drafts.
    -   Calls `/api/scheduled-pushes/[id]` for individual push management.
-   **Shared Types / Constants:**
    -   `ServerResponse`, `AudienceResponse` (interfaces for API communication).
    -   `ScheduledPush`, `AudienceCriteria` (interfaces for scheduling system).
    -   Multiple state interfaces for calendar, modal, form management, and external file processing.
-   **External Dependencies:**
    -   `react` (for state management: `useState`, `useEffect`).
    -   `papaparse` (for CSV parsing and preview of external files).
    -   JavaScript `Date` object for calendar utilities.
    -   CSS Grid layout for calendar rendering.
    -   FileReader API for client-side file processing.
-   **Risk Notes:**
    -   The component manages a large amount of state across multiple contexts (main app, calendar, modal). Future changes should be carefully managed to avoid state conflicts.
    -   Complex state isolation required - modal state must not interfere with main app state.
    -   All business logic is delegated to the API layer, which is a good separation of concerns.

### B. API Layer (`apps/push-blaster/src/app/api/`)

#### `query-audience/route.ts`
Handles requests to build user audiences and generate CSVs.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/api/query-audience/route.ts`
-   **Interacting Modules:**
    -   `lib/databaseQueries.ts`: Uses `queryUsers`, `fetchDataPacks`, and `fetchManualAudienceData` to interact with the database.
-   **Shared Types / Constants:**
    -   `AudienceFilters`, `DataPacks`, `UserData` (for structuring query logic).
-   **External Dependencies:**
    -   `papaparse`: For converting the final user data into a CSV string.
-   **Risk Notes:**
    -   This is a critical data-retrieval endpoint. Changes to `databaseQueries.ts` will directly impact its functionality.

#### `send-push/route.ts`
Handles requests to send push notifications to a list of users.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/api/send-push/route.ts`
-   **Interacting Modules:**
    -   `lib/graphql.ts`: Uses `fetchDeviceTokens` to get user device tokens.
    -   `lib/firebaseAdmin.ts`: Uses `getPushClient` to send notifications via FCM.
    -   `lib/variableProcessor.ts`: Uses `validateVariables` and `processVariableReplacements` to personalize messages.
-   **Shared Types / Constants:**
    -   `CsvRow` (for parsing the uploaded user file).
-   **External Dependencies:**
    -   `papaparse`: For parsing the uploaded CSV file.
    -   `firebase-admin`: For sending push notifications.
-   **Risk Notes:**
    -   This endpoint interfaces with two critical external services (our GraphQL API and Firebase). Failures in either will cause this endpoint to fail.
    -   The logic for handling `dryRun` is critical for testing and must be maintained carefully.

#### `scheduled-pushes/route.ts` & `scheduled-pushes/[id]/route.ts`
Handle CRUD operations for the push scheduling system.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/api/scheduled-pushes/route.ts`
    -   `apps/push-blaster/src/app/api/scheduled-pushes/[id]/route.ts`
-   **Interacting Modules:**
    -   Main UI components, calendar system, modal workflows
    -   File system operations for JSON persistence
-   **Shared Types / Constants:**
    -   `ScheduledPush`, `AudienceCriteria`, `ServerResponse` interfaces
-   **External Dependencies:**
    -   Node.js `fs/path` for JSON file operations
    -   `crypto` for UUID generation
-   **Risk Notes:**
    -   Changes to API structure require updates to frontend state management
    -   File operations are synchronous - consider async patterns for scale

#### `push-logs/route.ts`
Handles requests to retrieve push notification logs and tracking data.

-   **Affected Files:**
    -   `apps/push-blaster/src/app/api/push-logs/route.ts`
-   **Interacting Modules:**
    -   File system operations for log retrieval
    -   Calendar modal system for post-send tracking display
-   **Shared Types / Constants:**
    -   `JobSummary` interfaces for tracking data structure
-   **External Dependencies:**
    -   Node.js file system operations
-   **Risk Notes:**
    -   Log file format changes could break tracking display

### C. Core Logic (`apps/push-blaster/src/lib/`)

#### `databaseQueries.ts` & `db.ts`
The data access layer for the application.

-   **Affected Files:**
    -   `apps/push-blaster/src/lib/databaseQueries.ts`
    -   `apps/push-blaster/src/lib/db.ts`
-   **Interacting Modules:**
    -   `db.ts` creates and manages the PostgreSQL connection pool.
    -   `databaseQueries.ts` consumes the pool from `db.ts` to execute raw SQL queries.
-   **Shared Types / Constants:**
    -   `AudienceFilters`, `DataPacks`, `UserData` (exported for use in the API layer).
-   **External Dependencies:**
    -   `pg`: The Node.js PostgreSQL client.
-   **Risk Notes:**
    -   This is the *only* module that should directly interact with the database.
    -   All SQL queries are centralized here, making it a critical point of failure but also a central point for optimization.

#### `firebaseAdmin.ts`
Initializes and exports the Firebase Admin SDK client.

-   **Affected Files:**
    -   `apps/push-blaster/src/lib/firebaseAdmin.ts`
-   **External Dependencies:**
    -   `firebase-admin`
-   **Risk Notes:**
    -   Relies on environment variables (`FIREBASE_*`) for initialization. Missing variables will cause a runtime error.

#### `graphql.ts` & `variableProcessor.ts`
Utility modules for specific tasks.

-   **`graphql.ts`:** Contains the logic for fetching user device tokens from our internal GraphQL API.
-   **`variableProcessor.ts`:** Contains the logic for validating and replacing variables (e.g., `[[var:firstName]]`) in push notification text.
-   **Risk Notes:**
    -   `graphql.ts` depends on the `HASURA_ADMIN_SECRET` environment variable.
    -   The logic in `variableProcessor.ts` is complex. Changes could lead to malformed push notifications.

### D. Scheduling System Components

#### Calendar System
-   **Affected Files:** Calendar utilities within `page.tsx`, API integration functions
-   **Interacting Modules:** Scheduled pushes API, modal system, date navigation
-   **Shared Types:** Calendar view states, push event filtering, date utilities
-   **External Dependencies:** JavaScript Date object, CSS Grid layout
-   **Risk Notes:** Date math complexity - month/week boundary calculations critical

#### Modal Workflows
-   **Affected Files:** Modal state management in `page.tsx`, API integration
-   **Interacting Modules:** Scheduled pushes CRUD, file upload/download, audience generation
-   **Shared Types:** Modal-specific state, response handling, form validation
-   **External Dependencies:** File operations, CSV generation, audience query API
-   **Risk Notes:** Complex state isolation - modal state must not interfere with main app state

#### Data Storage System
-   **Affected Files:** `.scheduled-pushes/` directory, `.push-logs/` directory
-   **Interacting Modules:** API routes for persistence, calendar display, tracking
-   **Shared Types:** JSON file structure, push status management
-   **External Dependencies:** File system permissions, JSON serialization
-   **Risk Notes:** File operations are synchronous - consider async patterns for scale

#### External File Segmentation System
-   **Affected Files:** External file upload section in `page.tsx`, segmentation workflows
-   **Interacting Modules:** `/api/query-audience` endpoint for CSV splitting, file processing utilities
-   **Shared Types:** External file state management, CSV preview data structures
-   **External Dependencies:** FileReader API, PapaParse for CSV processing, Blob/URL APIs for downloads
-   **Risk Notes:** Client-side file processing has memory limitations for large files; validate file sizes and formats

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

### Phase 4 UI Improvements
- **Text Readability:** Applied slate-700 font-medium to all form text elements
- **Container System:** White rounded containers with gradient headers
- **Calendar Enhancement:** Increased weekly view height for better event display
- **Navigation:** Modern tab design with semantic icons and smooth transitions

### Incremental Development Lessons
- **Rollback Protocol:** Demonstrated successful rollback when HTTP 500 occurred
- **Validation Strategy:** Two-agent validation (frontend + dev) proven effective
- **Checkpoint Commits:** Clear git history enables safe iteration
- **Methodology:** Incremental approach prevents compound failures

---

## 7. Future Maintenance Considerations

### Scalability
- **File Storage:** Current JSON file system suitable for prototyping, consider database for production
- **State Management:** Complex state in single file - consider splitting for larger features
- **Calendar Performance:** Current implementation efficient for typical usage, monitor for high-volume scenarios

### Code Organization
- **Component Extraction:** Large page.tsx could benefit from extracting calendar and modal components
- **Utility Functions:** Date utilities and validation logic could be extracted to separate modules
- **Type Definitions:** Consider centralizing TypeScript interfaces for better maintainability

### Dependencies Management
- **External Libraries:** Current implementation uses minimal dependencies for maintainability
- **Framework Updates:** Next.js updates may require API route pattern changes
- **Styling System:** Tailwind CSS provides good maintainability for current approach