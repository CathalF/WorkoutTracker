# Phase 18 — Supabase Setup & Authentication: Research

## 1. Ecosystem Overview

### Core Stack
| Package | Purpose | Version Note |
|---------|---------|-------------|
| `@supabase/supabase-js` | Supabase client (auth, DB, realtime, storage) | v2.x — install via `npx expo install` |
| `expo-sqlite` | Already installed — also provides `localStorage` polyfill for auth storage | SDK 54 compatible |
| `react-native-url-polyfill` | URL polyfill required by supabase-js in React Native | Auto-import in client init |
| `@react-native-async-storage/async-storage` | Alternative auth session storage (cross-platform) | Optional — expo-sqlite localStorage works too |

### What NOT to Install
- `@rneui/themed` — referenced in old Supabase quickstart, but we already have our own Glass design system
- `@supabase/ssr` — SSR package, not applicable to React Native
- Any WebSocket polyfill — not needed unless using Supabase Realtime subscriptions

### Client Initialization Pattern
```typescript
// lib/supabase.ts
import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    ...(Platform.OS !== 'web' ? { storage: AsyncStorage } : {}),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auto-refresh tokens when app returns to foreground
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh();
    } else {
      supabase.auth.stopAutoRefresh();
    }
  });
}
```

**Alternative:** Supabase now supports `expo-sqlite/localStorage/install` as a storage backend (import it before creating the client). This avoids adding `@react-native-async-storage/async-storage` as a new dependency. However, AsyncStorage is more battle-tested for auth persistence.

### Environment Variables
```bash
# .env (gitignored)
EXPO_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```
- Expo requires `EXPO_PUBLIC_` prefix for client-accessible env vars
- The anon key is safe to expose — RLS protects the data
- NEVER expose the `service_role` key in client code

---

## 2. Authentication Providers

### 2a. Email/Password (primary, easiest)
```typescript
// Sign up
const { data, error } = await supabase.auth.signUp({
  email, password,
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email, password,
});

// Sign out
await supabase.auth.signOut();

// Session listener
supabase.auth.onAuthStateChange((event, session) => {
  // SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED, etc.
});
```

**Verdict:** Start with email/password. It works in Expo Go, needs no native modules, and covers the MVP auth flow.

### 2b. Apple Sign-In (iOS)
- Package: `expo-apple-authentication` (works in Expo Go)
- Flow: Get Apple ID token natively → pass to `supabase.auth.signInWithIdToken({ provider: 'apple', token, nonce })`
- Apple only provides user's full name on FIRST sign-in — must capture and store immediately via `updateUser()`
- Requires Apple Developer account for production (but works in Expo Go for testing)

### 2c. Google Sign-In
- **Android:** Use `@react-native-google-signin/google-signin` → get ID token → `supabase.auth.signInWithIdToken({ provider: 'google', token, nonce })`
- **iOS:** Tricky — Google's iOS SDK skips nonces by default but Supabase expects them. Known pain point in 2025. Alternative: use `expo-auth-session/providers/google` for web-based OAuth flow
- Requires dev build (not Expo Go) for native Google Sign-In

### 2d. Deep Linking for OAuth
- App already has `"scheme": "workouttracker"` in app.json
- Add redirect URL `workouttracker://**` to Supabase Auth settings
- Use `expo-linking` to capture callback URL and extract tokens
- Use `expo-web-browser` for OAuth popup flow

### Recommendation for Phase 18
**Email/password only.** Apple and Google sign-in add complexity (native modules, dev builds, nonce handling). Ship auth with email first, add social login in a later phase or as a quick follow-up.

---

## 3. Row Level Security (RLS)

### Core Pattern — User-Owned Data
Every table that stores user data needs a `user_id UUID REFERENCES auth.users(id)` column.

```sql
-- Enable RLS
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;

-- Users can only see their own workouts
CREATE POLICY "Users view own workouts"
  ON workouts FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

-- Users can only insert their own workouts
CREATE POLICY "Users insert own workouts"
  ON workouts FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only update their own workouts
CREATE POLICY "Users update own workouts"
  ON workouts FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Users can only delete their own workouts
CREATE POLICY "Users delete own workouts"
  ON workouts FOR DELETE
  USING ((SELECT auth.uid()) = user_id);
```

### Performance Rules
1. **Always index `user_id`** on every table — this is the #1 RLS performance killer if missing
2. **Wrap `auth.uid()` in `(SELECT ...)`** — lets Postgres cache the value per query instead of per row
3. **Add `.eq('user_id', userId)` in client queries** — duplicates the RLS check but helps Postgres optimize

### Tables That Need RLS
| Table | Needs `user_id`? | Notes |
|-------|-----------------|-------|
| `muscle_groups` | No | Shared reference data |
| `exercises` | Yes (for custom) | Seed exercises are shared; custom exercises belong to a user |
| `workouts` | Yes | Core user data |
| `sets` | Inherited via `workout_id` | RLS on workouts cascades; sets FK to workouts |
| `programs` | Yes | User's programs |
| `workout_templates` | Yes | User's templates |
| `template_exercises` | Inherited via `template_id` | FK to templates |
| `personal_records` | Yes | User's PRs |
| `settings` | Yes | User preferences |

### Shared vs. User Data Strategy
- `muscle_groups` and seed `exercises` are global — no `user_id`, public read policy
- Custom exercises (`is_custom = 1`) need `user_id` — use conditional RLS: `USING (is_custom = 0 OR user_id = (SELECT auth.uid()))`
- This lets everyone read "Bench Press" but only the creator reads their custom exercise

---

## 4. Database Schema: SQLite → Postgres Migration

### Schema Translation
SQLite types map cleanly to Postgres:
| SQLite | Postgres |
|--------|----------|
| `INTEGER PRIMARY KEY AUTOINCREMENT` | `BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY` or `UUID DEFAULT gen_random_uuid()` |
| `TEXT` | `TEXT` |
| `REAL` | `NUMERIC` or `DOUBLE PRECISION` |
| `INTEGER` (boolean) | `BOOLEAN` |
| `datetime('now')` | `NOW()` or `TIMESTAMPTZ DEFAULT NOW()` |

### Key Schema Changes for Supabase
1. **Add `user_id UUID REFERENCES auth.users(id)`** to all user-owned tables
2. **Switch IDs from INTEGER to UUID** — better for distributed systems, sync, and preventing ID collision between users
3. **Add `created_at TIMESTAMPTZ DEFAULT NOW()`** and **`updated_at TIMESTAMPTZ DEFAULT NOW()`** — required for sync
4. **Add `deleted_at TIMESTAMPTZ`** — soft deletes enable sync conflict resolution
5. **Add `synced_at TIMESTAMPTZ`** — tracks last sync time for local-first
6. **Create trigger for `updated_at`** auto-update:
```sql
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

### Migration Strategy
Phase 18 focuses on Supabase setup + auth only. The actual data migration (local SQLite → Supabase Postgres) happens in **Phase 19 — Cloud Sync & Data Migration**. For Phase 18:
- Create the Supabase project and Postgres schema
- Set up RLS policies
- Implement auth (sign up / sign in / sign out)
- The app continues using local SQLite for all workout data
- Auth state is tracked separately (Supabase session)

---

## 5. Offline-First Sync Architecture (Phase 19 Preview)

### Sync Solution Comparison
| Solution | Maturity | Approach | Expo Support | Cost |
|----------|----------|----------|-------------|------|
| **PowerSync** | Production-ready | Dedicated sync service + local SQLite | Yes (CNG required) | Free tier available, paid for scale |
| **Supastash** | Early (v0.1.16, 5 stars) | Direct Supabase↔SQLite sync | Yes (expo-sqlite) | Free (MIT) |
| **WatermelonDB** | Mature | Custom sync protocol + SQLite | Yes | Free (MIT) |
| **Custom sync** | N/A | Hand-rolled push/pull with timestamps | Yes | Free |
| **Legend-State** | Growing | Observable-based with Supabase plugin | Yes | Free (MIT) |

### Recommendation
For Phase 19, evaluate **custom sync** first (simplest for our use case — single-user, low write frequency, no real-time collab). The app already has a well-structured SQLite layer. A timestamp-based push/pull with conflict resolution (last-write-wins by `updated_at`) may be sufficient without adding a sync framework dependency.

If custom sync proves too complex, **PowerSync** is the most production-ready option but requires a dev build (no Expo Go) and adds a paid service dependency.

**Supastash** is interesting but too early-stage for production.

---

## 6. Common Pitfalls & Anti-Patterns

### Authentication
1. **Don't use `detectSessionInUrl: true` in React Native** — this is for web OAuth redirects, causes issues on mobile
2. **Always implement AppState listener** for token refresh — tokens expire silently if not refreshed when app returns to foreground
3. **Apple full name is only available on first sign-in** — capture it immediately or lose it forever
4. **Google nonce mismatch on iOS** — Google's iOS SDK doesn't send nonces by default; Supabase expects them. Must explicitly handle or use web-based OAuth flow
5. **Don't store service_role key in client code** — it bypasses all RLS

### Database
6. **Enable RLS immediately** — don't prototype without it; forgetting to enable before launch is the #1 security mistake
7. **Index all `user_id` columns** — missing indexes on RLS-referenced columns destroy query performance
8. **Don't use `user_metadata` in RLS policies** — users can modify their own metadata; use `raw_app_meta_data` for authorization
9. **Test RLS from client SDK, not SQL Editor** — SQL Editor bypasses RLS, giving false confidence

### React Native Specific
10. **Node.js `stream` module errors** — supabase-js may try to use WebSocket features that depend on Node core modules. Only import what you need; avoid Realtime unless explicitly required
11. **TypeScript type mismatches** — Postgres types don't always map to JS types cleanly; be explicit about parsing
12. **Subscription memory leaks** — always unsubscribe from `onAuthStateChange` and Realtime channels on component unmount

### Expo Specific
13. **Use `EXPO_PUBLIC_` prefix** for all env vars — Expo strips unprefixed vars from the client bundle
14. **Expo Go limitations** — Apple Sign-In works in Expo Go; Google Sign-In does NOT (needs dev build)
15. **Don't install unnecessary packages** — the old Supabase quickstart includes `@rneui/themed`; skip it if you have your own UI system

---

## 7. Architecture Decision: Phase 18 Scope

### What Phase 18 Should Do
1. Create Supabase project (Postgres + Auth)
2. Design Postgres schema mirroring local SQLite tables (with `user_id`, UUIDs, timestamps)
3. Write RLS policies for all tables
4. Install `@supabase/supabase-js`, `react-native-url-polyfill`, and a storage adapter
5. Create `lib/supabase.ts` client
6. Build auth screens: Sign Up, Sign In, Forgot Password
7. Add auth state management (context/provider wrapping the app)
8. Gate the app behind auth (unauthenticated → auth screens, authenticated → main app)
9. Add sign-out to Settings screen

### What Phase 18 Should NOT Do
- Data migration or sync (Phase 19)
- User profiles with avatars (Phase 20)
- Social features (Phases 21-25)
- Apple/Google sign-in (follow-up to Phase 18 or Phase 20)

### Auth State Architecture
```
App.tsx
├── Loading → check session
├── Not authenticated → AuthStack
│   ├── SignInScreen
│   ├── SignUpScreen
│   └── ForgotPasswordScreen
└── Authenticated → MainApp (existing tabs)
    └── Settings → Sign Out button
```

The existing `onboarding_completed` check in `settings` table remains local. Auth is a separate gate:
- First launch: Onboarding → Auth → Main app
- Subsequent launches: Auth check (auto-restore session) → Main app

---

## 8. Package Installation Summary

### Required (Phase 18)
```bash
npx expo install @supabase/supabase-js react-native-url-polyfill @react-native-async-storage/async-storage
```

### Optional (if using expo-sqlite for auth storage instead of AsyncStorage)
```bash
# No install needed — expo-sqlite already in project
# Just import 'expo-sqlite/localStorage/install' before client init
```

### NOT Needed for Phase 18
- `expo-apple-authentication` (defer social login)
- `@react-native-google-signin/google-signin` (defer social login)
- `expo-auth-session` (defer OAuth flows)
- `expo-web-browser` (defer OAuth flows)
- `@supabase/ssr` (not for React Native)
- Any sync library (Phase 19)

---

## Sources

- [Supabase Expo React Native Quickstart](https://supabase.com/docs/guides/getting-started/quickstarts/expo-react-native)
- [Supabase Auth React Native Quickstart](https://supabase.com/docs/guides/auth/quickstarts/react-native)
- [Expo Guide: Using Supabase](https://docs.expo.dev/guides/using-supabase/)
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Apple Sign-In](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Supabase Google Sign-In](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Native Mobile Auth Blog](https://supabase.com/blog/native-mobile-auth)
- [Supabase RLS Best Practices (Makerkit)](https://makerkit.dev/blog/tutorials/supabase-rls-best-practices)
- [Common Supabase Gotchas in React Native](https://www.prosperasoft.com/blog/database/supabase/supabase-react-native-gotchas/)
- [Supabase Common Mistakes (Hrekov)](https://hrekov.com/blog/supabase-common-mistakes)
- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/)
- [PowerSync + Supabase Integration](https://docs.powersync.com/integration-guides/supabase-+-powersync)
- [Supastash — Offline-First Sync](https://github.com/0xZekeA/supastash)
- [WatermelonDB + Supabase Blog](https://supabase.com/blog/react-native-offline-first-watermelon-db)

---
*Researched: 2026-03-01 — Phase 18: Supabase Setup & Authentication*
