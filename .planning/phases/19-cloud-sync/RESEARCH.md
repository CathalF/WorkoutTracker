# Phase 19 — Cloud Sync & Data Migration: Research

## 1. Current Data Architecture

### Local SQLite Schema (8 tables)
| Table | PK Type | Has user_id | Has timestamps | Row count (typical) |
|-------|---------|-------------|----------------|---------------------|
| `muscle_groups` | INTEGER AUTO | No (shared) | No | 7 (seed) |
| `exercises` | INTEGER AUTO | No (is_custom flag) | No | ~50 (seed + custom) |
| `workouts` | INTEGER AUTO | No | `created_at` only | 10-500 |
| `sets` | INTEGER AUTO | No | No | 30-2000 |
| `programs` | INTEGER AUTO | No | `created_at` only | 1-10 |
| `workout_templates` | INTEGER AUTO | No | `created_at` only | 1-20 |
| `template_exercises` | INTEGER AUTO | No | No | 5-60 |
| `personal_records` | INTEGER AUTO | No | `created_at` only | 5-100 |
| `settings` | TEXT (key) | No | No | 5-10 |

### Supabase Postgres Schema (9 tables)
All user-owned tables have: UUID PKs, `user_id`, `created_at`, `updated_at`, `deleted_at`.
Muscle groups use BIGINT IDENTITY PK (shared reference data).
Exercises use UUID PK with optional `user_id` for custom exercises.

### Key Differences: SQLite → Postgres
| Aspect | Local SQLite | Supabase Postgres |
|--------|-------------|-------------------|
| PKs | INTEGER autoincrement | UUID (gen_random_uuid) |
| Ownership | Implicit (single user) | Explicit (user_id column) |
| Timestamps | Partial (created_at on some) | Full (created_at, updated_at, deleted_at) |
| Deletes | Hard delete | Soft delete (deleted_at) |
| Boolean | INTEGER (0/1) | BOOLEAN |
| JSON | TEXT (stringified) | JSONB |
| Settings | key TEXT PK | UUID PK + user_id + key |

---

## 2. Sync Strategy Comparison

### Option A: Custom Timestamp-Based Sync (Recommended)
**How it works:**
- Track `last_synced_at` timestamp per table in local settings
- On sync: push local changes since last sync → pull remote changes since last sync
- Conflict resolution: last-write-wins by `updated_at`
- One-time initial migration: bulk push all local data to Supabase on first sync

**Pros:**
- Zero new dependencies
- Full control over sync logic
- Uses existing Supabase client (`supabase-js`)
- Works in Expo Go (no native modules)
- Simple for single-user, low write frequency apps

**Cons:**
- Must handle ID mapping (local INTEGER → remote UUID)
- Must handle edge cases (network failures, partial syncs)
- Must build sync UI (progress, errors, retry)

**Verdict: Best fit.** This is a single-user app with low write frequency. Custom sync is simple and keeps the dependency footprint minimal.

### Option B: Supastash
**How it works:** Drop-in sync engine that wraps Supabase + expo-sqlite. Auto-syncs on write.

**Pros:** Minimal code, automatic sync
**Cons:** Very early stage (v0.1.x, ~5 GitHub stars), would require restructuring our entire database layer to use Supastash's API instead of raw expo-sqlite, unclear maintenance trajectory.

**Verdict: Too risky.** Too immature for production use.

### Option C: PowerSync
**How it works:** Dedicated sync service with local SQLite replica. Changes sync via PowerSync cloud.

**Pros:** Battle-tested, handles conflicts, works offline
**Cons:** Requires dev build (no Expo Go), adds paid service dependency, requires restructuring data access layer.

**Verdict: Overkill.** Great for multi-user collaborative apps, but our use case is single-user personal data.

### Option D: WatermelonDB
**How it works:** Reactive database built on SQLite with built-in sync protocol.

**Pros:** Mature, great performance, lazy-loading
**Cons:** Would require rewriting entire data layer to use WatermelonDB models, significant migration effort, heavier than needed.

**Verdict: Too much rework.** Our existing expo-sqlite layer works well. Not worth rewriting.

---

## 3. Custom Sync Architecture Design

### 3a. Sync Flow

```
User taps "Sync Now" or auto-sync triggers
    │
    ├── 1. Check network connectivity
    │
    ├── 2. PUSH: Local → Supabase
    │   ├── Read local changes since last_synced_at
    │   ├── Map local INTEGER IDs → UUID (using id_map table)
    │   ├── Upsert to Supabase (INSERT ... ON CONFLICT UPDATE)
    │   └── Store returned UUIDs in local id_map
    │
    ├── 3. PULL: Supabase → Local
    │   ├── Query Supabase for rows updated since last_synced_at
    │   ├── Map remote UUIDs → local INTEGER IDs
    │   ├── Upsert into local SQLite
    │   └── Handle soft deletes (mark local rows deleted)
    │
    ├── 4. Update last_synced_at
    │
    └── 5. Report success/failure to UI
```

### 3b. ID Mapping Strategy

Local SQLite uses INTEGER autoincrement IDs. Supabase uses UUIDs. We need a mapping table:

```sql
CREATE TABLE IF NOT EXISTS sync_id_map (
  table_name TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  remote_id TEXT NOT NULL,
  PRIMARY KEY (table_name, local_id)
);
CREATE INDEX IF NOT EXISTS idx_sync_id_map_remote ON sync_id_map(table_name, remote_id);
```

For **muscle_groups**: Map by name (shared reference data). Query Supabase `muscle_groups` by name → store BIGINT ID mapping.

For **exercises**: Seed exercises map by name + muscle_group. Custom exercises get new UUIDs on first push.

For **all other tables**: Generate UUID on first push, store in id_map.

### 3c. Table Sync Order (respecting FK constraints)

1. `muscle_groups` (shared — pull from Supabase, match by name)
2. `exercises` (push custom; map seed by name)
3. `programs` (no FK dependencies beyond user_id)
4. `workout_templates` (depends on muscle_groups, programs)
5. `template_exercises` (depends on workout_templates, exercises)
6. `workouts` (depends on muscle_groups)
7. `sets` (depends on workouts, exercises)
8. `personal_records` (depends on exercises)
9. `user_settings` (independent)

### 3d. SQLite Schema Additions for Sync

```sql
-- Track sync metadata per row
ALTER TABLE exercises ADD COLUMN updated_at TEXT;
ALTER TABLE exercises ADD COLUMN deleted_at TEXT;
ALTER TABLE workouts ADD COLUMN updated_at TEXT;
ALTER TABLE workouts ADD COLUMN deleted_at TEXT;
ALTER TABLE sets ADD COLUMN updated_at TEXT;
ALTER TABLE sets ADD COLUMN deleted_at TEXT;
ALTER TABLE sets ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE programs ADD COLUMN updated_at TEXT;
ALTER TABLE programs ADD COLUMN deleted_at TEXT;
ALTER TABLE workout_templates ADD COLUMN updated_at TEXT;
ALTER TABLE workout_templates ADD COLUMN deleted_at TEXT;
ALTER TABLE template_exercises ADD COLUMN updated_at TEXT;
ALTER TABLE template_exercises ADD COLUMN deleted_at TEXT;
ALTER TABLE template_exercises ADD COLUMN created_at TEXT NOT NULL DEFAULT (datetime('now'));
ALTER TABLE personal_records ADD COLUMN updated_at TEXT;
ALTER TABLE personal_records ADD COLUMN deleted_at TEXT;

-- Sync metadata table
CREATE TABLE IF NOT EXISTS sync_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- ID mapping table
CREATE TABLE IF NOT EXISTS sync_id_map (
  table_name TEXT NOT NULL,
  local_id INTEGER NOT NULL,
  remote_id TEXT NOT NULL,
  PRIMARY KEY (table_name, local_id)
);
CREATE INDEX IF NOT EXISTS idx_sync_id_map_remote ON sync_id_map(table_name, remote_id);
```

### 3e. Conflict Resolution

**Strategy: Last-Write-Wins (LWW) by `updated_at`**

- When pushing: Supabase `updated_at` trigger auto-sets server timestamp
- When pulling: compare remote `updated_at` with local `updated_at`
  - If remote is newer → overwrite local
  - If local is newer → skip (will be pushed on next sync)
  - If equal → no action needed

**Why LWW is sufficient:**
- Single user (no concurrent edits from multiple users)
- Only scenario: user edits on device A offline, then edits on device B → syncs. LWW picks the most recent edit, which is almost certainly the user's intent.

### 3f. Initial Migration (First Sync)

On the very first sync after auth:
1. Push ALL local data to Supabase (bulk insert)
2. Store all ID mappings
3. Set `last_synced_at` to current server time
4. Show migration progress UI

This handles users who had local-only data before auth was added.

---

## 4. Sync Trigger Strategy

### Manual Sync
- "Sync Now" button in Settings (most reliable, user-controlled)
- Shows sync status: idle, syncing, success, error with timestamp

### Auto-sync (background)
- On app foreground (AppState 'active') if >5 minutes since last sync
- After completing a workout (natural sync point)
- NOT on every write (too aggressive for battery/network)

---

## 5. Error Handling

| Error | Recovery |
|-------|----------|
| Network failure mid-push | Retry from last successful table. Idempotent upserts mean re-pushing is safe. |
| Network failure mid-pull | Retry. Pull is read-only, safe to repeat. |
| FK constraint violation on push | Ensure sync order respects FK dependencies (section 3c). |
| Duplicate key on push | Use upsert (INSERT ... ON CONFLICT UPDATE). |
| Auth token expired | Supabase auto-refreshes. If expired, show re-auth prompt. |
| Rate limiting | Exponential backoff with max 3 retries. |

---

## 6. Scope for Phase 19

### What Phase 19 Does
1. Add sync metadata columns to local SQLite schema (migration)
2. Create sync_id_map and sync_meta tables
3. Create sync engine service (`src/services/syncEngine.ts`)
4. Create initial migration function (push all local → Supabase)
5. Create incremental sync (push changes + pull changes)
6. Add "Sync Now" button + status display in Settings
7. Add auto-sync on app foreground
8. Update local service functions to set `updated_at` on writes

### What Phase 19 Does NOT Do
- Real-time subscriptions (not needed for single-user)
- Multi-device conflict resolution UI (LWW is automatic)
- Offline queue with retry (simple retry on next sync is sufficient)
- Migration from SQLite-only to Supabase-only (local remains primary)

---

## Sources

- [Expo Local-First Architecture Guide](https://docs.expo.dev/guides/local-first/)
- [Combining SQLite with Supabase for Offline-Cloud Sync](https://www.w3resource.com/sqlite/snippets/combining-sqlite-with-supabase.php)
- [Supabase + PowerSync Offline-First](https://www.powersync.com/blog/offline-first-apps-made-simple-supabase-powersync)
- [Supastash — Offline-First Sync Engine](https://github.com/0xZekeA/supastash)
- [WatermelonDB + Supabase](https://supabase.com/blog/react-native-offline-first-watermelon-db)
- [Supabase Discussion: Offline-First Sync](https://github.com/orgs/supabase/discussions/14102)
- [How to Synchronize SQLite with Remote Servers](https://www.slingacademy.com/article/how-to-synchronize-sqlite-databases-with-remote-servers/)

---
*Researched: 2026-03-01 — Phase 19: Cloud Sync & Data Migration*
