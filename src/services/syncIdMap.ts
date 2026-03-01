import { getDatabase } from '../database/database';

/** Store a local-to-remote ID mapping */
export function setIdMapping(tableName: string, localId: number, remoteId: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO sync_id_map (table_name, local_id, remote_id) VALUES (?, ?, ?)',
    tableName,
    localId,
    remoteId
  );
}

/** Get remote UUID from local ID */
export function getRemoteId(tableName: string, localId: number): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ remote_id: string }>(
    'SELECT remote_id FROM sync_id_map WHERE table_name = ? AND local_id = ?',
    tableName,
    localId
  );
  return row?.remote_id ?? null;
}

/** Get local ID from remote UUID */
export function getLocalId(tableName: string, remoteId: string): number | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ local_id: number }>(
    'SELECT local_id FROM sync_id_map WHERE table_name = ? AND remote_id = ?',
    tableName,
    remoteId
  );
  return row?.local_id ?? null;
}

/** Get all mappings for a table */
export function getAllMappings(tableName: string): { localId: number; remoteId: string }[] {
  const db = getDatabase();
  const rows = db.getAllSync<{ local_id: number; remote_id: string }>(
    'SELECT local_id, remote_id FROM sync_id_map WHERE table_name = ?',
    tableName
  );
  return rows.map((r) => ({ localId: r.local_id, remoteId: r.remote_id }));
}

/** Check if initial migration has been done */
export function hasMigrated(): boolean {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    'migrated'
  );
  return row?.value === 'true';
}

/** Mark migration as complete */
export function setMigrated(): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    'migrated',
    'true'
  );
}

/** Get last sync timestamp */
export function getLastSyncedAt(): string | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ value: string }>(
    'SELECT value FROM sync_meta WHERE key = ?',
    'last_synced_at'
  );
  return row?.value ?? null;
}

/** Set last sync timestamp */
export function setLastSyncedAt(timestamp: string): void {
  const db = getDatabase();
  db.runSync(
    'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
    'last_synced_at',
    timestamp
  );
}
