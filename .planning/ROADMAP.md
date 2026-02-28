# Workout Tracker — Roadmap

## Milestone: v1.0 — Core Workout Logging & Progress Tracking

Ship a local-first mobile app that replaces the notes-app workflow with structured workout logging and progress visibility.

### Phase 1: Project Setup & Navigation Shell *(1 plan — 01-01 completed)*
**Goal:** Bootstrapped Expo project with TypeScript, navigation skeleton, and SQLite database schema in place.
- Initialize Expo project with TypeScript template
- Install and configure dependencies (React Navigation, expo-sqlite)
- Set up tab/stack navigation structure (Home, Log Workout, History, Progress)
- Design and create SQLite schema (muscle_groups, exercises, workouts, sets)
- Seed exercise library with common exercises per muscle group
- **Research needed:** No

### Phase 2: Exercise Library & Data Layer *(1 plan — 02-01 completed)*
**Goal:** Working data layer with exercise CRUD and a browsable exercise library screen.
- Build database service layer (queries for exercises, workouts, sets)
- Create Exercise Library screen — browse exercises grouped by muscle group
- Search/filter exercises
- Add custom exercise support
- **Research needed:** No

### Phase 3: Workout Logging Flow *(1 plan — 03-01 completed)*
**Goal:** Users can start a workout, select muscle group, pick exercises, and log sets/reps/weight with minimal taps.
- Muscle group selection screen (legs, chest, back, chest & biceps, shoulders & triceps, custom)
- Exercise picker within selected muscle group
- Set logging UI — fast entry for weight, reps, sets with number pads and quick-increment buttons
- Active workout screen showing running list of logged exercises and sets
- Save completed workout to SQLite
- **Research needed:** No

### Phase 4: Workout History *(1 plan — 04-01 completed)*
**Goal:** Users can browse past workouts by date and muscle group, and view session details.
- History screen with chronological workout list
- Filter/group by muscle group
- Workout detail view showing all exercises, sets, reps, weight
- Delete/edit past workouts
- **Research needed:** No

### Phase 5: Progress Charts *(1 plan — 05-01 completed)*
**Goal:** Users can see strength and volume trends per exercise over time.
- Per-exercise progress chart (weight over time, volume over time)
- Exercise selector for chart view
- Time range controls (1 month, 3 months, 6 months, all time)
- Personal records / highlights
- **Research needed:** Yes — evaluate chart libraries (react-native-chart-kit vs Victory Native vs react-native-gifted-charts) for performance and styling

### Phase 6: Polish & Launch Prep *(1 plan — 06-01 completed)*
**Goal:** Refined UI, performance tuning, and app store readiness.
- UI polish — consistent styling, animations, dark/light theme
- Performance optimization (lazy loading, query optimization for large datasets)
- Empty states, loading states, error handling
- App icon, splash screen, store listing assets
- **Research needed:** No

---

## Milestone: v2.0 — UX & Engagement

Elevate the workout experience with templates, timers, streaks, and smart reminders — making the app a daily habit, not just a logging tool.

### Phase 7: Workout Templates & Quick Start *(1 plan — 07-01 completed)*
**Goal:** Users can save workouts as reusable templates and start new sessions from them with one tap.
- Save completed workout as a template (name, exercises, default sets/reps/weight)
- Quick-start workout from template (pre-fills exercises and sets)
- Template management screen (rename, edit, delete templates)
- Program grouping for templates
- Previous performance reference when starting from template
- **Research needed:** No

### Phase 8: Rest Timer & Active Workout UX
**Goal:** Built-in rest timer and improved active workout experience to reduce friction between sets.
- Auto-start rest timer on set completion with configurable durations
- Timer notification/alert when rest period ends
- Per-exercise default rest time settings
- Active workout UX improvements (reorder exercises, add notes per set)
- **Research needed:** Yes — evaluate background timer and notification approaches in Expo (expo-notifications, expo-task-manager)

### Phase 9: Streak Tracking & Motivation
**Goal:** Gamify consistency with streak counters, workout frequency stats, and personal record celebrations.
- Workout streak counter (consecutive days/weeks of training)
- Weekly and monthly workout frequency stats on home/dashboard
- Personal records detection and celebration (new PR badges/toasts)
- Motivational summary cards (total volume lifted, workouts this month)
- **Research needed:** No

### Phase 10: Notifications & Reminders
**Goal:** Keep users on track with scheduled workout reminders and smart nudges.
- Scheduled workout reminder notifications (configurable days/times)
- Rest day suggestions based on recent workout history
- "You haven't worked out in X days" re-engagement nudges
- Notification preferences screen
- **Research needed:** Yes — evaluate expo-notifications setup, permissions flow, and scheduling API

### Phase 11: Home Screen Widget & Quick Actions
**Goal:** Surface key workout data on the home screen and enable fast app entry points.
- Home screen widget showing current streak and last workout summary
- Quick actions (3D Touch / long press) for starting workouts from templates
- Widget configuration options
- **Research needed:** Yes — evaluate react-native widget libraries (react-native-android-widget, WidgetKit) and Expo compatibility

---
*Last updated: 2026-02-28 — Phase 7 completed*
