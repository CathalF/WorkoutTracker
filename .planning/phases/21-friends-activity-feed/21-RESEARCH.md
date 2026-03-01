# Phase 21: Friends & Activity Feed - Research

**Researched:** 2026-03-01
**Domain:** Social graph (Supabase), activity feed (React Native FlatList), deep linking (Expo Linking + React Navigation), push notifications (Supabase Edge Functions + Expo Push API), animated reactions (React Native Animated + expo-haptics)
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Search by username/display name via Supabase profiles query
- Shareable profile deep links (`workouttracker://profile/{userId}`) that open UserProfileScreen directly
- Request/accept/reject model (two-way friendship, not one-way follow)
- Pending requests shown in a dedicated section within the social tab
- Manual search only — no friend suggestions or "people you may know" algorithm
- New 5th bottom tab: Social/Friends tab
- Social tab contains: activity feed, friends list, pending requests, friend search
- Summary cards using GlassCard component — name, avatar, date, muscle group, duration, exercise count, total volume
- PR badge/icon on workout cards when the workout includes a personal record
- Tap card to navigate to read-only WorkoutDetailScreen showing full exercise breakdown
- Tap avatar/name to navigate to UserProfileScreen
- Pull-to-refresh to load latest activity
- Infinite scroll for loading older entries (auto-load on scroll)
- Empty state: friendly illustration + "Add friends to see their workouts" CTA button linking to friend search
- Workouts visible to accepted friends only (friends-only default)
- Per-workout hide toggle — users can hide individual workouts from their feed after logging
- Profiles searchable by anyone (name/avatar visible), but workout feed/details locked to accepted friends
- Full workout details visible to friends (weights, reps, volume)
- Single reaction type: high-five (one tap, count + animated feedback)
- Push notification when someone high-fives your workout (uses existing expo-notifications, configurable in notification preferences)

### Claude's Discretion
- High-five animation design and feedback style
- Exact feed card layout and spacing
- Loading skeleton design for feed
- Deep link handling implementation details
- Friend request notification design (in-app badge vs push)
- Database schema for friendships and feed (Supabase tables, RLS policies)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 21 adds a social graph layer on top of the existing Supabase backend. The core technical work is: (1) designing Supabase tables (`friendships`, `feed_workouts`, `high_five_reactions`, `push_tokens`) with Row Level Security policies that gate workout data behind accepted friendship status; (2) building a SocialStackNavigator (5th tab) with screens for feed, friend search, friend list, and pending requests; (3) wiring the activity feed using FlatList with pull-to-refresh + infinite scroll against a Supabase query that joins accepted friends' workouts; (4) implementing the high-five reaction with Animated scale + expo-haptics feedback; and (5) sending push notifications via a Supabase Edge Function triggered by a database webhook on the `high_five_reactions` table.

The project already has `expo-notifications`, `expo-haptics`, and the Supabase client. No new dependencies are required. The `GlassCard`, `GlassModal`, `GlassButton` components are ready for feed cards and dialogs. The `UserProfileScreen` already accepts a `userId` param. All cloud data for this phase lives in Supabase only (no local SQLite tables needed for social data — matching the "profiles are cloud-native" decision).

**Primary recommendation:** Schema first. Define the four Supabase tables and RLS policies in migration SQL before touching any React Native code. Every screen depends on these queries working correctly. Use a Supabase Edge Function triggered by a database webhook for high-five push notifications — this is the canonical Supabase pattern and avoids any client-side secret exposure.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.98.0 (already installed) | Friendships/feed queries, real-time subscriptions | Already in project; Supabase client for all cloud ops |
| `react-native` FlatList | built-in (RN 0.81.5) | Activity feed with infinite scroll + pull-to-refresh | Built-in; no extra dep; onEndReached + refreshing props cover both needs |
| `expo-haptics` | ~15.0.8 (already installed) | High-five tap feedback | Already in project; `impactAsync(Medium)` is the right level for a high-five |
| `expo-notifications` | ~0.32.16 (already installed) | Push token registration + receiving push alerts | Already integrated in `notifications.ts` |
| `@react-navigation/native-stack` | ^7.12.0 (already installed) | SocialStackNavigator pattern matching existing stacks | Already used by all other tab stacks |
| `expo-linking` | bundled with expo ~54 | Deep link URL parsing for `workouttracker://profile/{userId}` | Expo-native; integrates with React Navigation `linking` prop |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React Native `Animated` | built-in | High-five scale/bounce animation | Built-in; sufficient for a single-element scale pulse; no Reanimated needed |
| Supabase Edge Functions (Deno) | Supabase platform | Send Expo push notifications server-side on high-five insert | Required — push sends must be server-side; webhook triggers on `high_five_reactions` INSERT |
| `expo-constants` | bundled with expo ~54 | Read `projectId` for `getExpoPushTokenAsync` | Needed to pass projectId; already available in any Expo project |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Supabase Edge Function for push | Client-side push send | Client can't hold secret Expo Access Token safely; server-side is required |
| Built-in `Animated` | `react-native-reanimated` | Reanimated is overkill for a single scale pulse; built-in is already used for onboarding |
| Offset pagination `.range()` | Cursor-based pagination | Offset is simpler and fine for a small-to-medium friend group; switch to cursor only if performance degrades |
| Supabase Realtime subscription | Polling for new high-fives | Realtime adds WebSocket overhead for a reaction count; push notification covers the user-away case; polling on focus covers the active case |

**Installation:** No new packages required. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── navigation/
│   └── SocialStackNavigator.tsx     # New 5th tab stack
├── screens/
│   ├── SocialFeedScreen.tsx         # Activity feed (FlatList)
│   ├── FriendSearchScreen.tsx       # Search profiles + send requests
│   ├── FriendListScreen.tsx         # Accepted friends + pending requests
│   └── FriendWorkoutDetailScreen.tsx # Read-only WorkoutDetail for friend's workout
├── contexts/
│   └── FriendsContext.tsx           # Friendship state + actions
├── services/
│   └── friendService.ts             # All Supabase social queries
└── types/
    └── index.ts                     # Add Friendship, FeedEntry, HighFiveReaction types
```

```
supabase/
├── migrations/
│   └── YYYYMMDD_social_schema.sql   # friendships, feed_workouts, high_five_reactions, push_tokens
└── functions/
    └── push-high-five/
        └── index.ts                 # Edge function: send Expo push on high_five INSERT
```

### Pattern 1: FriendsContext + friendService (mirrors ProfileContext + profileService)

**What:** A React Context that holds friendship list, pending requests, and the current user's friend IDs. A service module wraps all Supabase queries. Components call context methods; context calls service functions.

**When to use:** Whenever any screen needs friendship data (feed, friend list, search results with "already friends" state).

```typescript
// src/contexts/FriendsContext.tsx
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getFriends, getPendingRequests, sendFriendRequest, acceptRequest, rejectRequest } from '../services/friendService';
import type { Friendship } from '../types';

interface FriendsContextValue {
  friends: Friendship[];
  pendingIncoming: Friendship[];
  pendingOutgoing: Friendship[];
  isLoading: boolean;
  refresh: () => Promise<void>;
  sendRequest: (targetUserId: string) => Promise<void>;
  accept: (friendshipId: string) => Promise<void>;
  reject: (friendshipId: string) => Promise<void>;
}

const FriendsContext = createContext<FriendsContextValue | undefined>(undefined);

export function FriendsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [friends, setFriends] = useState<Friendship[]>([]);
  const [pendingIncoming, setPendingIncoming] = useState<Friendship[]>([]);
  const [pendingOutgoing, setPendingOutgoing] = useState<Friendship[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [f, incoming, outgoing] = await Promise.all([
        getFriends(user.id),
        getPendingRequests(user.id, 'incoming'),
        getPendingRequests(user.id, 'outgoing'),
      ]);
      setFriends(f);
      setPendingIncoming(incoming);
      setPendingOutgoing(outgoing);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // ... sendRequest, accept, reject implementations

  return (
    <FriendsContext.Provider value={{ friends, pendingIncoming, pendingOutgoing, isLoading, refresh, sendRequest, accept, reject }}>
      {children}
    </FriendsContext.Provider>
  );
}

export function useFriends() {
  const ctx = useContext(FriendsContext);
  if (!ctx) throw new Error('useFriends must be used within FriendsProvider');
  return ctx;
}
```

### Pattern 2: SocialStackNavigator (matches existing tab stack pattern)

**What:** A createNativeStackNavigator with SocialFeed as root, FriendSearch, FriendList, FriendWorkoutDetail, and UserProfile screens.

**When to use:** Adding the 5th tab to AppNavigator.

```typescript
// src/navigation/SocialStackNavigator.tsx
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import SocialFeedScreen from '../screens/SocialFeedScreen';
import FriendSearchScreen from '../screens/FriendSearchScreen';
import FriendListScreen from '../screens/FriendListScreen';
import FriendWorkoutDetailScreen from '../screens/FriendWorkoutDetailScreen';
import UserProfileScreen from '../screens/UserProfileScreen';

export type SocialStackParamList = {
  SocialFeed: undefined;
  FriendSearch: undefined;
  FriendList: undefined;
  FriendWorkoutDetail: { workoutId: string; ownerUserId: string };
  UserProfile: { userId: string };
};

const Stack = createNativeStackNavigator<SocialStackParamList>();

export default function SocialStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SocialFeed" component={SocialFeedScreen} />
      <Stack.Screen name="FriendSearch" component={FriendSearchScreen} />
      <Stack.Screen name="FriendList" component={FriendListScreen} />
      <Stack.Screen name="FriendWorkoutDetail" component={FriendWorkoutDetailScreen} />
      <Stack.Screen name="UserProfile" component={UserProfileScreen} />
    </Stack.Navigator>
  );
}
```

### Pattern 3: Activity Feed with FlatList (infinite scroll + pull-to-refresh)

**What:** FlatList with `onRefresh`/`refreshing` for pull-to-refresh and `onEndReached`/`onEndReachedThreshold` for auto-load of older entries. Page-based with Supabase `.range()` and `.order('created_at', { ascending: false })`.

**When to use:** SocialFeedScreen.

```typescript
// Source: React Native FlatList docs + Supabase JS range()
const PAGE_SIZE = 20;

export default function SocialFeedScreen() {
  const [entries, setEntries] = useState<FeedEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const loadPage = useCallback(async (pageNum: number, replace: boolean) => {
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    const data = await getFeedEntries(from, to);  // friendService function
    if (replace) {
      setEntries(data);
    } else {
      setEntries(prev => [...prev, ...data]);
    }
    setHasMore(data.length === PAGE_SIZE);
    setPage(pageNum);
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPage(0, true);
    setRefreshing(false);
  }, [loadPage]);

  const onEndReached = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await loadPage(page + 1, false);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, loadPage]);

  return (
    <FlatList
      data={entries}
      renderItem={({ item }) => <FeedCard entry={item} />}
      keyExtractor={(item) => item.id}
      refreshing={refreshing}
      onRefresh={onRefresh}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListEmptyComponent={<FeedEmptyState />}
      ListFooterComponent={loadingMore ? <ActivityIndicator /> : null}
    />
  );
}
```

### Pattern 4: High-Five Animated Reaction

**What:** A `Pressable` that triggers a scale animation via `Animated.spring()` + `Haptics.impactAsync(Medium)` on press. The count updates optimistically. A single `Animated.Value` drives the scale transform.

**When to use:** Feed card high-five button.

```typescript
// Source: React Native Animated docs + expo-haptics docs
import { useRef, useCallback } from 'react';
import { Animated, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';

function HighFiveButton({ count, hasReacted, onPress }: HighFiveButtonProps) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = useCallback(async () => {
    // Haptic first — feels synchronous
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Scale pulse: up then back
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.4, useNativeDriver: true, speed: 30 }),
      Animated.spring(scale, { toValue: 1.0, useNativeDriver: true, speed: 20 }),
    ]).start();

    onPress(); // triggers Supabase upsert + count update
  }, [scale, onPress]);

  return (
    <Pressable onPress={handlePress} hitSlop={8}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Ionicons
          name={hasReacted ? 'hand-left' : 'hand-left-outline'}
          size={22}
          color={hasReacted ? colors.primary : colors.textSecondary}
        />
      </Animated.View>
      <Text>{count}</Text>
    </Pressable>
  );
}
```

### Pattern 5: Deep Link Handling for Profile Links

**What:** The `workouttracker://` scheme is already configured in `app.json`. Add a `linking` config to `NavigationContainer` in `App.tsx` that maps `profile/:userId` to the Social tab's UserProfile screen.

**When to use:** Enabling shareable `workouttracker://profile/{userId}` links.

```typescript
// Source: Expo Linking docs + React Navigation deep linking docs
import * as Linking from 'expo-linking';

const linking = {
  prefixes: [Linking.createURL('/')],
  config: {
    screens: {
      // Tab names must match AppNavigator Tab.Screen names
      Social: {
        screens: {
          UserProfile: 'profile/:userId',
        },
      },
    },
  },
};

// In App.tsx:
<NavigationContainer linking={linking} ref={navigationRef}>
  ...
</NavigationContainer>
```

### Anti-Patterns to Avoid

- **RLS policies with un-indexed join columns:** The `friendships` table's `requester_id` and `addressee_id` columns MUST be indexed. Un-indexed RLS policies on large tables cause full scans on every query.
- **Calling `auth.uid()` directly in policy USING clause without SELECT wrapper:** Always use `(SELECT auth.uid())` to let the query planner cache the value and avoid repeated function calls per row.
- **Client-side push notification sending:** Never call the Expo Push API from the React Native client — it requires an Expo Access Token that cannot be safely stored in client code. Always use a Supabase Edge Function.
- **Hard deletes on friendship rows:** Use soft deletes (a `deleted_at` column) or status transitions ('rejected', 'blocked') to preserve audit history and make conflict resolution simpler.
- **Storing social data in SQLite:** The "profiles are cloud-native" architectural decision applies to all social data. Friendships, feed entries, and reactions live in Supabase only — no local SQLite tables.
- **Triggering feed reload on every render:** Feed is expensive. Load once on tab focus; only reload on explicit pull-to-refresh or after the user sends/accepts a friend request.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Server-side push notification delivery | Custom HTTP call from client | Supabase Edge Function + database webhook | Client can't hold Expo Access Token; Edge Functions run server-side with secrets |
| URL parsing for deep links | Manual string splitting on incoming URL | `Linking.parse()` from `expo-linking` | Handles URL encoding, query params, path extraction, and scheme stripping correctly |
| Friendship existence check in RLS | Inline subquery per policy | `SECURITY DEFINER` helper function in Postgres | Reusable across multiple policies; planner can optimize; avoids cascading RLS on the friends table |
| Push token retrieval | Storing device token manually | `Notifications.getExpoPushTokenAsync({ projectId })` | Expo handles APNS/FCM token exchange and normalization |
| Pagination cursor tracking | Custom offset math | Supabase `.range(from, to)` with page state | One-liner for offset pagination; consistent with Supabase JS patterns |

**Key insight:** The friendships relationship check is reused in multiple RLS policies (workouts visibility, high-five visibility, feed queries). Encapsulate it in a single Postgres `SECURITY DEFINER` function — one change point, tested once, used everywhere.

---

## Common Pitfalls

### Pitfall 1: RLS Policy Infinite Recursion on Friendships Table
**What goes wrong:** If you add an RLS policy to `friendships` that checks `friendships` itself (to see if the viewer is a friend), you get infinite recursion and a runtime error.
**Why it happens:** The `friendships` table is being read to evaluate the policy on the `friendships` table.
**How to avoid:** Keep the `friendships` RLS policies simple — users can see rows where they are `requester_id` OR `addressee_id`. Do not join back to `friendships` inside a `friendships` policy. Use `SECURITY DEFINER` helper functions only for policies on OTHER tables (workouts, reactions).
**Warning signs:** Supabase query returns "infinite recursion detected in policy for relation friendships" error.

### Pitfall 2: Push Notifications Require a Dev Build (Not Expo Go)
**What goes wrong:** `getExpoPushTokenAsync` throws or returns an empty string in Expo Go on SDK 54+.
**Why it happens:** Expo Go dropped push notification support starting SDK 53/54. Push notifications require a real device with a development build via EAS.
**How to avoid:** Register push tokens only inside a conditional check: `if (Device.isDevice)`. Log a warning in simulator/Expo Go environments. Test push notification flow on a physical device with an EAS development build.
**Warning signs:** Token is empty string, or function throws "No Expo project ID" during development.

### Pitfall 3: `onEndReached` Fires Multiple Times
**What goes wrong:** The infinite scroll callback fires 2-4 times in rapid succession when the user reaches the end, triggering multiple duplicate API calls and duplicate feed entries.
**Why it happens:** FlatList calls `onEndReached` multiple times when the threshold condition is met. Without a guard, each call independently triggers `loadPage`.
**How to avoid:** Guard with a `loadingMore` boolean ref (not state — ref avoids stale closure issues): `if (loadingMoreRef.current || !hasMore) return;`. Set `loadingMoreRef.current = true` before the async call, `false` after.
**Warning signs:** Duplicate entries in the feed; API call count in network tab is 3-4x what's expected.

### Pitfall 4: Deep Link Navigation Race Condition
**What goes wrong:** The app opens to the correct screen, but crashes because the navigation stack hasn't mounted yet when the deep link is processed.
**Why it happens:** React Navigation processes the linking config when `NavigationContainer` mounts, but the tab navigator and stack screens mount asynchronously. A deep link arriving before the Social tab's stack is mounted throws a "navigate" call to an undefined route.
**How to avoid:** Use React Navigation's `linking` prop (not `Linking.addEventListener` manually). React Navigation's built-in linking handler queues the navigation until the navigator is ready.
**Warning signs:** "The action 'NAVIGATE' with payload was not handled by any navigator" error on cold-start deep link.

### Pitfall 5: Supabase RLS Performance on Feed Query
**What goes wrong:** The activity feed loads slowly (>2s) as friend count grows because the feed query must check friendship status for every returned row via the RLS policy.
**Why it happens:** The `USING` clause of the RLS policy runs a subquery against `friendships` for every candidate row in the workouts/feed table. Without an index on `friendships.requester_id` and `friendships.addressee_id`, this is O(n*m).
**How to avoid:** Add composite indexes on the friendships table immediately in the migration. Also structure the client-side query to filter by friend_ids explicitly (pass the array of accepted friend IDs as a `.in()` filter) in addition to relying on RLS. This lets Postgres use the index to narrow the row set before evaluating the policy.
**Warning signs:** Slow queries in Supabase Dashboard > Reports > Slow queries list; response times >500ms on feed load.

### Pitfall 6: Optimistic High-Five Count Goes Out of Sync
**What goes wrong:** User taps high-five, count increments immediately (optimistic), but then the Supabase upsert fails silently. The count shows as incremented but no reaction was recorded.
**Why it happens:** Network errors or RLS policy rejections on the insert are not surfaced to the user.
**How to avoid:** On error, revert the optimistic count update and show a brief error toast. Always wrap reaction upserts in try/catch and roll back local state on failure.
**Warning signs:** User reports "high-fives don't stick" after connectivity issues.

---

## Code Examples

Verified patterns from official sources:

### Supabase Table Schema + RLS (Database Migration SQL)
```sql
-- Source: Supabase RLS docs + RLS performance best practices

-- 1. Friendships table
CREATE TABLE public.friendships (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

CREATE INDEX idx_friendships_requester ON public.friendships(requester_id);
CREATE INDEX idx_friendships_addressee ON public.friendships(addressee_id);
CREATE INDEX idx_friendships_status    ON public.friendships(status);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- Users can see their own friendship rows (both directions)
CREATE POLICY "friendships_select" ON public.friendships
  FOR SELECT TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- Users can only insert rows where they are the requester
CREATE POLICY "friendships_insert" ON public.friendships
  FOR INSERT TO authenticated
  WITH CHECK (requester_id = (SELECT auth.uid()));

-- Users can update rows where they are addressee (to accept/reject)
-- or requester (to cancel their own pending request)
CREATE POLICY "friendships_update" ON public.friendships
  FOR UPDATE TO authenticated
  USING (
    requester_id = (SELECT auth.uid())
    OR addressee_id = (SELECT auth.uid())
  );

-- 2. Reusable friendship helper (SECURITY DEFINER to bypass RLS on friendships)
CREATE OR REPLACE FUNCTION private.are_friends(user_a uuid, user_b uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
    AND (
      (requester_id = user_a AND addressee_id = user_b)
      OR (requester_id = user_b AND addressee_id = user_a)
    )
  )
$$;

-- 3. Feed workouts view / table
-- Approach: add a `is_hidden` column to existing workouts sync table
-- OR create a separate feed_visibility table that maps sync workout UUID to hidden flag.
-- Since workouts live in Supabase via sync, add:
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS is_hidden boolean NOT NULL DEFAULT false;

-- RLS: Friends can see non-hidden workouts of accepted friends
-- (plus own workouts always visible)
CREATE POLICY "workouts_friends_select" ON public.workouts
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR (
      NOT is_hidden
      AND private.are_friends((SELECT auth.uid()), user_id)
    )
  );

-- 4. High-five reactions table
CREATE TABLE public.high_five_reactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id      uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  reactor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE(workout_id, reactor_user_id)  -- one high-five per user per workout
);

CREATE INDEX idx_highfives_workout ON public.high_five_reactions(workout_id);
CREATE INDEX idx_highfives_reactor ON public.high_five_reactions(reactor_user_id);

ALTER TABLE public.high_five_reactions ENABLE ROW LEVEL SECURITY;

-- Friends can react to each other's workouts
CREATE POLICY "highfives_select" ON public.high_five_reactions
  FOR SELECT TO authenticated
  USING (
    reactor_user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
      AND (w.user_id = (SELECT auth.uid())
           OR private.are_friends((SELECT auth.uid()), w.user_id))
    )
  );

CREATE POLICY "highfives_insert" ON public.high_five_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    reactor_user_id = (SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.workouts w
      WHERE w.id = workout_id
      AND private.are_friends((SELECT auth.uid()), w.user_id)
    )
  );

CREATE POLICY "highfives_delete" ON public.high_five_reactions
  FOR DELETE TO authenticated
  USING (reactor_user_id = (SELECT auth.uid()));

-- 5. Push tokens table
CREATE TABLE public.push_tokens (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token      text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "push_tokens_own" ON public.push_tokens
  FOR ALL TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
```

### friendService.ts Pattern
```typescript
// src/services/friendService.ts
// Source: Supabase JS docs (supabase.com/docs/reference/javascript)

import { supabase } from '../lib/supabase';
import type { Friendship, FeedEntry, UserProfile } from '../types';

// Search profiles by display_name (anyone can search)
export async function searchProfiles(query: string): Promise<UserProfile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio')
    .ilike('display_name', `%${query}%`)
    .limit(20);
  if (error) throw error;
  return data as UserProfile[];
}

// Send a friend request
export async function sendFriendRequest(addresseeId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .insert({ addressee_id: addresseeId });
  if (error) throw error;
}

// Accept incoming request (update status to 'accepted')
export async function acceptFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'accepted', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

// Reject / cancel
export async function rejectFriendRequest(friendshipId: string): Promise<void> {
  const { error } = await supabase
    .from('friendships')
    .update({ status: 'rejected', updated_at: new Date().toISOString() })
    .eq('id', friendshipId);
  if (error) throw error;
}

// Load activity feed (paginated, friends only, non-hidden workouts, desc order)
export async function getFeedEntries(from: number, to: number): Promise<FeedEntry[]> {
  const { data, error } = await supabase
    .from('workouts')
    .select(`
      id,
      user_id,
      created_at,
      muscle_group_id,
      is_hidden,
      profiles!inner(display_name, avatar_url),
      high_five_reactions(reactor_user_id),
      workout_sets(count)
    `)
    .eq('is_hidden', false)
    .order('created_at', { ascending: false })
    .range(from, to);
  // RLS ensures only accepted friends' workouts appear
  if (error) throw error;
  return data as unknown as FeedEntry[];
}

// Toggle workout visibility
export async function setWorkoutHidden(workoutId: string, hidden: boolean): Promise<void> {
  const { error } = await supabase
    .from('workouts')
    .update({ is_hidden: hidden })
    .eq('id', workoutId);
  if (error) throw error;
}

// Upsert high-five reaction
export async function toggleHighFive(workoutId: string): Promise<'added' | 'removed'> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Check if reaction exists
  const { data: existing } = await supabase
    .from('high_five_reactions')
    .select('id')
    .eq('workout_id', workoutId)
    .eq('reactor_user_id', user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('high_five_reactions').delete().eq('id', existing.id);
    return 'removed';
  } else {
    await supabase.from('high_five_reactions').insert({ workout_id: workoutId, reactor_user_id: user.id });
    return 'added';
  }
}

// Register/update push token
export async function savePushToken(token: string): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase
    .from('push_tokens')
    .upsert({ user_id: user.id, token, updated_at: new Date().toISOString() });
}
```

### Supabase Edge Function: push-high-five
```typescript
// supabase/functions/push-high-five/index.ts
// Source: Supabase push notifications guide (supabase.com/docs/guides/functions/examples/push-notifications)
// Triggered by database webhook on high_five_reactions INSERT

import { createClient } from 'npm:@supabase/supabase-js@2';

interface WebhookPayload {
  type: 'INSERT';
  table: string;
  record: {
    id: string;
    workout_id: string;
    reactor_user_id: string;
    created_at: string;
  };
}

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const payload: WebhookPayload = await req.json();
  const { workout_id, reactor_user_id } = payload.record;

  // Get workout owner
  const { data: workout } = await supabase
    .from('workouts')
    .select('user_id')
    .eq('id', workout_id)
    .single();

  if (!workout || workout.user_id === reactor_user_id) {
    // Don't notify if they high-fived their own workout
    return new Response('ok');
  }

  // Get reactor display name
  const { data: reactor } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', reactor_user_id)
    .single();

  // Get owner's push token
  const { data: tokenRow } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', workout.user_id)
    .single();

  if (!tokenRow?.token) return new Response('no token');

  // Send via Expo Push API
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${Deno.env.get('EXPO_ACCESS_TOKEN')}`,
    },
    body: JSON.stringify({
      to: tokenRow.token,
      sound: 'default',
      title: 'High Five!',
      body: `${reactor?.display_name ?? 'Someone'} high-fived your workout`,
      data: { workout_id },
    }),
  });

  return new Response('ok');
});
```

### Push Token Registration (add to notifications.ts or a new socialNotifications.ts)
```typescript
// Source: Expo push notifications setup docs (docs.expo.dev/push-notifications/push-notifications-setup/)
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { savePushToken } from '../services/friendService';

export async function registerPushTokenForSocial(): Promise<void> {
  if (!Device.isDevice) return; // Skip in simulator/Expo Go

  const { status: existing } = await Notifications.getPermissionsAsync();
  const finalStatus = existing !== 'granted'
    ? (await Notifications.requestPermissionsAsync()).status
    : existing;

  if (finalStatus !== 'granted') return;

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  if (!projectId) return;

  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await savePushToken(token);  // Upsert to Supabase push_tokens table
}
```

### Deep Link Linking Config (App.tsx addition)
```typescript
// Source: React Navigation deep linking docs + Expo Linking docs
import * as Linking from 'expo-linking';

export const linking = {
  prefixes: [Linking.createURL('/'), 'workouttracker://'],
  config: {
    screens: {
      Social: {
        screens: {
          UserProfile: 'profile/:userId',
        },
      },
    },
  },
};
// Pass as: <NavigationContainer linking={linking} ...>
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual push token → FCM/APNS | Expo Push API with `getExpoPushTokenAsync` | Expo SDK ~40 | Abstraction over APNS/FCM; single token format |
| Push in Expo Go | Dev build required | SDK 53/54 | Testing social push notifications requires EAS dev build |
| Supabase Realtime for reaction counts | Webhook → Edge Function → Expo Push | 2024 | Push is more reliable than WebSocket for background notifications |
| Direct `auth.uid()` in RLS | `(SELECT auth.uid())` wrapper | Supabase performance guide | Prevents per-row function call; significant query speedup |

**Deprecated/outdated:**
- Expo Go push notifications (SDK 54+): No longer functional. Must use development builds.
- `Notifications.getExpoPushTokenAsync()` without `projectId`: Deprecated; always pass `projectId` from `Constants.expoConfig.extra.eas.projectId`.

---

## Open Questions

1. **Supabase workouts table UUID vs local SQLite integer IDs**
   - What we know: Local workouts use INTEGER autoincrement IDs. The sync layer maps to UUIDs via `sync_id_map`. Supabase `workouts` table uses UUID primary keys.
   - What's unclear: The feed query needs the Supabase UUID to build `FriendWorkoutDetail` navigation params. The read-only WorkoutDetailScreen for friends cannot use `getWorkoutWithSets()` (SQLite — only has own data). A separate Supabase-based read function is needed.
   - Recommendation: Create `getFriendWorkoutDetail(supabaseWorkoutId: string)` in `friendService.ts` that fetches from Supabase directly. `FriendWorkoutDetailScreen` is a new read-only screen that reads from Supabase, not SQLite. Do NOT reuse the existing `WorkoutDetailScreen` (it's edit-capable and SQLite-backed).

2. **Per-workout hide toggle — where to surface the UI**
   - What we know: Users should be able to hide individual workouts from their feed. Decision says "after logging."
   - What's unclear: Exact placement — in `WorkoutDetailScreen` (History tab) or as a toggle in the Social tab's "my activity" section?
   - Recommendation: Add a privacy toggle in the existing `WorkoutDetailScreen` header (a Ionicons `eye-off-outline` icon). This is the natural place since it's where users review past workouts. The toggle calls `setWorkoutHidden(workoutId, !isHidden)` via `friendService`.

3. **Friend request in-app notification badge**
   - What we know: Push notification for high-fives is decided. Friend request notification design is Claude's discretion.
   - What's unclear: Whether to send push for friend requests or just show an in-app badge count on the Social tab icon.
   - Recommendation: In-app badge only for friend requests (simpler, less notification fatigue). Add a badge count to the Social tab icon when `pendingIncoming.length > 0`. Push notifications for high-fives only (as decided).

4. **`expo-device` availability**
   - What we know: Push token registration needs `Device.isDevice` check to skip simulators.
   - What's unclear: `expo-device` is not in the current `package.json`.
   - Recommendation: Add `expo-device` to dependencies (`npx expo install expo-device`). It's a small Expo SDK package with no native modules beyond what's already included.

---

## Validation Architecture

> Skipped — `workflow.nyquist_validation` is not set in `.planning/config.json` (config only has `mode`, `depth`, `parallelization`, `created`). Treating as false/absent.

---

## Sources

### Primary (HIGH confidence)
- [Supabase Row Level Security docs](https://supabase.com/docs/guides/database/postgres/row-level-security) — policy syntax, auth.uid(), USING/WITH CHECK
- [Supabase RLS Performance Best Practices](https://supabase.com/docs/guides/troubleshooting/rls-performance-and-best-practices-Z5Jjwv) — SELECT wrapper, index requirements, SECURITY DEFINER pattern
- [Supabase Push Notifications guide](https://supabase.com/docs/guides/functions/examples/push-notifications) — Edge Function + database webhook pattern, complete TypeScript example
- [Supabase JS range() reference](https://supabase.com/docs/reference/javascript/range) — offset pagination syntax
- [Expo Haptics docs](https://docs.expo.dev/versions/latest/sdk/haptics/) — ImpactFeedbackStyle enum, API surface
- [Expo Push Notifications Setup docs](https://docs.expo.dev/push-notifications/push-notifications-setup/) — getExpoPushTokenAsync, projectId, dev build requirement
- [React Navigation Deep Linking docs](https://reactnavigation.org/docs/deep-linking/) — linking config format, screen mapping, param extraction
- [Expo Linking docs](https://docs.expo.dev/linking/into-your-app/) — createURL(), Linking.parse()
- [React Native FlatList docs](https://reactnative.dev/docs/flatlist) — onRefresh, refreshing, onEndReached, ListEmptyComponent, ListFooterComponent
- [Supabase Postgres Changes / Realtime docs](https://supabase.com/docs/guides/realtime/postgres-changes) — channel subscribe, filtered changes by column value

### Secondary (MEDIUM confidence)
- [Supabase Push Notifications GitHub example](https://github.com/supabase/supabase/blob/master/examples/user-management/expo-push-notifications/supabase/functions/push/index.ts) — verified against official guide
- [Expo Push Notifications SDK 54 setup gist](https://gist.github.com/Xansiety/5e8d264c5391b7e287705efbca70b80f) — SDK 54-specific projectId pattern, verified against Expo docs

### Tertiary (LOW confidence)
- None — all findings verified against official documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in project; APIs verified against official docs
- Architecture: HIGH — patterns mirror existing ProfileContext/profileService architecture; direct verification from Supabase and RN docs
- Database schema: HIGH — SQL syntax verified against Supabase docs; RLS patterns verified against performance guide
- Push notifications: HIGH — verified against official Supabase guide and Expo docs; dev build requirement confirmed
- Pitfalls: HIGH — RLS recursion and onEndReached double-fire are documented known issues; push-in-Expo-Go is SDK 54 confirmed

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (stable libraries; Supabase SDK and Expo SDK are stable; review if Expo SDK 55 releases)
