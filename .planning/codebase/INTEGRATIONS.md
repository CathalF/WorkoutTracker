# External Integrations

**Analysis Date:** 2026-03-01

## APIs & External Services

**Supabase Cloud (Primary Backend):**
- Cloud-hosted PostgreSQL database and authentication
  - SDK/Client: `@supabase/supabase-js` 2.98.0
  - Auth: Email/password authentication via Supabase Auth
  - Implementation: `src/lib/supabase.ts`
  - Context: `src/contexts/AuthContext.tsx`

## Data Storage

**Databases:**

**Local - SQLite (Offline-First):**
- Type: Embedded SQLite via Expo SQLite 16.0.10
- Location: Device storage (`workout-tracker.db`)
- Client: `expo-sqlite` OpenDatabaseSync API
- Schema: `src/database/database.ts`
- Tables: muscle_groups, exercises, workouts, sets, programs, workout_templates, template_exercises, personal_records, settings, sync_meta, sync_id_map
- Features:
  - WAL (Write-Ahead Logging) mode enabled for concurrent access
  - Foreign key constraints enforced
  - Soft deletes (deleted_at column on all major tables)
  - Sync metadata tracking (sync_meta, sync_id_map tables)
  - Timestamps (created_at, updated_at) on all tables
- Migrations: Dynamic schema initialization with ALTER TABLE fallback for column additions

**Remote - Supabase PostgreSQL:**
- Cloud database mirrored from local schema
- Schema: `src/lib/supabase-schema.sql`
- Row-Level Security enabled for user data isolation
- Tables synchronized via custom sync engine (see Sync Engine below)
- Auth integration: User data scoped by auth.users.id (UUID)
- Profiles table: User profile data (display_name, bio, avatar_url)

**File Storage:**
- Not yet integrated
- Avatar/image storage: Prepared in UserProfile type but implementation pending
- Image picker available via `expo-image-picker` 17.0.10

**Caching:**
- AsyncStorage via `@react-native-async-storage/async-storage` 2.2.0
  - Used for: Session persistence, app state, notification preferences
  - Platform-specific: Native iOS Keychain equivalent, Android SharedPreferences

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (Email/Password)
- Implementation: `src/contexts/AuthContext.tsx`
- Operations:
  - Sign up: `supabase.auth.signUp(email, password)`
  - Sign in: `supabase.auth.signInWithPassword(email, password)`
  - Sign out: `supabase.auth.signOut()`
  - Password reset: `supabase.auth.resetPasswordForEmail(email)`
- Session Management:
  - Auto-refresh tokens enabled
  - Session persistence via AsyncStorage (native platforms) or localStorage (web)
  - Auto-resume on app foreground (Platform.OS detection in `src/lib/supabase.ts`)
  - Background token refresh stops when app backgrounded (AppState listener)

**Screens:**
- Sign-up flow: `src/screens/SignUpScreen.tsx`
- Sign-in flow: `src/screens/SignInScreen.tsx`
- Password reset: `src/screens/ForgotPasswordScreen.tsx`
- Profile setup: `src/screens/ProfileSetupScreen.tsx`

## Monitoring & Observability

**Error Tracking:**
- None integrated (prepared for future)
- Current approach: console logging with try-catch blocks

**Logs:**
- Console logging via `console.warn()`, `console.log()`
- Notification sync logging: `src/utils/notifications.ts` line 175
- Sync engine logging: `src/services/syncEngine.ts`

## CI/CD & Deployment

**Hosting:**
- Expo (managed cloud build service)
- Native builds compiled via Expo cloud

**CI Pipeline:**
- None detected
- Development: `npm start` → Expo dev client
- Production: Expo cloud builds (iOS, Android)

**Scripts Available:**
- `npm start` - Start Expo development server
- `npm run android` - Build/run on Android
- `npm run ios` - Build/run on iOS
- `npm run web` - Run in web browser

## Environment Configuration

**Required env vars:**

Set in `.env.local` (Expo uses `EXPO_PUBLIC_` prefix):
- `EXPO_PUBLIC_SUPABASE_URL` - Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous/public key (NOT a secret key)

**Secrets location:**
- Development: `.env.local` (gitignored, contains public Supabase keys only)
- No private/secret keys in frontend (Supabase uses RLS for data protection)
- Production: Managed via Expo Secrets in Expo dashboard

**Reference in code:**
- `src/lib/supabase.ts` reads `process.env.EXPO_PUBLIC_SUPABASE_URL` and `process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY`
- Must be set before app starts (verified with `!` non-null assertion)

## Webhooks & Callbacks

**Incoming:**
- None configured

**Outgoing:**
- Supabase Auth listeners: `src/contexts/AuthContext.tsx` line 27
  - `supabase.auth.onAuthStateChange()` subscription for session updates

## Sync Engine

**Custom Implementation:** `src/services/syncEngine.ts`

**Purpose:**
- Bidirectional sync between local SQLite and remote Supabase
- Handles:
  - Push: Local changes → Supabase
  - Pull: Remote changes → Local
  - Conflict resolution via timestamps (last-write-wins)
  - Soft deletes tracking
  - ID mapping between local integer IDs and remote UUIDs

**Sync Metadata:**
- Location: `src/services/syncIdMap.ts`
- Tables: sync_meta, sync_id_map
- Tracks: last_synced_at timestamp, local-to-remote ID mappings

**Triggered By:**
- Manual sync operations (invoked from screens)
- App foreground state changes (AppState listener)
- Notification schedule sync: `src/utils/notifications.ts` line 160

## Notifications

**Local Notifications:** `src/utils/notifications.ts`

**Framework:** Expo Notifications 0.32.16

**Features:**
- Rest timer notifications (during active workouts)
- Weekly workout reminders (customizable days/time)
- Inactivity nudges (after N days without workout)
- Rest day suggestions (after consecutive training days)
- Android notification channels: rest-timer, workout-reminders

**Configuration:**
- Notification preferences stored in local SQLite
- Scheduling: WEEKLY, TIME_INTERVAL, DATE trigger types
- Platform-specific: Android uses notification channels; iOS uses default

**Quick Actions:**
- Home screen quick actions: `src/utils/quickActions.ts`
- iOS: Symbol SF Symbols (dumbbell.fill, plus.circle.fill)
- Android: Text-based quick actions
- Updates on template changes via `refreshQuickActions()`

## Android Widget

**Implementation:** `react-native-android-widget` 0.20.1

**Widget:** WorkoutWidget
- Display: Streak count and recent workout info
- Dimensions: 4x2 grid cells, 250dp x 110dp minimum
- Update interval: 30 minutes (1,800,000 ms)
- Task handler: `src/services/widgetTaskHandler.ts` (if present)

---

*Integration audit: 2026-03-01*
