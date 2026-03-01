# Codebase Structure

**Analysis Date:** 2026-03-01

## Directory Layout

```
WorkoutTracker/
├── App.tsx                # Root component with auth gate and context providers
├── index.ts               # Entry point (widget handler registration)
├── package.json           # Dependencies: react-native, expo, supabase, react-navigation
├── tsconfig.json          # TypeScript configuration
├── app.json               # Expo app configuration
├── assets/                # Static images and resources
│
├── src/
│   ├── components/        # Reusable UI components
│   │   ├── ErrorBoundary.tsx
│   │   └── glass/         # Glassmorphic component library
│   │       ├── GlassButton.tsx
│   │       ├── GlassCard.tsx
│   │       ├── GlassInput.tsx
│   │       ├── GlassModal.tsx
│   │       ├── GradientBackground.tsx
│   │       └── index.ts
│   │
│   ├── contexts/          # React Context providers for state management
│   │   ├── AuthContext.tsx      # Authentication (Supabase-backed)
│   │   ├── ProfileContext.tsx   # User profile and avatar
│   │   └── SyncContext.tsx      # Cloud sync orchestration
│   │
│   ├── database/          # SQLite database layer
│   │   ├── database.ts    # Schema definition, SQLite singleton
│   │   ├── services.ts    # 50+ database query/mutation functions
│   │   ├── seed.ts        # Initial data (muscle groups, exercises)
│   │   └── index.ts       # Exports initializeDatabase()
│   │
│   ├── hooks/             # Custom React hooks
│   │   └── useRestTimer.ts      # Rest timer countdown logic
│   │
│   ├── lib/               # External integrations
│   │   └── supabase.ts    # Supabase client with auto-refresh config
│   │
│   ├── navigation/        # React Navigation stack definitions
│   │   ├── AppNavigator.tsx           # Bottom-tab navigator (Dashboard, Log, History, Progress)
│   │   ├── AuthStackNavigator.tsx     # Auth stack (SignIn, SignUp, ForgotPassword)
│   │   ├── DashboardStackNavigator.tsx # Dashboard stack (DashboardHome, Settings, etc.)
│   │   ├── HistoryStackNavigator.tsx  # History stack
│   │   └── WorkoutStackNavigator.tsx  # Workout logging stack
│   │
│   ├── screens/           # Screen components (17 screens total)
│   │   ├── Auth screens:
│   │   │   ├── SignInScreen.tsx
│   │   │   ├── SignUpScreen.tsx
│   │   │   └── ForgotPasswordScreen.tsx
│   │   ├── Onboarding & Setup:
│   │   │   ├── OnboardingScreen.tsx
│   │   │   └── ProfileSetupScreen.tsx
│   │   ├── Main tabs:
│   │   │   ├── DashboardScreen.tsx        # Week summary, PRs, stats
│   │   │   ├── HistoryScreen.tsx          # Workout list, filters
│   │   │   └── ProgressScreen.tsx         # Charts, volume/strength trends
│   │   ├── Workout logging:
│   │   │   ├── StartWorkoutScreen.tsx     # Muscle group selection
│   │   │   ├── ActiveWorkoutScreen.tsx    # Record sets (1464 lines)
│   │   │   ├── ExercisePickerScreen.tsx   # Exercise selection
│   │   │   ├── WorkoutDetailScreen.tsx    # View/edit past workout
│   │   │   └── ExerciseLibraryScreen.tsx  # Browse exercises
│   │   ├── Templates:
│   │   │   └── TemplateManagementScreen.tsx # Create/edit templates
│   │   └── Profile:
│   │       ├── UserProfileScreen.tsx      # View other user profiles
│   │       ├── EditProfileScreen.tsx      # Edit own profile
│   │       └── SettingsScreen.tsx         # App settings (theme, notifications, etc.)
│   │
│   ├── services/          # Business logic and integrations
│   │   ├── profileService.ts # Supabase profile CRUD, avatar upload
│   │   ├── syncEngine.ts     # Bidirectional sync algorithm (1150 lines)
│   │   └── syncIdMap.ts      # Local-to-remote ID mapping (84 lines)
│   │
│   ├── theme/             # Design system
│   │   ├── ThemeContext.tsx # Theme provider (light/dark/system)
│   │   ├── colors.ts       # Color tokens (iOS system colors)
│   │   ├── tokens.ts       # Typography, spacing, glass effects
│   │   └── index.ts        # Exports
│   │
│   ├── types/             # TypeScript domain types
│   │   └── index.ts       # 20+ types: Workout, Exercise, Profile, etc.
│   │
│   ├── utils/             # Utility functions
│   │   ├── notifications.ts   # Notification scheduling, channels
│   │   ├── quickActions.ts    # Quick action setup for widgets
│   │   ├── quickActionHandler.ts # Quick action navigation routing
│   │   ├── widgetBridge.ts    # Android widget updates
│   │   ├── exerciseSelection.ts # Exercise picker flow
│   │   └── avatarPicker.ts    # Image picker for avatars
│   │
│   └── widget/            # Native widget support
│       ├── WorkoutWidget.tsx # Android widget UI component
│       └── handler.ts       # Widget task handler
│
├── .planning/
│   ├── codebase/          # GSD codebase analysis documents
│   │   ├── ARCHITECTURE.md
│   │   ├── STRUCTURE.md
│   │   └── ... other docs
│   ├── phases/            # Implementation phases
│   ├── milestones/        # Project milestones
│   └── ...
│
├── .claude/               # Claude Flow configuration (agents, helpers)
├── .claude-flow/          # Claude Flow metrics and security
├── .git/                  # Git repository
└── .gitignore             # Standard React Native excludes
```

## Directory Purposes

**`src/components/`**
- Purpose: Reusable UI building blocks
- Contains: Glass-morphic components, error boundary
- Key files: `glass/index.ts` barrel export for component library

**`src/contexts/`**
- Purpose: React Context providers for global state
- Contains: Auth, Profile, Sync state management
- Pattern: Each context file has Provider component + useContext hook
- Never directly imports other contexts (no circular deps)

**`src/database/`**
- Purpose: SQLite database abstraction layer
- Contains: Schema, queries, mutations, seeding
- Key: `services.ts` is the main export (50+ functions)
- Database singleton instantiated via `getDatabase()`

**`src/navigation/`**
- Purpose: React Navigation stack configuration
- Contains: 5 different navigators with typed param lists
- Pattern: Each navigator is a separate file (DRY)
- Screens are imported by navigators, not discovered automatically

**`src/screens/`**
- Purpose: Page-level components for user-facing features
- Contains: 17 screens organized by domain (auth, workout, dashboard, etc.)
- Size range: 190–1464 lines per screen
- Pattern: Each screen is self-contained with local state + context consumption

**`src/services/`**
- Purpose: Business logic not tied to React components
- Contains: Profile API calls, sync engine, ID mapping
- Key: syncEngine.ts handles complex two-phase sync
- Services are imported by contexts and screens

**`src/theme/`**
- Purpose: Centralized design tokens and theme switching
- Contains: Color palettes, typography, spacing, glass effects
- Pattern: ThemeProvider wraps entire app; useTheme() hook provides colors
- Theme mode persisted to database settings table

**`src/types/`**
- Purpose: TypeScript domain types and interfaces
- Contains: 20+ types for Workout, Exercise, Profile, etc.
- Key: Single file (index.ts) exports all types
- Used by: All layers (components, services, database)

**`src/utils/`**
- Purpose: Shared utility functions for cross-cutting concerns
- Contains: Notification scheduling, quick actions, avatar/exercise picking
- Pattern: Importable functions, no React components (except utilities)

**`src/widget/`**
- Purpose: Android home screen widget support
- Contains: Widget UI component and task handler
- Pattern: Exports widgetTaskHandler for native module registration

## Key File Locations

**Entry Points:**
- `index.ts` - Expo registration, widget handler setup
- `App.tsx` - Root component, auth gate, context nesting
- `src/navigation/AppNavigator.tsx` - Authenticated app navigation

**Configuration:**
- `package.json` - Dependencies, version info
- `tsconfig.json` - TypeScript strict mode
- `app.json` - Expo app manifest

**Core Logic:**
- `src/database/services.ts` - All database queries (50+ functions)
- `src/services/syncEngine.ts` - Bidirectional sync algorithm
- `src/contexts/SyncContext.tsx` - Sync orchestration

**Styling & Theme:**
- `src/theme/colors.ts` - Light/dark color palettes
- `src/theme/tokens.ts` - Typography, spacing, glass effects
- `src/components/glass/` - Reusable glass components

## Naming Conventions

**Files:**
- Screens: `[FeatureName]Screen.tsx` (e.g., `DashboardScreen.tsx`, `ActiveWorkoutScreen.tsx`)
- Components: `[ComponentName].tsx` (e.g., `GlassCard.tsx`, `ErrorBoundary.tsx`)
- Contexts: `[Feature]Context.tsx` (e.g., `AuthContext.tsx`, `ProfileContext.tsx`)
- Services: `[Domain]Service.ts` or `[Feature]Engine.ts` (e.g., `profileService.ts`, `syncEngine.ts`)
- Utilities: `[action]` or `[Feature]Utils.ts` (e.g., `notifications.ts`, `quickActions.ts`)

**Directories:**
- Lowercase plural (e.g., `screens/`, `services/`, `components/`)
- Feature-grouped (e.g., `glass/` subdirectory under components)

**TypeScript Types:**
- PascalCase interfaces/types (e.g., `Workout`, `Exercise`, `UserProfile`)
- Include suffix for augmented types: `WithMuscleGroup`, `WithExercises` (e.g., `ExerciseWithMuscleGroup`)
- Query result types match database row names

**Functions:**
- camelCase (e.g., `createWorkout()`, `getAllExercises()`, `syncAll()`)
- Action prefixes: `get`, `create`, `update`, `delete`, `add`, `search`, `calculate`

**Variables & Constants:**
- camelCase for local vars (e.g., `weekDays`, `monthlyStats`)
- UPPER_SNAKE_CASE for constants (e.g., `SYNC_COOLDOWN_MS`, `DATABASE_NAME`)

## Where to Add New Code

**New Feature:**
- Primary code: `src/screens/[FeatureName]Screen.tsx`
- Navigation: Add to appropriate navigator in `src/navigation/`
- Shared logic: `src/services/[Feature]Service.ts`
- Database queries: Add to `src/database/services.ts`
- Types: Add to `src/types/index.ts`
- Tests (if added): `tests/[Feature].test.ts`

**New Component/Module:**
- Reusable UI: `src/components/[ComponentName].tsx`
- Glass design components: `src/components/glass/[ComponentName].tsx`
- Custom hook: `src/hooks/use[HookName].ts`
- Utility function: `src/utils/[utilityName].ts`

**Utilities:**
- Shared helpers: `src/utils/[functionName].ts`
- Cross-cutting concerns: `src/utils/` (e.g., notifications, quick actions)
- Integration logic: `src/lib/[integration].ts` (e.g., supabase client)

## Special Directories

**`.planning/`**
- Purpose: GSD (Getting Stuff Done) documentation and planning
- Generated: Partially (created by orchestrator; some existing phases)
- Committed: Yes, version controlled
- Contents: Codebase analysis (ARCHITECTURE.md, STRUCTURE.md, etc.), phase definitions

**`assets/`**
- Purpose: Static images and resources
- Generated: No
- Committed: Yes
- Pattern: Import images via require() in components

**`.claude/` & `.claude-flow/`**
- Purpose: Claude Flow agent configuration and metrics
- Generated: Yes, created by Claude Flow orchestrator
- Committed: Yes, version controlled
- Contains: Agent definitions, helpers, skill library

## Module Dependencies

**Unidirectional flow (downward):**
```
App.tsx
  ↓
Contexts (Auth, Profile, Sync)
  ↓
Services (profileService, syncEngine)
  ↓
Database (services.ts)
  ↓
SQLite / Supabase
```

**Screens & Components:**
- Import: Contexts, database services (read-only), utils, types
- Never import other screens directly
- Never create circular dependencies between contexts

**No Circular Dependencies:**
- AuthContext imports profileService, not ProfileContext
- ProfileContext imports AuthContext (receives user from it)
- SyncContext imports AuthContext, database, syncEngine

---

*Structure analysis: 2026-03-01*
