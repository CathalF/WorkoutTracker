# Plan 11-01-FIX Summary

## Result: COMPLETED

Fixed 3 UAT issues (1 critical, 1 major, 1 medium) from plan 11-01 verification.

## Changes

### Task 1: Fix ExercisePicker param forwarding (UAT-002 + UAT-003)
**Root cause:** `ExercisePickerScreen.selectExercise()` spread its own `route.params` (`workoutId`, `muscleGroupIds`, `alreadyAddedIds`) when navigating back to ActiveWorkout, omitting `muscleGroupId` and `splitLabel` (ActiveWorkout-only params). The `as any` cast silenced TypeScript. This caused:
- **UAT-002:** Potential exercise state loss during navigation lifecycle, resulting in only the last exercise being saved.
- **UAT-003:** `handleSaveTemplate()` received `undefined` for `muscleGroupId` (no fallback like `handleFinishWorkout` had), causing NOT NULL constraint failure.

**Fix:**
- Removed `...route.params` spread from ExercisePicker — now passes only `{ selectedExercise }`. React Navigation merges with existing ActiveWorkout params.
- Added `origMuscleGroupIdRef`, `origSplitLabelRef`, `origMuscleGroupIdsRef` refs in ActiveWorkoutScreen to preserve initial params as defense-in-depth.
- Added ref-based fallbacks in both `handleFinishWorkout` and `handleSaveTemplate`.
- Added null guard on `resolvedMgId` in `handleSaveTemplate` matching the existing pattern in `handleFinishWorkout`.

**Commits:** `331f4b4`, `dc46004`

### Task 2: Fix PR detection for first-time exercises (UAT-004)
**Root cause:** `checkForWeightPR()` and `checkForRepsPR()` returned `false` when `MAX(weight)` / `MAX(reps)` was `NULL` (no prior sets for exercise). Since PR detection runs during the workout (before sets are saved to DB), the first set for any exercise was never detected as a PR. The `personal_records` table stayed permanently empty.

**Fix:** Changed the null-check returns from `false` to `true` — the first set for any exercise is always a PR.

**Commit:** `c2f4f2e`

## Files Modified
| File | Changes |
|------|---------|
| `src/screens/ExercisePickerScreen.tsx` | Removed `...route.params` spread in `selectExercise()` |
| `src/screens/ActiveWorkoutScreen.tsx` | Added param-preserving refs, ref-based fallbacks in save/template functions, null guard |
| `src/database/services.ts` | Fixed `checkForWeightPR` and `checkForRepsPR` null handling |

## Issues Resolved
| Issue | Severity | Status |
|-------|----------|--------|
| UAT-002: Only last exercise saved | Critical | FIXED |
| UAT-003: Template save NOT NULL constraint | Major | FIXED |
| UAT-004: Dashboard PR cards not displaying | Medium | FIXED |

## Deviations
- Added null guard for `resolvedMgId` in `handleSaveTemplate` to fix TypeScript error (`number | null` not assignable to `number`). This aligns with the existing guard pattern in `handleFinishWorkout`.

---
*Completed: 2026-02-28*
