# Phase 5 Context: Progress Charts

## Vision
A **quick-glance dashboard** — open the Progress tab and immediately get value without hunting. The landing view is an overview summary, not a single-exercise detail view.

## How It Works

### Landing View (Overview Summary)
When you open the Progress tab, you see:
1. **Recent Personal Records** — highlighted at the top. "You hit 225 on bench last Tuesday!" style callouts for PRs set in recent workouts.
2. **Mini sparkline charts** — small preview charts for your top 2-3 most-logged exercises, showing recent weight trends at a glance.

This gives immediate insight with zero taps.

### Exercise Detail View
Tap any exercise (from a sparkline, a picker, or a PR card) to drill into the full detail:
- **Big chart** with time range controls (1M, 3M, 6M, All)
- **Weight/Volume toggle** to switch between line chart (max weight over time) and bar chart (total session volume)
- **Personal Records card** below the chart — max weight ever and best volume session for that exercise

### Navigation Flow
```
Progress Tab (Overview Summary)
  ├── Recent PRs section
  ├── Sparkline previews (top 2-3 exercises)
  └── Tap exercise → Exercise Detail View
       ├── Exercise selector (change exercise without going back)
       ├── Time range chips (1M / 3M / 6M / All)
       ├── Weight/Volume toggle
       ├── Full chart (line or bar)
       └── Personal Records card
```

## What's Essential
- Zero-tap value: the overview must show something useful immediately
- Recent PRs front and center — this is the motivational hook
- Sparkline previews for quick trend visibility
- Full chart detail when you want to dig in
- Time range filtering on the detail view
- Weight and volume as separate chart views

## What's Out of Scope
- **No exercise comparisons** — no overlaying or side-by-side charts for multiple exercises
- **No body metrics** — no bodyweight tracking, measurements, or body composition; this is purely lift progress
- **No social/sharing features** — no exporting or sharing charts
- **No goal setting** — no target weight or volume goals for this phase

## Key Difference from Original Plan
The original plan defaulted to a single-exercise view on load. The user's vision adds an **overview summary layer** on top: PRs + sparklines as the landing experience, with exercise detail as a drill-down. This is a two-level layout rather than a flat single-exercise screen.

---
*Captured: 2026-02-18*
