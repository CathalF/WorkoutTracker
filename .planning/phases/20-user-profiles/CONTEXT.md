# Phase 20 — User Profiles

## Vision
Simple identity profiles so users are recognizable when social features land. Not a fitness showcase or full social profile — just enough to put a face and name to an account.

## How It Works
- **Onboarding**: Profile setup (name + avatar) is added to the onboarding flow so the app feels personal from the start
- **Settings**: Profile is editable from the Settings screen after onboarding
- **Avatar**: Real photo upload using Supabase Storage (camera roll or camera)
- **View others**: Users can view other people's profiles (read-only) — lays groundwork for Phase 21 (Friends & Activity Feed)

## What's Essential
- Display name, avatar (photo), and bio fields
- Profile creation during onboarding
- Profile editing from Settings
- Supabase Storage for avatar hosting
- Profile data synced to Supabase (extends existing cloud sync)
- Read-only view of other users' profiles

## What's Out of Scope
- No workout stats, PRs, or streaks displayed on profiles (later enhancement)
- No follow / friend / block / message actions (Phase 21+)
- No privacy controls or visibility settings (future phase)
- No profile search or discovery (future phase)

## Key Decisions
- Profiles are pure identity: name, avatar, bio
- Photo upload is the primary avatar approach (no generated fallback needed)
- Onboarding gets profile setup before the app's main experience
- Other users' profiles are viewable but not actionable yet

---
*Created: 2026-03-01*
