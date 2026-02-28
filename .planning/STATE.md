# Project State

## Current Milestone
None — v2.0 completed, v3.0 not yet planned

## Completed Milestones
| Version | Name | Phases | Archive |
|---------|------|--------|---------|
| v1.0 | Core Workout Logging & Progress Tracking | 1-6 | [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) |
| v2.0 | UX & Engagement | 7-11 | [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) |

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
| Exercises tab → Dashboard tab | 2026-02-28 | Replaced Exercises tab with Dashboard as default tab; Exercise Library still accessible via ExercisePicker during workout flow |
| settings key-value table | 2026-02-28 | Simple key-value store for user preferences (weekly_goal); extensible for future settings |
| PR detection on set completion | 2026-02-28 | Synchronous PR check against historical sets table in toggleSetComplete(); session deduplication via Set keys |
| JSON notification_prefs in settings | 2026-02-28 | NotificationPreferences stored as JSON string in settings table under key 'notification_prefs' |
| DashboardStackNavigator for Settings | 2026-02-28 | Dashboard tab uses a native stack navigator to push Settings screen; gear icon navigates instead of opening a modal |
| Fire-and-forget notification hooks | 2026-02-28 | handleWorkoutCompleted() called without await after saving workout — notifications are non-critical |
| iOS widget deferred | 2026-02-28 | WidgetKit requires Swift/SwiftUI via @bacons/apple-targets; defer until expo-widgets matures in SDK 55+ |
| expo-quick-actions for shortcuts | 2026-02-28 | Cross-platform app icon shortcuts; expo-quick-actions by Evan Bacon, works with SDK 54 |
| react-native-android-widget for widget | 2026-02-28 | Android widget via config plugin; headless JS handler queries expo-sqlite directly using existing service functions |
| SQLite in widget headless context | 2026-02-28 | getDatabase() lazy-opens DB with idempotent schema init — safe in headless JS task for widget rendering |
| Minimal param forwarding from ExercisePicker | 2026-02-28 | ExercisePicker passes only selectedExercise when navigating back; React Navigation merges with existing ActiveWorkout params |
| First set is always a PR | 2026-02-28 | checkForWeightPR/checkForRepsPR return true when no prior data exists — first set for any exercise is a personal record |

---
*Last updated: 2026-02-28 — v2.0 milestone archived*
