# Workout Tracker

A clean, purpose-built mobile app for everyday gym goers to log workouts and track strength progress over time — replacing the messy notes app workflow.

## Current State
**Shipped:** v2.0 (2026-02-28)

The app is a fully functional local-first workout tracker with:
- Structured workout logging with muscle group splits and exercise picker
- Reusable workout templates with program grouping and previous performance reference
- Built-in rest timer with background notifications and per-exercise settings
- Dashboard with weekly training overview, consistency streaks, and monthly stats
- Real-time personal record detection with celebration modals
- Progress charts with weight/volume trends and time range controls
- Workout history with date grouping, filtering, and inline editing
- Scheduled workout reminders, inactivity nudges, and rest day suggestions
- Android home screen widget and app icon quick actions
- Dark/light theme, error boundaries, and polished UI

## Problem

Gym goers track workouts in their phone's notes app. It works, but it's slow to enter, impossible to see trends, and has no structure. There's no way to quickly see "am I getting stronger on bench press?" without scrolling through weeks of unformatted text.

## Solution

A native mobile app (React Native + Expo) with:
- **Muscle group organization** — select your split (legs, chest, back, chest & biceps, shoulders & triceps, etc.) to structure each session
- **Fast structured logging** — log exercise, sets, reps, and weight with minimal taps, not freeform typing
- **Progress visibility** — charts and history showing strength/volume trends per exercise over weeks and months

## Target User

Everyday gym goers who already track workouts but are limited by notes apps. They know what exercises they do, they follow a split routine, and they want to see if they're progressing.

## Requirements

### Validated

- [x] Muscle group selection per workout session (legs, chest, back, chest & biceps, shoulders & triceps, custom)
- [x] Exercise logging with sets, reps, and weight per exercise
- [x] Fast entry UI — minimal taps to log a full workout
- [x] Workout history — view past sessions organized by date and muscle group
- [x] Progress charts — visualize strength/volume trends per exercise over time
- [x] Exercise library — common exercises pre-loaded, organized by muscle group
- [x] Local-first data storage (on-device, no account required)
- [x] Clean, modern mobile UI optimized for use between sets
- [x] Workout templates with quick-start and previous performance reference
- [x] Rest timer with background notifications and per-exercise settings
- [x] Streak tracking with weekly consistency counter
- [x] Personal record detection and celebration
- [x] Dashboard with stats overview
- [x] Scheduled workout reminders and notification preferences
- [x] Android home screen widget and quick actions

### Active

(None — planning v3.0)

### Out of Scope

- Social features (sharing, leaderboards, friend feeds) — not a social app
- Nutrition/calorie tracking — workouts only
- AI coaching or exercise suggestions — user knows their routine
- Cloud sync/accounts — deferred to future version
- Desktop/web version — mobile-first

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React Native + Expo (SDK 54) | Fast dev cycle, cross-platform, large ecosystem |
| Language | TypeScript | Type safety, better DX |
| Local Storage | SQLite (expo-sqlite) | Structured relational data, good for queries and progress aggregation |
| Charts | react-native-gifted-charts | Zero native modules, Expo Go compatible, built-in tooltips |
| Navigation | React Navigation | Standard for React Native |
| Notifications | expo-notifications | Local scheduled notifications for reminders and timer alerts |
| Widget | react-native-android-widget | Android home screen widget via config plugin |
| Quick Actions | expo-quick-actions | Cross-platform app icon shortcuts |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native + Expo over Flutter | JS/TS ecosystem familiarity, faster iteration, Expo simplifies builds | Validated |
| Local-first storage | Simplicity for v1, no backend needed, works offline at the gym | Validated |
| SQLite over AsyncStorage | Workout data is relational (exercises → sets → reps), need aggregation queries for progress charts | Validated |
| Progress visibility as core priority | This is the #1 thing that makes the app better than a notes app | Validated |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss (local-only) | High — users lose all workout history | Clear v3 plan for cloud sync; encourage device backups |
| Logging speed not fast enough | High — users revert to notes app | Prioritize UX testing of entry flow; benchmark against notes app speed |
| Chart performance with large datasets | Medium — slow rendering after months of data | Paginate/aggregate data; lazy load charts |

---
*Last updated: 2026-02-28 — v2.0 milestone completed*
