import { openDatabaseSync, type SQLiteDatabase } from 'expo-sqlite';

const DATABASE_NAME = 'workout-tracker.db';

let db: SQLiteDatabase | null = null;

export function getDatabase(): SQLiteDatabase {
  if (!db) {
    db = openDatabaseSync(DATABASE_NAME);
    initializeSchema(db);
  }
  return db;
}

function initializeSchema(database: SQLiteDatabase): void {
  database.execSync(`PRAGMA journal_mode = WAL;`);
  database.execSync(`PRAGMA foreign_keys = ON;`);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS muscle_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      is_custom INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS workouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS sets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workout_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      set_number INTEGER NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      FOREIGN KEY (workout_id) REFERENCES workouts(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS programs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS workout_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      muscle_group_id INTEGER NOT NULL,
      split_label TEXT NOT NULL,
      muscle_group_ids TEXT NOT NULL,
      program_id INTEGER,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (muscle_group_id) REFERENCES muscle_groups(id),
      FOREIGN KEY (program_id) REFERENCES programs(id) ON DELETE SET NULL
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS template_exercises (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER NOT NULL,
      exercise_id INTEGER NOT NULL,
      sort_order INTEGER NOT NULL,
      default_sets INTEGER NOT NULL DEFAULT 3,
      FOREIGN KEY (template_id) REFERENCES workout_templates(id) ON DELETE CASCADE,
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS personal_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      exercise_id INTEGER NOT NULL,
      pr_type TEXT NOT NULL,
      weight REAL NOT NULL,
      reps INTEGER NOT NULL,
      date TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (exercise_id) REFERENCES exercises(id)
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  // Indexes for query performance
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_sets_workout_id ON sets(workout_id);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_sets_exercise_id ON sets(exercise_id);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_workouts_date ON workouts(date);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_workouts_muscle_group_id ON workouts(muscle_group_id);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_personal_records_exercise_id ON personal_records(exercise_id);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_personal_records_created_at ON personal_records(created_at);`);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_template_exercises_template_id ON template_exercises(template_id);`);

  // Migration: add rest time column to exercises
  try {
    database.execSync(`ALTER TABLE exercises ADD COLUMN default_rest_seconds INTEGER`);
  } catch {
    // Column already exists — ignore
  }

  // ── Sync metadata migrations ──

  // exercises: updated_at, deleted_at
  try {
    database.execSync(`ALTER TABLE exercises ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE exercises ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // workouts: updated_at, deleted_at
  try {
    database.execSync(`ALTER TABLE workouts ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE workouts ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // sets: updated_at, deleted_at, created_at
  try {
    database.execSync(`ALTER TABLE sets ADD COLUMN created_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE sets ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE sets ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // programs: updated_at, deleted_at
  try {
    database.execSync(`ALTER TABLE programs ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE programs ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // workout_templates: updated_at, deleted_at
  try {
    database.execSync(`ALTER TABLE workout_templates ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE workout_templates ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // template_exercises: updated_at, deleted_at, created_at
  try {
    database.execSync(`ALTER TABLE template_exercises ADD COLUMN created_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE template_exercises ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE template_exercises ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // personal_records: updated_at, deleted_at
  try {
    database.execSync(`ALTER TABLE personal_records ADD COLUMN updated_at TEXT`);
  } catch {
    // Column already exists — ignore
  }
  try {
    database.execSync(`ALTER TABLE personal_records ADD COLUMN deleted_at TEXT`);
  } catch {
    // Column already exists — ignore
  }

  // ── Sync tables ──

  database.execSync(`
    CREATE TABLE IF NOT EXISTS sync_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  database.execSync(`
    CREATE TABLE IF NOT EXISTS sync_id_map (
      table_name TEXT NOT NULL,
      local_id INTEGER NOT NULL,
      remote_id TEXT NOT NULL,
      PRIMARY KEY (table_name, local_id)
    );
  `);
  database.execSync(`CREATE INDEX IF NOT EXISTS idx_sync_id_map_remote ON sync_id_map(table_name, remote_id);`);

  // ── Backfill updated_at for existing rows ──

  database.execSync(`UPDATE exercises SET updated_at = datetime('now') WHERE updated_at IS NULL`);
  database.execSync(`UPDATE workouts SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
  database.execSync(`UPDATE sets SET created_at = datetime('now') WHERE created_at IS NULL`);
  database.execSync(`UPDATE sets SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
  database.execSync(`UPDATE programs SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
  database.execSync(`UPDATE workout_templates SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
  database.execSync(`UPDATE template_exercises SET created_at = datetime('now') WHERE created_at IS NULL`);
  database.execSync(`UPDATE template_exercises SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
  database.execSync(`UPDATE personal_records SET updated_at = COALESCE(created_at, datetime('now')) WHERE updated_at IS NULL`);
}
