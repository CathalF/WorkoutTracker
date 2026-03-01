# Project State

## Current Milestone
None — v3.0 archived. Ready for v4.0 planning.

## Completed Milestones
| Version | Name | Phases | Archive |
|---------|------|--------|---------|
| v1.0 | Core Workout Logging & Progress Tracking | 1-6 | [v1.0-ROADMAP.md](milestones/v1.0-ROADMAP.md) |
| v2.0 | UX & Engagement | 7-11 | [v2.0-ROADMAP.md](milestones/v2.0-ROADMAP.md) |
| v3.0 | Quality of Life & Visual Refresh | 12-17 | [v3.0-ROADMAP.md](milestones/v3.0-ROADMAP.md) |

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
| expo-blur for glass effects | 2026-02-28 | BlurView from expo-blur is the core building block for frosted glass surfaces |
| Theme mode persistence via settings | 2026-02-28 | User's theme preference (system/light/dark) stored in settings table under key 'theme_mode' |
| Monochrome + electric blue accent | 2026-02-28 | Glass surfaces are neutral grayscale; electric blue reserved for interactive elements only |
| GlassCard for exercise blocks | 2026-02-28 | ActiveWorkoutScreen exercise blocks wrapped in GlassCard instead of styled View with surface/border |
| GlassModal for all modals | 2026-02-28 | ActiveWorkoutScreen modals migrated from raw Modal+overlay to GlassModal component |
| useThemeControl over useTheme | 2026-02-28 | Screens needing isDark (for BlurView tint) use useThemeControl() instead of useTheme() |
| GlassModal for all template modals | 2026-03-01 | TemplateManagementScreen 3 plain Modals → GlassModal for consistency |
| Electric blue for all chart accents | 2026-03-01 | ProgressScreen volume bars changed from green to electric blue to match glass theme accent |
| Individual glass cards for Settings rows | 2026-03-01 | Settings rows separated into individual glass cards with margins instead of flat stacked rows |
| Custom glass header for Settings | 2026-03-01 | DashboardStackNavigator headerShown removed; SettingsScreen renders its own glass header |
| ScrollView paging for onboarding | 2026-03-01 | No pager library needed; built-in horizontal ScrollView with pagingEnabled is sufficient for 4 pages |
| Settings key for onboarding gate | 2026-03-01 | Reuses settings table with key 'onboarding_completed'; checked in App.tsx init before rendering |
| Animated API over reanimated for onboarding | 2026-03-01 | RN built-in Animated with useNativeDriver sufficient for fade+slide entrances; no new dependency |
| Skip → Setup page | 2026-03-01 | Skip button lands on setup page (not ready page) so users still configure preferences before completing |
| initialRoute via onComplete callback | 2026-03-01 | Post-onboarding navigation uses navigationRef with setTimeout(100ms) for mount timing |

---
*Last updated: 2026-03-01 — v3.0 milestone archived. 3 milestones shipped (v1.0, v2.0, v3.0).*
