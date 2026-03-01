# Architecture

**Analysis Date:** 2026-03-01

## Pattern Overview

**Overall:** Client-First React Native App with Local-First Sync to Cloud

**Key Characteristics:**
- React Native mobile application (Expo-based) with multi-platform support (iOS, Android, Web)
- Local-first architecture: SQLite database for offline-capable data persistence
- Optional cloud sync via Supabase for authentication, profiles, and data synchronization
- Context-based state management with layered navigation
- Glassmorphic UI design system with theme customization (light/dark)
- Event-driven architecture for cross-cutting concerns (notifications, widgets, quick actions)

## Layers

**Presentation Layer (Screens & Components):**
- Purpose: Render UI and handle user interactions
- Location: `src/screens/`, `src/components/`
- Contains: Screen components, glass UI components, error boundaries
- Depends on: Contexts (Auth, Profile, Sync), theme, database services, types
- Used by: Navigation system, root App component

**Navigation Layer:**
- Purpose: Manage app navigation flows and screen stacks
- Location: `src/navigation/`
- Contains: Stack navigators (Auth, Dashboard, Workout, History), tab navigator, navigation types
- Depends on: Screens, React Navigation, contexts
- Used by: App.tsx entry point

**Context/State Management Layer:**
- Purpose: Centralize cross-app state and provide async coordination
- Location: `src/contexts/`
- Contains:
  - `AuthContext.tsx` - Authentication state (Supabase-backed)
  - `ProfileContext.tsx` - User profile data and avatar management
  - `SyncContext.tsx` - Cloud sync orchestration and migration tracking
- Depends on: Supabase client, database services, types
- Used by: All screens and services

**Services Layer:**
- Purpose: Business logic and external integrations
- Location: `src/services/`
- Contains:
  - `profileService.ts` - Supabase profile CRUD and avatar uploads
  - `syncEngine.ts` - Bidirectional sync algorithm (local ↔ remote)
  - `syncIdMap.ts` - Local-to-remote ID mapping, migration state
- Depends on: Supabase client, local database
- Used by: Contexts, screens

**Data Access Layer:**
- Purpose: SQLite database operations and queries
- Location: `src/database/`
- Contains:
  - `database.ts` - Schema initialization, SQLite connection
  - `services.ts` - 20+ query/mutation functions for all entities
  - `seed.ts` - Initial data population (muscle groups, exercises)
  - `index.ts` - Public exports
- Depends on: expo-sqlite, types
- Used by: Services, screens (direct access to read-only queries)

**Theme & Utilities:**
- Purpose: Cross-cutting styling, notifications, widgets
- Location: `src/theme/`, `src/utils/`, `src/widget/`
- Contains:
  - Theme context, color tokens, typography, glass design tokens
  - Notification scheduling, quick actions, widget bridge
  - Avatar picker, exercise selection flows
- Depends on: React Native, Expo modules, database services
- Used by: Screens, components

**Type System:**
- Purpose: Type safety and contracts
- Location: `src/types/index.ts`
- Contains: 20+ domain types (Workout, Exercise, Profile, etc.)
- Used by: All layers

## Data Flow

**Authentication Flow:**

1. App.tsx initializes and checks persisted session
2. AuthProvider loads from Supabase (auto-refreshes tokens via AppState listener)
3. If authenticated, ProfileProvider fetches user profile from Supabase
4. If no profile exists, ProfileSetupScreen requests data creation
5. ProfileContext provides profile to all downstream components

**Workout Logging Flow:**

1. User navigates to "Log Workout" tab → StartWorkoutScreen
2. Selects muscle group → creates Workout row via createWorkout()
3. Chooses exercises → navigates to ActiveWorkoutScreen
4. Records sets (weight, reps) via addSet() → stored in local SQLite
5. On completion: detects PRs, stores in personal_records table
6. SyncContext periodically syncs data to Supabase (5-min cooldown)

**Sync Flow (Cloud Sync):**

1. On first auth + migration: initialMigration() pushes all local data to Supabase
2. ID mapping stored via syncIdMap (local_id ↔ remote_id)
3. Periodic syncAll() fetches remote changes (upsert/delete timestamps)
4. Conflict resolution: Last-write-wins (updated_at timestamps)
5. UI observes SyncContext.isSyncing and lastSyncResult

**State Management:**

- Authentication state: Managed by Supabase auth client (persistent via AsyncStorage)
- Profile state: Cached in ProfileContext; refreshed on auth changes
- Local data: SQLite is source of truth; never cached in React state except for transient UI
- Sync state: Tracked in SyncContext (isSyncing, lastSyncedAt, hasMigrated)
- Theme: Persisted to local SQLite settings table; no server sync

## Key Abstractions

**Database Layer Abstraction:**

- Purpose: Hide SQLite implementation details
- Example: `src/database/services.ts` exports 20+ functions
- Pattern:
  ```typescript
  export function getWorkoutSummary(workoutId: number): WorkoutDetail {
    const db = getDatabase();
    return db.getFirstSync(...);
  }
  ```
- All screens import from services, never directly use SQLite API

**Sync Engine Abstraction:**

- Purpose: Handle bidirectional sync complexity
- Location: `src/services/syncEngine.ts` (1150 lines)
- Pattern: Two-phase sync (push local changes → pull remote changes)
- Handles conflict resolution, ID mapping, soft deletes (deleted_at column)
- Returns SyncResult for UI feedback

**Navigation Abstraction:**

- Purpose: Decouple screen logic from routing
- Pattern: Separate stack navigators (AuthStackNavigator, DashboardStackNavigator, WorkoutStackNavigator)
- Each stack has typed ParamLists (e.g., WorkoutStackParamList)
- Navigation queries encapsulated in dedicated files

**Theme Abstraction:**

- Purpose: Centralized design system
- Exports: lightColors, darkColors, typography, spacing, glass tokens
- Pattern: ThemeProvider wraps App, useTheme() hook provides colors
- Settings persisted to database (theme_mode: 'system'|'light'|'dark')

## Entry Points

**Root Entry:** `index.ts`
- Registers Android widget handler (safe no-op if unavailable)
- Calls registerRootComponent(App)
- Exposes Expo to native environment

**App Entry:** `App.tsx`
- Purpose: App initialization, error handling, authentication gate
- Responsibilities:
  - Initialize SQLite database (initializeDatabase())
  - Load onboarding state
  - Request notification permissions
  - Render error boundary
  - Nest contexts: ThemeProvider → AuthProvider → ProfileProvider → SyncProvider
  - AuthGate component checks auth state and routes to correct navigator (Auth vs App)
- Handles quick actions and widget lifecycle events

**Navigation Entry:** `src/navigation/AppNavigator.tsx`
- Creates bottom-tab navigator with 4 tabs: Dashboard, Log Workout, History, Progress
- Each tab uses glass-blurred background
- Routes authenticated users to authenticated content

## Error Handling

**Strategy:** Multi-layer approach with graceful degradation

**Patterns:**

- **ErrorBoundary Component:** Catches React render errors, shows fallback UI with retry
  - Used at root level in App.tsx
  - Displays error message and retry button

- **Try-catch at Service Layer:** syncEngine catches sync failures
  - Sets SyncResult.success = false
  - Captures errors array for debugging

- **Database Error Handling:** App.tsx catches database init failures
  - Shows offline error screen with retry button
  - Prevents blank/crashed state

- **Async Error Handling:** Auth/Profile contexts log errors but don't crash
  - signIn/signUp return {error} for screen to handle
  - Profile fetch failures set profile to null (treated as missing)

- **Network Error Handling:** Supabase client auto-retries with exponential backoff
  - AppState listener restarts auth refresh when app returns to foreground

## Cross-Cutting Concerns

**Logging:**
- Console.error() for critical issues (database init, sync errors, ErrorBoundary)
- No centralized logging service; all logs go to console/native logs

**Validation:**
- Input validation at screens (form fields, numeric ranges)
- Type system enforces contracts (Exercise, Workout types)
- Database schema enforces NOT NULL, FOREIGN KEY constraints

**Authentication:**
- Supabase Auth with JWT tokens
- Auto-refresh tokens via AppState listener (restarts when foreground)
- Session persisted to AsyncStorage (Platform-specific)
- Protected Supabase calls require active session (auth.getUser())

**Permissions:**
- Notifications: Requested at app startup, checked before scheduling
- Image picker: Requested in avatar upload flow
- Quick actions: Gracefully handles unavailable native module

---

*Architecture analysis: 2026-03-01*
