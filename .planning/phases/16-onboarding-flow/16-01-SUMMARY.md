# Phase 16 — Plan 01 Summary: Onboarding Flow

## Result
First-launch onboarding experience added with a 4-page horizontal pager (Welcome → Features → Setup → Ready) using the glassmorphic design system. New users configure weekly goal and theme preference, then choose to start their first workout or explore the dashboard. Onboarding is gated via a settings flag and only shows on first launch.

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Onboarding gate — database check + conditional rendering in App.tsx | `c48de9e` |
| 2 | OnboardingScreen — pager skeleton with glassmorphic base | `3845a93` |
| 3 | Welcome and Features pages with animated entrances | `e91ce76` |
| 4 | Setup page with weekly goal and theme pickers | `2b9a1cc` |
| 5 | Ready page with completion CTAs and navigation | `3eac092` |
| 6 | TypeScript verification and cleanup | `42081f1` |

## Key Changes

### App.tsx — Onboarding Gate
- Added `onboardingDone` state checked via `getSetting('onboarding_completed', 'false')` during init
- Conditional render: `OnboardingScreen` when first launch, `AppContent` on subsequent launches
- `handleOnboardingComplete(initialRoute?)` sets flag, shows main app, optionally navigates to a specific tab via `navigationRef`

### OnboardingScreen — Pager Structure
- Horizontal `ScrollView` with `pagingEnabled` for 4-page swipe navigation
- Page indicator dots: pill-shaped active state (`primary` color), inactive (`glassBorder`)
- Bottom controls: Skip button + Next `GlassButton` (hidden on final page)
- Skip jumps to Setup page (page 3) — lets user configure before completing
- `useWindowDimensions()` for responsive page sizing

### Page 1 — Welcome
- Large barbell icon in circular glass backdrop (140px, `glassSurface` + `glassBorder`)
- "Workout Tracker" title (34px bold) + "Track your lifts. See your progress." tagline
- Animated entrance: fade (0→1) + translateY (30→0) with `useNativeDriver`

### Page 2 — Features
- "Everything you need" section title
- 3 `GlassCard` feature cards with icon circles (`primary` background, white icon):
  - Log Workouts (`fitness-outline`)
  - Track Progress (`trending-up-outline`)
  - Build Routine (`calendar-outline`)
- Staggered entrance animation: 100ms delay between cards

### Page 3 — Setup
- "Make it yours" section title
- Weekly goal picker (2–7) as glass option buttons in `GlassCard` — default 3
- Theme picker (System/Light/Dark) as glass option buttons in `GlassCard`
- Saves immediately to database on selection (`setSetting` for goal, `setThemeMode` for theme)
- Theme change updates gradient background live during onboarding

### Page 4 — Ready
- Checkmark-circle icon (80px, `success` color)
- "You're all set!" title + motivational subtitle
- Primary CTA: "Start Your First Workout" → `onComplete('Log Workout')` → navigates to Log Workout tab
- Secondary CTA: "Explore Dashboard" → `onComplete()` → lands on default Dashboard tab

### Animations
- Each page has entrance animation (fade + translateY) triggered once when page becomes visible
- `useRef<Set<number>>` tracks which pages have been animated — prevents replay on back-swipe
- Feature cards use staggered timing (100ms delay per card)

### Verification
- `npx tsc --noEmit` — zero new errors (3 pre-existing errors in quickActionHandler.ts unrelated)
- Cleaned up unused `radii` import and redundant mount useEffect for page 0

## Decisions
| Decision | Context |
|----------|---------|
| ScrollView pagingEnabled over pager library | No new dependency needed; built-in horizontal paging is sufficient for 4 static pages |
| Settings key for onboarding gate | Reuses existing `settings` table with key `onboarding_completed` — consistent with other app preferences |
| Skip → Setup page (not Ready) | Skipping should land on the setup page so users still configure preferences before completing |
| initialRoute via onComplete callback | Simplest approach for post-onboarding navigation; uses existing `navigationRef` with setTimeout(100ms) for mount timing |
| Animated API over reanimated | No new dependency; React Native's built-in Animated with useNativeDriver is sufficient for fade+slide entrances |

## Files Modified
- `App.tsx` (+17 lines)
- `src/screens/OnboardingScreen.tsx` (new, 557 lines)
