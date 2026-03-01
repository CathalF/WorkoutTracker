# Phase 21: Friends & Activity Feed - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a social layer to the workout tracker: friend discovery, friend requests, and an activity feed showing friends' workouts. Users can find friends, send/accept requests, browse a feed of friends' workout summaries, react with high-fives, and tap into workout details. This phase does NOT include workout sharing to external platforms, leaderboards, or community templates.

</domain>

<decisions>
## Implementation Decisions

### Friend Discovery & Adding
- Search by username/display name via Supabase profiles query
- Shareable profile deep links (`workouttracker://profile/{userId}`) that open UserProfileScreen directly
- Request/accept/reject model (two-way friendship, not one-way follow)
- Pending requests shown in a dedicated section within the social tab
- Manual search only — no friend suggestions or "people you may know" algorithm

### Navigation & Structure
- New 5th bottom tab: Social/Friends tab
- Social tab contains: activity feed, friends list, pending requests, friend search
- Keeps social features separate from the existing workout flow

### Activity Feed Content
- Summary cards using GlassCard component — name, avatar, date, muscle group, duration, exercise count, total volume
- PR badge/icon on workout cards when the workout includes a personal record
- Tap card to navigate to read-only WorkoutDetailScreen showing full exercise breakdown
- Tap avatar/name to navigate to UserProfileScreen

### Feed Loading & Empty State
- Pull-to-refresh to load latest activity
- Infinite scroll for loading older entries (auto-load on scroll)
- Empty state: friendly illustration + "Add friends to see their workouts" CTA button linking to friend search

### Privacy & Visibility
- Workouts visible to accepted friends only (friends-only default)
- Per-workout hide toggle — users can hide individual workouts from their feed after logging
- Profiles searchable by anyone (name/avatar visible), but workout feed/details locked to accepted friends
- Full workout details visible to friends (weights, reps, volume) — the numbers are the point

### Feed Interactions
- Single reaction type: high-five (one tap, count + animated feedback)
- Push notification when someone high-fives your workout (uses existing expo-notifications, configurable in notification preferences)

### Claude's Discretion
- High-five animation design and feedback style
- Exact feed card layout and spacing
- Loading skeleton design for feed
- Deep link handling implementation details
- Friend request notification design (in-app badge vs push)
- Database schema for friendships and feed (Supabase tables, RLS policies)

</decisions>

<specifics>
## Specific Ideas

- High-five should feel encouraging and quick — one tap, satisfying haptic + visual feedback
- Feed should feel like checking what your gym buddies did today, not a full social media feed
- Keep the social tab clean — it's a complement to the workout tracker, not the main feature

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GlassCard` (`src/components/glass/GlassCard.tsx`): Card component for feed entries — already has blur, shadow, rounded variants
- `GlassModal` (`src/components/glass/GlassModal.tsx`): For friend request confirmation dialogs
- `GlassButton` (`src/components/glass/GlassButton.tsx`): For add friend / accept / reject CTAs
- `UserProfileScreen` (`src/screens/UserProfileScreen.tsx`): Already views other user profiles — needs userId param for feed navigation
- `profileService` (`src/services/profileService.ts`): Supabase profile CRUD and avatar upload — extend for friend queries
- `expo-notifications` (`src/utils/notifications.ts`): Existing notification infrastructure for high-five alerts
- `expo-haptics`: Already in dependencies — use for high-five feedback
- `avatarPicker.ts` (`src/utils/avatarPicker.ts`): Avatar image handling already solved

### Established Patterns
- Context + Provider pattern: `AuthContext`, `ProfileContext`, `SyncContext` — new FriendsContext follows same pattern
- Service layer: `profileService.ts`, `syncEngine.ts` — new friendService.ts follows same pattern
- Screen naming: `[FeatureName]Screen.tsx` — new screens follow convention
- Navigation stacks: Each tab has its own stack navigator — new SocialStackNavigator follows pattern
- Database services: All queries in `src/database/services.ts` — extend or create social-specific service

### Integration Points
- `AppNavigator.tsx` (`src/navigation/AppNavigator.tsx`): Add 5th bottom tab for Social
- `src/types/index.ts`: Add Friendship, FeedEntry, HighFive types
- `supabase.ts` (`src/lib/supabase.ts`): Supabase client for new social tables/queries
- `app.json`: Deep link scheme already configured (`workouttracker://`)
- Existing workout data flows through `services.ts` → can be queried for friend feed entries

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 21-friends-activity-feed*
*Context gathered: 2026-03-01*
