# Phase 11 Plan 11-01 — UAT Issues

## Issue 1: App crash in Expo Go — QuickActions.useQuickActionCallback undefined
- **Severity:** Critical (P0)
- **Status:** FIXED
- **Category:** Runtime crash
- **Description:** `expo-quick-actions` native module is not available in Expo Go. The `require('expo-quick-actions')` succeeds (JS package installed) but `useQuickActionCallback` is `undefined`, causing a crash on app launch.
- **Fix applied:** Updated App.tsx to check `typeof mod.useQuickActionCallback === 'function'` before using the real module; falls back to a no-op stub.
- **Commit:** (pending)

## Issue 2: Only last exercise saved when logging multi-exercise workout
- **Severity:** Critical (P0)
- **Status:** OPEN
- **Category:** Data loss
- **Description:** When a workout includes multiple exercises (e.g., Leg Press then another exercise), only the most recently added exercise is saved to History. Earlier exercises are lost.
- **Steps to reproduce:**
  1. Start a workout, pick a muscle group
  2. Add an exercise, log sets
  3. Add a second exercise, log sets
  4. Tap Finish Workout
  5. Check History — only the last exercise appears
- **Suspected area:** `ActiveWorkoutScreen.tsx` — exercise state management or `handleFinishWorkout()` save logic
- **Pre-existing:** Unknown — may predate Phase 11

## Issue 3: Template save fails with NOT NULL constraint on muscle_group_id
- **Severity:** High (P1)
- **Status:** OPEN
- **Category:** Feature broken
- **Description:** After finishing a workout, attempting to save it as a template throws: `SQLiteErrorException: Error code 19: NOT NULL constraint failed: workout_templates.muscle_group_id`
- **Steps to reproduce:**
  1. Complete a workout (any muscle group)
  2. Tap "Save as Template" on completion
  3. Error alert appears
- **Suspected area:** Template save logic passing `null`/`undefined` for `muscle_group_id`
- **Pre-existing:** Unknown

## Issue 4: Dashboard PR cards not displaying
- **Severity:** Medium (P2)
- **Status:** OPEN
- **Category:** Display issue
- **Description:** Dashboard does not show Personal Record cards. All other Dashboard sections (streak, weekly overview, monthly stats) display correctly.
- **Pre-existing:** Unknown — may predate Phase 11

## Issue 5: Quick actions & Android widget untested (Expo Go limitation)
- **Severity:** N/A
- **Status:** SKIPPED
- **Category:** Cannot test
- **Description:** Quick actions (long-press app icon shortcuts) and Android home screen widget require a development build. These features cannot be verified in Expo Go. The code is in place but functionality is untested.
- **Items skipped:**
  - Quick action shortcuts appear on long-press
  - Template shortcuts navigate to ActiveWorkout (warm/cold start)
  - "Start Workout" shortcut opens StartWorkout screen
  - Android widget appears in widget picker
  - Widget displays streak, monthly workouts, last workout
  - Widget "Start Workout" button deep links
  - Widget updates after workout completion / app startup

---
*UAT conducted: 2026-02-28*
