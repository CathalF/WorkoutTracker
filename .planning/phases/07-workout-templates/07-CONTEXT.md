# Phase 7 — Workout Templates & Quick Start: Context

## How It Works

### Saving Templates
After finishing a workout, the app prompts "Save as template?" with a name field. One extra tap to save — low friction, right when the intent is fresh.

### Starting from a Template
The Log Workout screen shows a "My Templates" section at the top with saved templates, and the existing muscle group buttons remain below for building workouts from scratch. Tapping a template loads all its exercises into an active workout session.

### Pre-fill Behavior
When starting from a template, exercises are loaded in with **empty input fields**. The user's most recent weight/reps for each exercise are shown as a reference beside the fields (not pre-filled). This lets the user see where they left off without being locked into repeating the same numbers.

### Programs
Users can group templates into a **program** (e.g., "Push/Pull/Legs" split). Programs are a named collection of templates that belong together, giving structure to a training routine. In this phase, programs are organizational — no auto-rotation or "next workout" suggestions yet.

### Template Management
A management screen for renaming, editing, and deleting templates. Editing a template means changing its name, adding/removing exercises, or updating default sets.

## What's Essential
- Save completed workout as template (prompt after finishing)
- Quick-start workout from template on the Log Workout screen
- Previous weight/reps shown as reference (not pre-filled) when using a template
- Templates and muscle group buttons coexist on Log Workout screen
- Program grouping — group templates into named programs
- Template management (rename, edit, delete)

## What's Out of Scope
- **Smart rotation / scheduling** — no tracking which workout is next in a cycle, no day-of-week assignment, no "next workout" suggestions (deferred to a later phase)
- **Progressive overload** — no auto-suggesting weight increases or progression schemes
- **Sharing / export** — no exporting, importing, or sharing templates with other users
- **Template discovery** — no pre-built template library or community templates

## Key UX Decisions
- Prompt-after-workout is the primary template creation flow (not manual creation from scratch)
- Previous performance shown as reference, not pre-filled — keeps the user in control
- Programs are purely organizational grouping in this phase (foundation for smart rotation later)
- Log Workout screen layout: templates at top, muscle group buttons below

---
*Captured: 2026-02-28*
