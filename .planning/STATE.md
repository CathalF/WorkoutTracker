# Project State

## Current Milestone
v2.0 — UX & Engagement

## Current Phase
Phase 9: Streak Tracking & Motivation

## Phase Status
| Phase | Name | Status |
|-------|------|--------|
| 7 | Workout Templates & Quick Start | completed |
| 8 | Rest Timer & Active Workout UX | completed |
| 9 | Streak Tracking & Motivation | not started |
| 10 | Notifications & Reminders | not started |
| 11 | Home Screen Widget & Quick Actions | not started |

## Plan Status
| Phase | Plan | Status |
|-------|------|--------|
| 7 | 07-01 | completed |
| 8 | 08-01 | completed |
| 9 | — | not started |
| 10 | — | not started |
| 11 | — | not started |

## Active Issues
None

## Decisions Log
| Decision | Date | Context |
|----------|------|---------|
| expo-sqlite sync API | 2026-02-16 | Used openDatabaseSync + execSync for simpler init flow |
| Slug workout-tracker | 2026-02-16 | create-expo-app requires URL-friendly names; display name "Workout Tracker" |
| Home tab → Exercises tab | 2026-02-16 | Replaced Home tab with Exercise Library as the default tab for direct access |
| In-memory workout state | 2026-02-16 | Workout data kept in component state during session, only persisted to SQLite on "Finish Workout" |
| Exercise selection via nav params | 2026-02-16 | ExercisePicker passes selectedExercise back to ActiveWorkout via route params |
| Delete icon over swipe-to-delete | 2026-02-16 | Used explicit delete icon on set rows instead of swipe gesture for simpler implementation |
| react-native-gifted-charts | 2026-02-18 | Chosen for zero native modules, Expo Go compatible, built-in tooltips and area charts |
| Static colors for ErrorBoundary | 2026-02-28 | ErrorBoundary uses hardcoded colors since it wraps ThemeProvider and cannot use useTheme() |
| JSON for muscle_group_ids | 2026-02-28 | Template muscle_group_ids stored as JSON string in SQLite, parsed on read |
| Inline exercise picker for management | 2026-02-28 | TemplateManagement uses its own modal exercise picker instead of navigating to ExercisePicker screen |
| Timestamp-based timer | 2026-02-28 | Rest timer uses Date.now() + duration with setInterval(250ms) for smooth countdown; AppState listener recalculates on foreground return |
| expo-notifications for background timer | 2026-02-28 | Local notification scheduled on timer start, cancelled on in-app completion — no expo-task-manager needed |
| ALTER TABLE try/catch migration | 2026-02-28 | SQLite ALTER TABLE ADD COLUMN throws if column exists; wrapped in try/catch since IF NOT EXISTS isn't supported |

---
*Last updated: 2026-02-28 — Phase 8 completed, advancing to Phase 9*
