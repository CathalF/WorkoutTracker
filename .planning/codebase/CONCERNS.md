# Codebase Concerns

**Analysis Date:** 2026-03-01

## Tech Debt

**Large monolithic screen components:**
- Issue: Multiple screen components exceed 1000 lines, making them difficult to maintain and test
- Files:
  - `src/screens/ActiveWorkoutScreen.tsx` (1464 lines)
  - `src/screens/TemplateManagementScreen.tsx` (714 lines)
  - `src/screens/WorkoutDetailScreen.tsx` (642 lines)
  - `src/screens/ProgressScreen.tsx` (612 lines)
  - `src/screens/OnboardingScreen.tsx` (557 lines)
  - `src/screens/SettingsScreen.tsx` (555 lines)
- Impact: Complex state management, difficult to test individual features, increased cognitive load for developers
- Fix approach: Extract state management into custom hooks, break screens into smaller composable components, consider compound component pattern for related UI elements

**SQL string concatenation in sync engine:**
- Issue: Dynamic SQL queries built with template literals and string concatenation for WHERE clauses
- Files: `src/services/syncEngine.ts` (lines 565-567, 571-572)
- Example: `WHERE updated_at > '${lastSynced}'` uses direct string interpolation
- Impact: Potential SQL injection vulnerability if lastSynced is compromised; difficult to understand query logic
- Fix approach: Use parameterized queries consistently; extract query builders into helper functions

**Silent error swallowing in database operations:**
- Issue: Try-catch blocks in schema initialization ignore errors with empty catch blocks
- Files: `src/database/database.ts` (lines 125-223, approximately 20 try-catch blocks)
- Pattern: `try { database.execSync(...) } catch { }`
- Impact: Migration failures may go unnoticed; difficult to debug schema issues
- Fix approach: Log errors during schema migrations; track which migrations have run; add explicit migration tracking

**Mixed use of `any` types:**
- Issue: Type casting to `any` reduces type safety
- Files:
  - `src/screens/DashboardScreen.tsx` line 38: `useNavigation<any>()`
  - `src/screens/SettingsScreen.tsx` line 180: `navigation as any`
  - `src/screens/ExerciseLibraryScreen.tsx` line 32: `navigation: any` parameter
  - `src/utils/quickActions.ts` line 9: `items: any[]`
- Impact: Loss of type checking at those boundaries; harder to catch navigation bugs
- Fix approach: Properly type navigation hooks and utility function parameters

**Non-null assertions without validation:**
- Issue: Non-null assertions (!) used without defensive checks in several places
- Files: `src/database/services.ts` line 152, `src/screens/ActiveWorkoutScreen.tsx`
- Pattern: `.get(id)!` or `.exerciseMap.get(set.exercise_id)!.sets.push(...)`
- Impact: Runtime crashes if Map lacks expected key
- Fix approach: Use safe access patterns with null coalescing or optional chaining

**Silent error handling in notifications:**
- Issue: Exception handlers silently swallow errors in critical flows
- Files: `src/utils/notifications.ts` (lines 96-98, 125-127, 153-155, 161-174)
- Pattern: `try { ... } catch {}`
- Impact: Notification scheduling failures go undetected; users don't know their rest timers failed
- Fix approach: Log errors; provide user feedback for notification failures; add retry mechanism

## Known Bugs

**Mutation tracking inconsistency in sync:**
- Symptoms: Custom exercises created locally may not sync properly if muscle group mapping fails silently
- Files: `src/services/syncEngine.ts` (lines 165-177, 184-185)
- Trigger: Create custom exercise → Sign in on another device → Exercise doesn't appear or causes sync errors
- Workaround: Manually sync after creating custom exercises; verify no console errors
- Root cause: When `getRemoteMuscleGroupId()` returns null, the mapping silently skips without logging

**Race condition in initialization:**
- Symptoms: Onboarding state may show briefly before app fully initializes
- Files: `App.tsx` (lines 124-162, 160-162)
- Trigger: Fast app startup with slow device or heavy SQLite operations
- Workaround: None — users may briefly see wrong screen
- Root cause: `isReady` and `onboardingDone` state updates race; no guarantee database query completes before navigation

**Last performance data not refreshing:**
- Symptoms: When starting a workout from template, previous set data shows incorrect or stale values
- Files: `src/screens/ActiveWorkoutScreen.tsx` (lines 158-182)
- Trigger: Complete a workout → Start new workout from template → Previous performance doesn't update
- Workaround: Close and reopen the app
- Root cause: `getLastPerformance()` called only on component mount; doesn't refresh after workouts are created

**Weight/reps validation missing:**
- Symptoms: User can submit workout with invalid weight (negative) or reps (0) values
- Files: `src/screens/ActiveWorkoutScreen.tsx` (no validation visible in input handlers)
- Trigger: Enter negative weight → Complete set → Negative value saved to database
- Workaround: None — manually edit workout detail
- Root cause: No numeric validation or range checking in set input handlers

## Security Considerations

**Authentication state not persisted securely:**
- Risk: Session tokens stored in Supabase context; no refresh token rotation on app background
- Files: `src/contexts/AuthContext.tsx` (lines 21-32, no token refresh on AppState change)
- Current mitigation: Supabase SDK handles session internally; async storage for recovery
- Recommendations:
  - Implement token refresh on app foreground
  - Consider secure enclave storage for sensitive tokens on native platforms
  - Add session timeout logic

**Supabase connection string in environment vars (acceptable but verify):**
- Risk: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` in `src/lib/supabase.ts` lines 6-7
- Files: `src/lib/supabase.ts`
- Current mitigation: Anon key has RLS policies; production uses environment variables, not hardcoded
- Recommendations:
  - Verify `.env.local` is in `.gitignore`
  - Audit Supabase RLS policies regularly
  - Consider adding rate limiting at database layer

**No input validation at system boundaries:**
- Risk: User inputs (exercise names, workout notes) go directly into database without sanitization
- Files: `src/database/services.ts` (lines 61-69, 88-97), `src/screens/ActiveWorkoutScreen.tsx`
- Current mitigation: SQLite parameter binding prevents SQL injection; no stored procedures
- Recommendations:
  - Add length limits and character restrictions
  - Sanitize before display to prevent XSS if data ever synced to web
  - Validate weight/reps numeric ranges

**File path traversal not applicable but verify image handling:**
- Risk: Image picker and avatar uploads may not validate file types
- Files: `src/services/profileService.ts` (image upload via Supabase)
- Current mitigation: Supabase handles storage; client-side uses expo-image-picker
- Recommendations:
  - Add file type validation on image selection
  - Set max file size limits
  - Review Supabase storage policies

## Performance Bottlenecks

**Synchronous database operations block UI thread:**
- Problem: All database calls use `.getAllSync()`, `.runSync()`, `.getFirstSync()` — synchronous blocking calls
- Files:
  - `src/database/services.ts` (throughout)
  - `src/services/syncEngine.ts` (throughout — fetches and pushes in loops)
  - `src/database/database.ts` (schema initialization)
- Cause: Expo SQLite's sync API blocks React Native thread; large queries (1000+ sets) will freeze UI
- Improvement path:
  - Batch database operations in background tasks
  - Use pagination for queries returning many rows
  - Consider async SQLite adapter if available
  - Implement data fetching with loading indicators for sync operations

**Incremental sync pulls all tables every time:**
- Problem: `syncAll()` iterates through all 7 tables even if only one changed
- Files: `src/services/syncEngine.ts` (lines 498-527)
- Cause: No per-table change tracking; timestamp-based filtering is coarse-grained
- Improvement path:
  - Add `last_synced_per_table` tracking
  - Implement selective sync based on what actually changed
  - Add background sync that doesn't block main thread

**ActiveWorkoutScreen state re-renders on every keystroke:**
- Problem: Complex state maps (completedSets, restTimes, lastPerformance) update frequently
- Files: `src/screens/ActiveWorkoutScreen.tsx` (lines 57-89)
- Cause: No memoization of derived state; all context values trigger re-renders
- Improvement path:
  - Memoize local state slices
  - Use `useMemo` for derived calculations
  - Consider moving set entry logic to separate component

**Template loading fetches all exercises on every template open:**
- Problem: `getTemplateWithExercises()` does full JOIN without pagination
- Files: `src/database/services.ts` (lines 301-325)
- Cause: No caching; queries run synchronously on each screen mount
- Improvement path:
  - Cache template data in context
  - Implement data invalidation on changes
  - Add indexes for template + exercise queries

## Fragile Areas

**Sync ID mapping migration logic:**
- Files: `src/services/syncEngine.ts` (lines 105-134, 145-178), `src/services/syncIdMap.ts`
- Why fragile: Complex mapping between local auto-increment IDs and remote UUIDs; no transaction semantics
- Safe modification:
  - Test all entity type combinations (custom exercises + programs + templates)
  - Add rollback capability if mapping fails midway
  - Verify muscle group name mapping handles duplicates
- Test coverage: No visible test files for sync logic; critical path untested

**Active workout state machine:**
- Files: `src/screens/ActiveWorkoutScreen.tsx` (lines 220-300, state transitions)
- Why fragile: Multiple state maps (exercises, completedSets, restTimes, etc.) must stay in sync; removing exercises remaps set keys
- Safe modification:
  - Add invariant checks after state updates
  - Log state transitions for debugging
  - Test edge cases (remove exercise mid-timer, reorder exercises with completed sets)
- Test coverage: No visible tests; critical user workflow

**Notification scheduling without persistence:**
- Files: `src/utils/notifications.ts` (lines 50-155)
- Why fragile: Notifications scheduled in memory; app restart clears all pending notifications
- Safe modification:
  - Persist scheduled notification IDs to database
  - Reload and reschedule on app launch
  - Add idempotency checks to prevent duplicates
- Test coverage: No visible test coverage

## Scaling Limits

**Local SQLite database size:**
- Current capacity: Expo SQLite on device storage; typically 1-5 GB available
- Limit: With 1000 workouts × 15 sets × 4 exercises, you hit ~1 MB; 100k workouts = 100 MB; manageable but no archival
- Scaling path:
  - Implement data archival (move old workouts to cloud)
  - Add database cleanup for deleted records marked with `deleted_at`
  - Monitor database file size; warn users if approaching limits

**Sync engine throughput:**
- Current capacity: Single user, serial push/pull; ~100 workouts sync in ~5 seconds on fast connection
- Limit: Multiple users or large datasets will bottleneck; no parallel table sync
- Scaling path:
  - Parallelize push/pull for independent tables
  - Batch Supabase inserts (currently upserts one-by-one)
  - Implement delta compression for network efficiency

**In-memory state in screens:**
- Current capacity: `ActiveWorkoutScreen` maintains ~100 set entries in state comfortably
- Limit: 500+ sets or exercises will cause lag/memory pressure
- Scaling path:
  - Virtualize long lists
  - Move to indexed DB or local cache layer
  - Stream large result sets

## Dependencies at Risk

**Expo ecosystem API stability:**
- Risk: `expo-sqlite`, `expo-notifications`, `expo-quick-actions` may have breaking changes
- Impact: App relies on these for core functionality; breaking changes require rewrite
- Migration plan:
  - Version lock all Expo packages
  - Monitor breaking changes in Expo releases
  - Plan for React Native community SQLite migration if Expo deprecates

**Supabase client SDK version compatibility:**
- Risk: `@supabase/supabase-js` v2.98.0; major version changes may break API
- Impact: Sync engine directly depends on SDK; breaking changes block auth/sync
- Migration plan:
  - Maintain version pinning strategy
  - Create adapter layer for Supabase calls
  - Plan upgrade path to v3 when stable

**React Native version mismatch risk:**
- Risk: React Native 0.81.5 with React 19.1.0 — relatively new combination
- Impact: Potential incompatibilities with third-party libraries; limited community support
- Migration plan:
  - Regularly test with React Native upgraded versions
  - Monitor expo@54 stability

## Missing Critical Features

**Offline-first data access:**
- Problem: All data queries assume local SQLite database is present; no offline mode documented
- Blocks: Users can't review past workouts if sync fails; read-only mode not implemented
- Impact: UX degrades to white screen if sync engine crashes
- Priority: High

**Data validation framework:**
- Problem: No centralized validation for inputs; each screen validates independently (or not at all)
- Blocks: Can't guarantee data integrity; garbage data gets synced to server
- Impact: Data corruption in server; difficult to fix
- Priority: High

**Error recovery and retry logic:**
- Problem: Sync failures show error message but don't retry; no exponential backoff
- Blocks: Temporary network issues cause permanent sync failure until app restart
- Impact: Users lose recent workouts; data inconsistency
- Priority: Medium

**Workout undo/redo:**
- Problem: Completing a workout and realizing a typo has no recovery path except manual editing
- Blocks: Users can't quickly fix mistakes; must navigate to edit screen
- Impact: Poor user experience; incorrect data persisted
- Priority: Low

## Test Coverage Gaps

**Sync engine migration logic untested:**
- What's not tested: Initial migration with mixed seed/custom exercises, program/template mapping, error handling
- Files: `src/services/syncEngine.ts`
- Risk: Silent mapping failures; corrupted ID relationships; could silently lose data during migration
- Priority: Critical

**Database schema migrations untested:**
- What's not tested: Upgrade path when adding columns (altered tables); no test for ALTER TABLE failures
- Files: `src/database/database.ts` (lines 125-223)
- Risk: Column additions fail silently; app crashes on queries against missing columns
- Priority: Critical

**Active workout state machine untested:**
- What's not tested: Removing exercises mid-timer, reordering with completed sets, rapid add/remove cycles
- Files: `src/screens/ActiveWorkoutScreen.tsx`
- Risk: State inconsistency; UI crashes; lost user input
- Priority: High

**Notification scheduling robustness untested:**
- What's not tested: Duplicate notifications, notification expiry, app restart with pending notifications
- Files: `src/utils/notifications.ts`
- Risk: Users get duplicate notifications or miss scheduled timers
- Priority: Medium

**PR detection edge cases untested:**
- What's not tested: PR when no history exists, PR with decimal weights, identical weight/reps records
- Files: `src/database/services.ts` (lines 375-451), `src/screens/ActiveWorkoutScreen.tsx`
- Risk: False positives/negatives in PR detection; incorrect records
- Priority: Medium

---

*Concerns audit: 2026-03-01*
