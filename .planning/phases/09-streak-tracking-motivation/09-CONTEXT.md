# Phase 9: Streak Tracking & Motivation — Context

## Vision
Transform the app's landing experience from a utility (exercise library) into a motivational dashboard that greets users with their training rhythm, consistency streaks, and recent achievements. The app should feel like it *knows* your effort and celebrates your progress.

## How It Works

### Dashboard Tab (replaces Exercises tab)
The current Exercises tab becomes a Dashboard / Home tab — the first thing users see when opening the app. The exercise library remains accessible through the workout logging flow (ExercisePicker) but no longer occupies a top-level tab.

**Hero element: Weekly overview**
A week-at-a-glance visualization showing which days the user trained this week — similar to a GitHub contribution grid but simpler (7 dots/blocks for Mon–Sun, filled for training days). This is the first thing the eye lands on.

**Weekly consistency streak**
Counts consecutive weeks where the user trained at least N times (user's natural rhythm, not a hard-coded number). Example: "6 week streak — training 3x/week". This is the primary streak metric — more realistic and motivating for strength training than daily streaks.

**Summary stats**
Quick-glance numbers:
- Workouts this month
- Total volume lifted (this month or all-time)
- Any other relevant aggregate stats

**Recent personal records**
A section showing the user's latest PRs — exercise name, new weight/reps, and when it happened. Gives a sense of forward momentum.

### PR Celebrations (during active workout)
When a user logs a set that exceeds their previous best for an exercise, the app shows a **modal celebration moment** — a brief full-screen or modal overlay with visual flair (confetti, bold text, badge). This should feel like an achievement, not just a data point. The user dismisses it and continues their workout.

PR detection applies to:
- Weight PR (heavier weight for same or more reps)
- Rep PR (more reps at same or heavier weight)

## What's Essential
- Dashboard tab replacing Exercises as the landing screen
- Weekly overview visualization (the hero)
- Weekly consistency streak counter
- Monthly workout count and volume stats
- PR detection during workouts with modal celebration
- Recent PRs displayed on dashboard

## Out of Scope
- Social sharing / exporting streaks or PRs
- Workout suggestions or "what to train next" recommendations
- Complex achievement/badge collection system (beyond PR detection)
- Daily streak counter (weekly consistency is the chosen model)
- Leaderboards or competitive features

## Key Decisions
- **Exercises tab → Dashboard tab**: Exercise library loses its dedicated tab; accessed via workout flow only
- **Weekly consistency over daily streaks**: More aligned with how strength training works (rest days are good)
- **Modal PR celebration**: Full moment of celebration, not just a subtle badge — PRs should feel special
- **Week-at-a-glance as hero**: The weekly rhythm visualization is the primary motivator on the dashboard

---
*Captured: 2026-02-28*
