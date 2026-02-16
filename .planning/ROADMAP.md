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

### Phase 4: Workout History
**Goal:** Users can browse past workouts by date and muscle group, and view session details.
- History screen with chronological workout list
- Filter/group by muscle group
- Workout detail view showing all exercises, sets, reps, weight
- Delete/edit past workouts
- **Research needed:** No

### Phase 5: Progress Charts
**Goal:** Users can see strength and volume trends per exercise over time.
- Per-exercise progress chart (weight over time, volume over time)
- Exercise selector for chart view
- Time range controls (1 month, 3 months, 6 months, all time)
- Personal records / highlights
- **Research needed:** Yes — evaluate chart libraries (react-native-chart-kit vs Victory Native vs react-native-gifted-charts) for performance and styling

### Phase 6: Polish & Launch Prep
**Goal:** Refined UI, performance tuning, and app store readiness.
- UI polish — consistent styling, animations, dark/light theme
- Performance optimization (lazy loading, query optimization for large datasets)
- Empty states, loading states, error handling
- App icon, splash screen, store listing assets
- **Research needed:** No

---
*Last updated: 2026-02-16 — Phase 3 completed*
