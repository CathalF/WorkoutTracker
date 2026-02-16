# Workout Tracker

A clean, purpose-built mobile app for everyday gym goers to log workouts and track strength progress over time — replacing the messy notes app workflow.

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

(None yet — ship to validate)

### Active

- [ ] Muscle group selection per workout session (legs, chest, back, chest & biceps, shoulders & triceps, custom)
- [ ] Exercise logging with sets, reps, and weight per exercise
- [ ] Fast entry UI — minimal taps to log a full workout
- [ ] Workout history — view past sessions organized by date and muscle group
- [ ] Progress charts — visualize strength/volume trends per exercise over time
- [ ] Exercise library — common exercises pre-loaded, organized by muscle group
- [ ] Local-first data storage (on-device, no account required)
- [ ] Clean, modern mobile UI optimized for use between sets

### Out of Scope

- Social features (sharing, leaderboards, friend feeds) — not a social app
- Nutrition/calorie tracking — workouts only
- AI coaching or exercise suggestions — user knows their routine
- Cloud sync/accounts — deferred to future version
- Desktop/web version — mobile-first

## Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Framework | React Native + Expo | Fast dev cycle, cross-platform, large ecosystem |
| Language | TypeScript | Type safety, better DX |
| Local Storage | SQLite (expo-sqlite) | Structured relational data, good for queries and progress aggregation |
| Charts | react-native-chart-kit or Victory Native | Progress visualization |
| Navigation | React Navigation | Standard for React Native |

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native + Expo over Flutter | JS/TS ecosystem familiarity, faster iteration, Expo simplifies builds | Pending |
| Local-first storage | Simplicity for v1, no backend needed, works offline at the gym | Pending |
| SQLite over AsyncStorage | Workout data is relational (exercises → sets → reps), need aggregation queries for progress charts | Pending |
| Progress visibility as core priority | This is the #1 thing that makes the app better than a notes app | Pending |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss (local-only) | High — users lose all workout history | Clear v2 plan for cloud sync; encourage device backups |
| Logging speed not fast enough | High — users revert to notes app | Prioritize UX testing of entry flow; benchmark against notes app speed |
| Chart performance with large datasets | Medium — slow rendering after months of data | Paginate/aggregate data; lazy load charts |

---
*Last updated: 2026-02-16 after initialization*
