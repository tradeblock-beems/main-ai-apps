# Push Blaster Dependency Map

This document outlines the architecture and key dependencies of the `push-blaster` application, providing a centralized reference to guide future development and debugging.

---

## 1. High-Level Architecture

The `push-blaster` is a Next.js application with two primary functions:
1.  **Audience Builder:** A UI for creating user segments based on various filters and data packs. This generates a CSV file.
2.  **Push Notification Sender:** A UI for uploading a user CSV and sending personalized push notifications.

The application follows a standard client-server model:
-   **Frontend:** A single-page React application built with Next.js App Router (`app/page.tsx`).
-   **Backend:** A set of Next.js API Routes (`app/api/*`) that handle business logic.
-   **Core Logic:** A `lib` directory containing modules for database access, external service integrations, and utility functions.

---

## 2. Component & Module Breakdown

### A. Frontend (`src/app/page.tsx`)

This is the main entry point and UI for the entire application.

-   **Affected Files:**
    -   `src/app/page.tsx`
    -   `src/components/Button.tsx`
    -   `src/components/Input.tsx`
    -   `src/components/Textarea.tsx`
-   **Interacting Modules:**
    -   Calls `/api/query-audience` to generate user CSVs.
    -   Calls `/api/send-push` to send notifications.
    -   Calls `/api/push-logs` to track historical pushes.
-   **Shared Types / Constants:**
    -   `ServerResponse`, `AudienceResponse` (interfaces for API communication).
-   **External Dependencies:**
    -   `react` (for state management: `useState`).
-   **Risk Notes:**
    -   The component manages a large amount of state. Future changes should be carefully managed to avoid state conflicts.
    -   All business logic is delegated to the API layer, which is a good separation of concerns.

### B. API Layer (`src/app/api/`)

#### `query-audience/route.ts`
Handles requests to build user audiences and generate CSVs.

-   **Affected Files:**
    -   `src/app/api/query-audience/route.ts`
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
    -   `src/app/api/send-push/route.ts`
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

### C. Core Logic (`src/lib/`)

#### `databaseQueries.ts` & `db.ts`
The data access layer for the application.

-   **Affected Files:**
    -   `lib/databaseQueries.ts`
    -   `lib/db.ts`
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
    -   `lib/firebaseAdmin.ts`
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