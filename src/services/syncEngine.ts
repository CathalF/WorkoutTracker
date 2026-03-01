import { supabase } from '../lib/supabase';
import { getDatabase } from '../database/database';
import {
  setIdMapping,
  getRemoteId,
  getLocalId,
  setMigrated,
  getLastSyncedAt,
  setLastSyncedAt,
} from './syncIdMap';

export interface SyncResult {
  success: boolean;
  pushed: number;
  pulled: number;
  errors: string[];
  duration: number;
}

// ── Internal types for local DB rows ──

interface LocalExercise {
  id: number;
  name: string;
  muscle_group_id: number;
  is_custom: number;
  default_rest_seconds: number | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalWorkout {
  id: number;
  date: string;
  muscle_group_id: number;
  notes: string | null;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalSet {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalProgram {
  id: number;
  name: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalTemplate {
  id: number;
  name: string;
  muscle_group_id: number;
  split_label: string;
  muscle_group_ids: string;
  program_id: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalTemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  sort_order: number;
  default_sets: number;
  created_at: string | null;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalPR {
  id: number;
  exercise_id: number;
  pr_type: string;
  weight: number;
  reps: number;
  date: string;
  created_at: string;
  updated_at: string | null;
  deleted_at: string | null;
}

interface LocalSetting {
  key: string;
  value: string;
}

// ── Helpers ──

/** Get remote muscle_group_id from local muscle_group_id via name mapping */
function getRemoteMuscleGroupId(
  localMgId: number,
  localMgMap: Map<number, string>,
  remoteMgMap: Map<string, number>
): number | null {
  const name = localMgMap.get(localMgId);
  if (!name) return null;
  return remoteMgMap.get(name) ?? null;
}

function buildLocalMuscleGroupMap(): Map<number, string> {
  const db = getDatabase();
  const rows = db.getAllSync<{ id: number; name: string }>('SELECT id, name FROM muscle_groups');
  const map = new Map<number, string>();
  for (const row of rows) {
    map.set(row.id, row.name);
  }
  return map;
}

async function buildRemoteMuscleGroupMap(): Promise<Map<string, number>> {
  const { data, error } = await supabase.from('muscle_groups').select('id, name');
  if (error) throw new Error(`Failed to fetch remote muscle_groups: ${error.message}`);
  const map = new Map<string, number>();
  for (const row of data ?? []) {
    map.set(row.name, row.id);
  }
  return map;
}

// ── Initial Migration ──

export async function initialMigration(userId: string): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let pushed = 0;

  try {
    const db = getDatabase();
    const localMgMap = buildLocalMuscleGroupMap();
    const remoteMgMap = await buildRemoteMuscleGroupMap();

    // 1. Map seed exercises by name + muscle_group to remote seed exercises
    const { data: remoteExercises } = await supabase
      .from('exercises')
      .select('id, name, muscle_group_id, is_custom')
      .eq('is_custom', false);

    // Build remote exercise lookup: "name|muscle_group_id" -> remote UUID
    const remoteExLookup = new Map<string, string>();
    for (const re of remoteExercises ?? []) {
      remoteExLookup.set(`${re.name}|${re.muscle_group_id}`, re.id);
    }

    // Map local seed exercises to remote seed exercises
    const localExercises = db.getAllSync<LocalExercise>(
      'SELECT id, name, muscle_group_id, is_custom, default_rest_seconds, updated_at, deleted_at FROM exercises'
    );

    for (const ex of localExercises) {
      if (ex.is_custom === 0) {
        // Seed exercise — map by name + remote muscle group id
        const remoteMgId = getRemoteMuscleGroupId(ex.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId !== null) {
          const key = `${ex.name}|${remoteMgId}`;
          const remoteId = remoteExLookup.get(key);
          if (remoteId) {
            setIdMapping('exercises', ex.id, remoteId);
          }
          // If no remote match, skip — seed data may differ
        }
      }
    }

    // 2. Push custom exercises
    const customExercises = localExercises.filter((e) => e.is_custom === 1);
    for (const ex of customExercises) {
      try {
        const remoteMgId = getRemoteMuscleGroupId(ex.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;

        const { data, error } = await supabase
          .from('exercises')
          .upsert({
            name: ex.name,
            muscle_group_id: remoteMgId,
            is_custom: true,
            default_rest_seconds: ex.default_rest_seconds,
            user_id: userId,
            deleted_at: ex.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`exercise ${ex.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('exercises', ex.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`exercise ${ex.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 3. Push programs
    const localPrograms = db.getAllSync<LocalProgram>(
      'SELECT id, name, created_at, updated_at, deleted_at FROM programs'
    );
    for (const prog of localPrograms) {
      try {
        const { data, error } = await supabase
          .from('programs')
          .upsert({
            user_id: userId,
            name: prog.name,
            created_at: prog.created_at,
            deleted_at: prog.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`program ${prog.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('programs', prog.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`program ${prog.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 4. Push workout_templates
    const localTemplates = db.getAllSync<LocalTemplate>(
      'SELECT id, name, muscle_group_id, split_label, muscle_group_ids, program_id, sort_order, created_at, updated_at, deleted_at FROM workout_templates'
    );
    for (const tmpl of localTemplates) {
      try {
        const remoteMgId = getRemoteMuscleGroupId(tmpl.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;

        // Map muscle_group_ids array
        let localMgIds: number[] = [];
        try { localMgIds = JSON.parse(tmpl.muscle_group_ids); } catch {}
        const remoteMgIds = localMgIds
          .map((id) => getRemoteMuscleGroupId(id, localMgMap, remoteMgMap))
          .filter((id): id is number => id !== null);

        // Map program_id
        const remoteProgramId = tmpl.program_id ? getRemoteId('programs', tmpl.program_id) : null;

        const { data, error } = await supabase
          .from('workout_templates')
          .upsert({
            user_id: userId,
            name: tmpl.name,
            muscle_group_id: remoteMgId,
            split_label: tmpl.split_label,
            muscle_group_ids: remoteMgIds,
            program_id: remoteProgramId,
            sort_order: tmpl.sort_order,
            created_at: tmpl.created_at,
            deleted_at: tmpl.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`template ${tmpl.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('workout_templates', tmpl.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`template ${tmpl.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 5. Push template_exercises
    const localTEs = db.getAllSync<LocalTemplateExercise>(
      'SELECT id, template_id, exercise_id, sort_order, default_sets, created_at, updated_at, deleted_at FROM template_exercises'
    );
    for (const te of localTEs) {
      try {
        const remoteTemplateId = getRemoteId('workout_templates', te.template_id);
        const remoteExId = getRemoteId('exercises', te.exercise_id);
        if (!remoteTemplateId || !remoteExId) continue;

        const { data, error } = await supabase
          .from('template_exercises')
          .upsert({
            template_id: remoteTemplateId,
            exercise_id: remoteExId,
            sort_order: te.sort_order,
            default_sets: te.default_sets,
            deleted_at: te.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`template_exercise ${te.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('template_exercises', te.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`template_exercise ${te.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 6. Push workouts
    const localWorkouts = db.getAllSync<LocalWorkout>(
      'SELECT id, date, muscle_group_id, notes, created_at, updated_at, deleted_at FROM workouts'
    );
    for (const w of localWorkouts) {
      try {
        const remoteMgId = getRemoteMuscleGroupId(w.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;

        const { data, error } = await supabase
          .from('workouts')
          .upsert({
            user_id: userId,
            date: w.date,
            muscle_group_id: remoteMgId,
            notes: w.notes,
            created_at: w.created_at,
            deleted_at: w.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`workout ${w.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('workouts', w.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`workout ${w.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 7. Push sets
    const localSets = db.getAllSync<LocalSet>(
      'SELECT id, workout_id, exercise_id, set_number, weight, reps, created_at, updated_at, deleted_at FROM sets'
    );
    for (const s of localSets) {
      try {
        const remoteWorkoutId = getRemoteId('workouts', s.workout_id);
        const remoteExId = getRemoteId('exercises', s.exercise_id);
        if (!remoteWorkoutId || !remoteExId) continue;

        const { data, error } = await supabase
          .from('sets')
          .upsert({
            workout_id: remoteWorkoutId,
            exercise_id: remoteExId,
            set_number: s.set_number,
            weight: s.weight,
            reps: s.reps,
            deleted_at: s.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`set ${s.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('sets', s.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`set ${s.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 8. Push personal_records
    const localPRs = db.getAllSync<LocalPR>(
      'SELECT id, exercise_id, pr_type, weight, reps, date, created_at, updated_at, deleted_at FROM personal_records'
    );
    for (const pr of localPRs) {
      try {
        const remoteExId = getRemoteId('exercises', pr.exercise_id);
        if (!remoteExId) continue;

        const { data, error } = await supabase
          .from('personal_records')
          .upsert({
            user_id: userId,
            exercise_id: remoteExId,
            pr_type: pr.pr_type,
            weight: pr.weight,
            reps: pr.reps,
            date: pr.date,
            created_at: pr.created_at,
            deleted_at: pr.deleted_at,
          })
          .select('id')
          .single();

        if (error) {
          errors.push(`pr ${pr.id}: ${error.message}`);
        } else if (data) {
          setIdMapping('personal_records', pr.id, data.id);
          pushed++;
        }
      } catch (e) {
        errors.push(`pr ${pr.id}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 9. Push user_settings
    const localSettings = db.getAllSync<LocalSetting>(
      'SELECT key, value FROM settings'
    );
    for (const setting of localSettings) {
      try {
        const { error } = await supabase
          .from('user_settings')
          .upsert(
            {
              user_id: userId,
              key: setting.key,
              value: setting.value,
            },
            { onConflict: 'user_id,key' }
          );

        if (error) {
          errors.push(`setting ${setting.key}: ${error.message}`);
        } else {
          pushed++;
        }
      } catch (e) {
        errors.push(`setting ${setting.key}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // 10. Mark migration complete and set last synced
    const now = new Date().toISOString();
    setLastSyncedAt(now);
    setMigrated();

    return {
      success: errors.length === 0,
      pushed,
      pulled: 0,
      errors,
      duration: Date.now() - start,
    };
  } catch (e) {
    errors.push(`migration fatal: ${e instanceof Error ? e.message : String(e)}`);
    return {
      success: false,
      pushed,
      pulled: 0,
      errors,
      duration: Date.now() - start,
    };
  }
}

// ── Incremental Sync ──

/** Table sync order respecting FK constraints */
const SYNC_TABLES = [
  'exercises',
  'programs',
  'workout_templates',
  'template_exercises',
  'workouts',
  'sets',
  'personal_records',
] as const;

type SyncTable = (typeof SYNC_TABLES)[number];

export async function syncAll(userId: string): Promise<SyncResult> {
  const start = Date.now();
  const errors: string[] = [];
  let pushed = 0;
  let pulled = 0;
  const lastSynced = getLastSyncedAt();

  try {
    const db = getDatabase();
    const localMgMap = buildLocalMuscleGroupMap();
    const remoteMgMap = await buildRemoteMuscleGroupMap();

    // ── PUSH phase ──
    for (const table of SYNC_TABLES) {
      try {
        const result = await pushTable(db, table, userId, lastSynced, localMgMap, remoteMgMap);
        pushed += result.count;
        errors.push(...result.errors);
      } catch (e) {
        errors.push(`push ${table}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Push settings
    try {
      const settingsResult = await pushSettings(db, userId);
      pushed += settingsResult.count;
      errors.push(...settingsResult.errors);
    } catch (e) {
      errors.push(`push settings: ${e instanceof Error ? e.message : String(e)}`);
    }

    // ── PULL phase ──
    for (const table of SYNC_TABLES) {
      try {
        const result = await pullTable(db, table, userId, lastSynced, localMgMap, remoteMgMap);
        pulled += result.count;
        errors.push(...result.errors);
      } catch (e) {
        errors.push(`pull ${table}: ${e instanceof Error ? e.message : String(e)}`);
      }
    }

    // Update last synced
    const now = new Date().toISOString();
    setLastSyncedAt(now);

    return {
      success: errors.length === 0,
      pushed,
      pulled,
      errors,
      duration: Date.now() - start,
    };
  } catch (e) {
    errors.push(`sync fatal: ${e instanceof Error ? e.message : String(e)}`);
    return {
      success: false,
      pushed,
      pulled,
      errors,
      duration: Date.now() - start,
    };
  }
}

// ── Push helpers ──

async function pushTable(
  db: ReturnType<typeof getDatabase>,
  table: SyncTable,
  userId: string,
  lastSynced: string | null,
  localMgMap: Map<number, string>,
  remoteMgMap: Map<string, number>
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  const whereClause = lastSynced
    ? `WHERE updated_at > '${lastSynced}'`
    : '';

  switch (table) {
    case 'exercises': {
      const rows = db.getAllSync<LocalExercise>(
        `SELECT id, name, muscle_group_id, is_custom, default_rest_seconds, updated_at, deleted_at FROM exercises ${whereClause}`
      );
      const custom = rows.filter((r) => r.is_custom === 1);
      for (const ex of custom) {
        const remoteMgId = getRemoteMuscleGroupId(ex.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;
        const existingRemoteId = getRemoteId('exercises', ex.id);

        const payload: Record<string, unknown> = {
          name: ex.name,
          muscle_group_id: remoteMgId,
          is_custom: true,
          default_rest_seconds: ex.default_rest_seconds,
          user_id: userId,
          deleted_at: ex.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('exercises')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push exercise ${ex.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('exercises', ex.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'programs': {
      const rows = db.getAllSync<LocalProgram>(
        `SELECT id, name, created_at, updated_at, deleted_at FROM programs ${whereClause}`
      );
      for (const prog of rows) {
        const existingRemoteId = getRemoteId('programs', prog.id);
        const payload: Record<string, unknown> = {
          user_id: userId,
          name: prog.name,
          created_at: prog.created_at,
          deleted_at: prog.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('programs')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push program ${prog.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('programs', prog.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'workout_templates': {
      const rows = db.getAllSync<LocalTemplate>(
        `SELECT id, name, muscle_group_id, split_label, muscle_group_ids, program_id, sort_order, created_at, updated_at, deleted_at FROM workout_templates ${whereClause}`
      );
      for (const tmpl of rows) {
        const remoteMgId = getRemoteMuscleGroupId(tmpl.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;

        let localMgIds: number[] = [];
        try { localMgIds = JSON.parse(tmpl.muscle_group_ids); } catch {}
        const remoteMgIds = localMgIds
          .map((id) => getRemoteMuscleGroupId(id, localMgMap, remoteMgMap))
          .filter((id): id is number => id !== null);

        const remoteProgramId = tmpl.program_id ? getRemoteId('programs', tmpl.program_id) : null;
        const existingRemoteId = getRemoteId('workout_templates', tmpl.id);

        const payload: Record<string, unknown> = {
          user_id: userId,
          name: tmpl.name,
          muscle_group_id: remoteMgId,
          split_label: tmpl.split_label,
          muscle_group_ids: remoteMgIds,
          program_id: remoteProgramId,
          sort_order: tmpl.sort_order,
          created_at: tmpl.created_at,
          deleted_at: tmpl.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('workout_templates')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push template ${tmpl.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('workout_templates', tmpl.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'template_exercises': {
      const rows = db.getAllSync<LocalTemplateExercise>(
        `SELECT id, template_id, exercise_id, sort_order, default_sets, created_at, updated_at, deleted_at FROM template_exercises ${whereClause}`
      );
      for (const te of rows) {
        const remoteTemplateId = getRemoteId('workout_templates', te.template_id);
        const remoteExId = getRemoteId('exercises', te.exercise_id);
        if (!remoteTemplateId || !remoteExId) continue;
        const existingRemoteId = getRemoteId('template_exercises', te.id);

        const payload: Record<string, unknown> = {
          template_id: remoteTemplateId,
          exercise_id: remoteExId,
          sort_order: te.sort_order,
          default_sets: te.default_sets,
          deleted_at: te.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('template_exercises')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push template_exercise ${te.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('template_exercises', te.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'workouts': {
      const rows = db.getAllSync<LocalWorkout>(
        `SELECT id, date, muscle_group_id, notes, created_at, updated_at, deleted_at FROM workouts ${whereClause}`
      );
      for (const w of rows) {
        const remoteMgId = getRemoteMuscleGroupId(w.muscle_group_id, localMgMap, remoteMgMap);
        if (remoteMgId === null) continue;
        const existingRemoteId = getRemoteId('workouts', w.id);

        const payload: Record<string, unknown> = {
          user_id: userId,
          date: w.date,
          muscle_group_id: remoteMgId,
          notes: w.notes,
          created_at: w.created_at,
          deleted_at: w.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('workouts')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push workout ${w.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('workouts', w.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'sets': {
      const rows = db.getAllSync<LocalSet>(
        `SELECT id, workout_id, exercise_id, set_number, weight, reps, created_at, updated_at, deleted_at FROM sets ${whereClause}`
      );
      for (const s of rows) {
        const remoteWorkoutId = getRemoteId('workouts', s.workout_id);
        const remoteExId = getRemoteId('exercises', s.exercise_id);
        if (!remoteWorkoutId || !remoteExId) continue;
        const existingRemoteId = getRemoteId('sets', s.id);

        const payload: Record<string, unknown> = {
          workout_id: remoteWorkoutId,
          exercise_id: remoteExId,
          set_number: s.set_number,
          weight: s.weight,
          reps: s.reps,
          deleted_at: s.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('sets')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push set ${s.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('sets', s.id, data.id);
          count++;
        }
      }
      break;
    }
    case 'personal_records': {
      const rows = db.getAllSync<LocalPR>(
        `SELECT id, exercise_id, pr_type, weight, reps, date, created_at, updated_at, deleted_at FROM personal_records ${whereClause}`
      );
      for (const pr of rows) {
        const remoteExId = getRemoteId('exercises', pr.exercise_id);
        if (!remoteExId) continue;
        const existingRemoteId = getRemoteId('personal_records', pr.id);

        const payload: Record<string, unknown> = {
          user_id: userId,
          exercise_id: remoteExId,
          pr_type: pr.pr_type,
          weight: pr.weight,
          reps: pr.reps,
          date: pr.date,
          created_at: pr.created_at,
          deleted_at: pr.deleted_at,
        };
        if (existingRemoteId) payload.id = existingRemoteId;

        const { data, error } = await supabase
          .from('personal_records')
          .upsert(payload)
          .select('id')
          .single();

        if (error) {
          errors.push(`push pr ${pr.id}: ${error.message}`);
        } else if (data) {
          if (!existingRemoteId) setIdMapping('personal_records', pr.id, data.id);
          count++;
        }
      }
      break;
    }
  }

  return { count, errors };
}

async function pushSettings(
  db: ReturnType<typeof getDatabase>,
  userId: string
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  const settings = db.getAllSync<LocalSetting>('SELECT key, value FROM settings');
  for (const setting of settings) {
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert(
          { user_id: userId, key: setting.key, value: setting.value },
          { onConflict: 'user_id,key' }
        );
      if (error) {
        errors.push(`push setting ${setting.key}: ${error.message}`);
      } else {
        count++;
      }
    } catch (e) {
      errors.push(`push setting ${setting.key}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { count, errors };
}

// ── Pull helpers ──

async function pullTable(
  db: ReturnType<typeof getDatabase>,
  table: SyncTable,
  userId: string,
  lastSynced: string | null,
  localMgMap: Map<number, string>,
  remoteMgMap: Map<string, number>
): Promise<{ count: number; errors: string[] }> {
  const errors: string[] = [];
  let count = 0;

  // Build reverse muscle group map: remote_id -> local_id
  const reverseMgMap = new Map<number, number>();
  for (const [localId, name] of localMgMap) {
    const remoteId = remoteMgMap.get(name);
    if (remoteId !== undefined) {
      reverseMgMap.set(remoteId, localId);
    }
  }

  try {
    switch (table) {
      case 'exercises': {
        let query = supabase
          .from('exercises')
          .select('*')
          .eq('is_custom', true)
          .eq('user_id', userId);
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull exercises: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('exercises', remote.id);
          const localMgId = reverseMgMap.get(remote.muscle_group_id);
          if (localMgId === undefined) continue;

          if (localId) {
            // Update existing local row if remote is newer
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM exercises WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE exercises SET name = ?, muscle_group_id = ?, default_rest_seconds = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                remote.name, localMgId, remote.default_rest_seconds, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            // Insert new local row
            const result = db.runSync(
              'INSERT INTO exercises (name, muscle_group_id, is_custom, default_rest_seconds, updated_at, deleted_at) VALUES (?, ?, 1, ?, ?, ?)',
              remote.name, localMgId, remote.default_rest_seconds, remote.updated_at, remote.deleted_at
            );
            setIdMapping('exercises', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'programs': {
        let query = supabase
          .from('programs')
          .select('*')
          .eq('user_id', userId);
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull programs: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('programs', remote.id);
          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM programs WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE programs SET name = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                remote.name, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO programs (name, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?)',
              remote.name, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('programs', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'workout_templates': {
        let query = supabase
          .from('workout_templates')
          .select('*')
          .eq('user_id', userId);
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull templates: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('workout_templates', remote.id);
          const localMgId = reverseMgMap.get(remote.muscle_group_id);
          if (localMgId === undefined) continue;

          const remoteMgIdsArr: number[] = Array.isArray(remote.muscle_group_ids) ? remote.muscle_group_ids : [];
          const localMgIds = remoteMgIdsArr
            .map((id: number) => reverseMgMap.get(id))
            .filter((id): id is number => id !== undefined);

          const localProgramId = remote.program_id ? getLocalId('programs', remote.program_id) : null;

          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM workout_templates WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE workout_templates SET name = ?, muscle_group_id = ?, split_label = ?, muscle_group_ids = ?, program_id = ?, sort_order = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                remote.name, localMgId, remote.split_label, JSON.stringify(localMgIds), localProgramId, remote.sort_order, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO workout_templates (name, muscle_group_id, split_label, muscle_group_ids, program_id, sort_order, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              remote.name, localMgId, remote.split_label, JSON.stringify(localMgIds), localProgramId, remote.sort_order, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('workout_templates', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'template_exercises': {
        // Template exercises are scoped via template ownership
        let query = supabase
          .from('template_exercises')
          .select('*');
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull template_exercises: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('template_exercises', remote.id);
          const localTemplateId = getLocalId('workout_templates', remote.template_id);
          const localExId = getLocalId('exercises', remote.exercise_id);
          if (localTemplateId === null || localExId === null) continue;

          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM template_exercises WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE template_exercises SET template_id = ?, exercise_id = ?, sort_order = ?, default_sets = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                localTemplateId, localExId, remote.sort_order, remote.default_sets, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
              localTemplateId, localExId, remote.sort_order, remote.default_sets, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('template_exercises', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'workouts': {
        let query = supabase
          .from('workouts')
          .select('*')
          .eq('user_id', userId);
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull workouts: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('workouts', remote.id);
          const localMgId = reverseMgMap.get(remote.muscle_group_id);
          if (localMgId === undefined) continue;

          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM workouts WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE workouts SET date = ?, muscle_group_id = ?, notes = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                remote.date, localMgId, remote.notes, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO workouts (date, muscle_group_id, notes, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?)',
              remote.date, localMgId, remote.notes, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('workouts', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'sets': {
        // Sets are scoped via workout ownership (RLS)
        let query = supabase
          .from('sets')
          .select('*');
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull sets: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('sets', remote.id);
          const localWorkoutId = getLocalId('workouts', remote.workout_id);
          const localExId = getLocalId('exercises', remote.exercise_id);
          if (localWorkoutId === null || localExId === null) continue;

          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM sets WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE sets SET workout_id = ?, exercise_id = ?, set_number = ?, weight = ?, reps = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                localWorkoutId, localExId, remote.set_number, remote.weight, remote.reps, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              localWorkoutId, localExId, remote.set_number, remote.weight, remote.reps, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('sets', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
      case 'personal_records': {
        let query = supabase
          .from('personal_records')
          .select('*')
          .eq('user_id', userId);
        if (lastSynced) query = query.gt('updated_at', lastSynced);

        const { data, error } = await query;
        if (error) { errors.push(`pull personal_records: ${error.message}`); break; }

        for (const remote of data ?? []) {
          const localId = getLocalId('personal_records', remote.id);
          const localExId = getLocalId('exercises', remote.exercise_id);
          if (localExId === null) continue;

          if (localId) {
            const localRow = db.getFirstSync<{ updated_at: string | null }>(
              'SELECT updated_at FROM personal_records WHERE id = ?', localId
            );
            if (localRow && (!localRow.updated_at || remote.updated_at > localRow.updated_at)) {
              db.runSync(
                'UPDATE personal_records SET exercise_id = ?, pr_type = ?, weight = ?, reps = ?, date = ?, deleted_at = ?, updated_at = ? WHERE id = ?',
                localExId, remote.pr_type, remote.weight, remote.reps, remote.date, remote.deleted_at, remote.updated_at, localId
              );
              count++;
            }
          } else {
            const result = db.runSync(
              'INSERT INTO personal_records (exercise_id, pr_type, weight, reps, date, created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              localExId, remote.pr_type, remote.weight, remote.reps, remote.date, remote.created_at, remote.updated_at, remote.deleted_at
            );
            setIdMapping('personal_records', result.lastInsertRowId, remote.id);
            count++;
          }
        }
        break;
      }
    }
  } catch (e) {
    errors.push(`pull ${table}: ${e instanceof Error ? e.message : String(e)}`);
  }

  return { count, errors };
}
