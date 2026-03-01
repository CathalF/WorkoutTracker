import { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { useAuth } from './AuthContext';
import { syncAll, initialMigration, type SyncResult } from '../services/syncEngine';
import { hasMigrated as checkMigrated, getLastSyncedAt } from '../services/syncIdMap';

const SYNC_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

interface SyncContextValue {
  isSyncing: boolean;
  lastSyncedAt: string | null;
  lastSyncResult: SyncResult | null;
  syncNow: () => Promise<void>;
  hasMigrated: boolean;
}

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAtState] = useState<string | null>(null);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [migrated, setMigrated] = useState(false);
  const syncInProgressRef = useRef(false);
  const lastSyncTimeRef = useRef<number>(0);

  // Check migration status on mount
  useEffect(() => {
    const isMigrated = checkMigrated();
    setMigrated(isMigrated);
    setLastSyncedAtState(getLastSyncedAt());
  }, []);

  // Run initial migration when user is authenticated and not yet migrated
  useEffect(() => {
    if (!user || migrated) return;

    const runMigration = async () => {
      if (syncInProgressRef.current) return;
      syncInProgressRef.current = true;
      setIsSyncing(true);

      try {
        const result = await initialMigration(user.id);
        setLastSyncResult(result);
        setLastSyncedAtState(getLastSyncedAt());
        setMigrated(true);

        // After migration, do a pull to get any server-side data
        if (result.success) {
          const syncResult = await syncAll(user.id);
          setLastSyncResult(syncResult);
          setLastSyncedAtState(getLastSyncedAt());
          lastSyncTimeRef.current = Date.now();
        }
      } catch (e) {
        setLastSyncResult({
          success: false,
          pushed: 0,
          pulled: 0,
          errors: [e instanceof Error ? e.message : String(e)],
          duration: 0,
        });
      } finally {
        setIsSyncing(false);
        syncInProgressRef.current = false;
      }
    };

    runMigration();
  }, [user, migrated]);

  const syncNow = useCallback(async () => {
    if (!user || syncInProgressRef.current) return;

    syncInProgressRef.current = true;
    setIsSyncing(true);

    try {
      const result = await syncAll(user.id);
      setLastSyncResult(result);
      setLastSyncedAtState(getLastSyncedAt());
      lastSyncTimeRef.current = Date.now();
    } catch (e) {
      setLastSyncResult({
        success: false,
        pushed: 0,
        pulled: 0,
        errors: [e instanceof Error ? e.message : String(e)],
        duration: 0,
      });
    } finally {
      setIsSyncing(false);
      syncInProgressRef.current = false;
    }
  }, [user]);

  // Auto-sync on app foreground with cooldown
  useEffect(() => {
    if (!user || !migrated) return;

    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        const elapsed = Date.now() - lastSyncTimeRef.current;
        if (elapsed >= SYNC_COOLDOWN_MS) {
          syncNow().catch(() => {});
        }
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [user, migrated, syncNow]);

  return (
    <SyncContext.Provider
      value={{
        isSyncing,
        lastSyncedAt,
        lastSyncResult,
        syncNow,
        hasMigrated: migrated,
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync(): SyncContextValue {
  const ctx = useContext(SyncContext);
  if (!ctx) throw new Error('useSync must be used within SyncProvider');
  return ctx;
}
