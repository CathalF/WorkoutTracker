import { getDatabase } from './database';
import {
  MuscleGroup,
  Exercise,
  ExerciseWithMuscleGroup,
  WorkoutSet,
  WorkoutDetail,
  WorkoutSummary,
  LoggedExercise,
  ExerciseProgressPoint,
  ExerciseVolumePoint,
  PersonalRecord,
  VolumeRecord,
  Program,
  WorkoutTemplate,
  TemplateExercise,
  TemplateWithExercises,
  LastPerformanceSet,
} from '../types';

export function getAllMuscleGroups(): MuscleGroup[] {
  const db = getDatabase();
  return db.getAllSync<MuscleGroup>('SELECT id, name FROM muscle_groups ORDER BY name');
}

export function getExercisesByMuscleGroup(muscleGroupId: number): Exercise[] {
  const db = getDatabase();
  return db.getAllSync<Exercise>(
    'SELECT id, name, muscle_group_id, is_custom FROM exercises WHERE muscle_group_id = ? ORDER BY name',
    muscleGroupId
  );
}

export function getAllExercises(): ExerciseWithMuscleGroup[] {
  const db = getDatabase();
  return db.getAllSync<ExerciseWithMuscleGroup>(
    `SELECT e.id, e.name, e.muscle_group_id, e.is_custom, mg.name AS muscle_group_name
     FROM exercises e
     JOIN muscle_groups mg ON e.muscle_group_id = mg.id
     ORDER BY mg.name, e.name`
  );
}

export function searchExercises(query: string): ExerciseWithMuscleGroup[] {
  const db = getDatabase();
  const pattern = `%${query}%`;
  return db.getAllSync<ExerciseWithMuscleGroup>(
    `SELECT e.id, e.name, e.muscle_group_id, e.is_custom, mg.name AS muscle_group_name
     FROM exercises e
     JOIN muscle_groups mg ON e.muscle_group_id = mg.id
     WHERE e.name LIKE ? COLLATE NOCASE
     ORDER BY mg.name, e.name`,
    pattern
  );
}

export function addCustomExercise(name: string, muscleGroupId: number): number {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO exercises (name, muscle_group_id, is_custom) VALUES (?, ?, 1)',
    name,
    muscleGroupId
  );
  return result.lastInsertRowId;
}

export function deleteCustomExercise(exerciseId: number): void {
  const db = getDatabase();
  db.runSync(
    'DELETE FROM exercises WHERE id = ? AND is_custom = 1',
    exerciseId
  );
}

export function getExerciseMuscleGroupId(exerciseId: number): number | null {
  const db = getDatabase();
  const row = db.getFirstSync<{ muscle_group_id: number }>(
    'SELECT muscle_group_id FROM exercises WHERE id = ?',
    exerciseId
  );
  return row?.muscle_group_id ?? null;
}

export function createWorkout(date: string, muscleGroupId: number, notes?: string): number {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO workouts (date, muscle_group_id, notes) VALUES (?, ?, ?)',
    date,
    muscleGroupId,
    notes ?? null
  );
  return result.lastInsertRowId;
}

export function addSet(
  workoutId: number,
  exerciseId: number,
  setNumber: number,
  weight: number,
  reps: number
): number {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO sets (workout_id, exercise_id, set_number, weight, reps) VALUES (?, ?, ?, ?, ?)',
    workoutId,
    exerciseId,
    setNumber,
    weight,
    reps
  );
  return result.lastInsertRowId;
}

export function getWorkoutWithSets(workoutId: number): WorkoutDetail | null {
  const db = getDatabase();

  const workout = db.getFirstSync<{
    id: number;
    date: string;
    muscle_group_id: number;
    notes: string | null;
    created_at: string;
    muscle_group_name: string;
  }>(
    `SELECT w.*, mg.name AS muscle_group_name
     FROM workouts w
     JOIN muscle_groups mg ON w.muscle_group_id = mg.id
     WHERE w.id = ?`,
    workoutId
  );

  if (!workout) return null;

  const sets = db.getAllSync<WorkoutSet & { exercise_name: string }>(
    `SELECT s.*, e.name AS exercise_name
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     WHERE s.workout_id = ?
     ORDER BY e.name, s.set_number`,
    workoutId
  );

  const exerciseMap = new Map<number, { exercise_name: string; sets: WorkoutSet[] }>();
  for (const set of sets) {
    if (!exerciseMap.has(set.exercise_id)) {
      exerciseMap.set(set.exercise_id, { exercise_name: set.exercise_name, sets: [] });
    }
    exerciseMap.get(set.exercise_id)!.sets.push({
      id: set.id,
      workout_id: set.workout_id,
      exercise_id: set.exercise_id,
      set_number: set.set_number,
      weight: set.weight,
      reps: set.reps,
    });
  }

  return {
    ...workout,
    exercises: Array.from(exerciseMap.entries()).map(([exerciseId, data]) => ({
      exercise_id: exerciseId,
      exercise_name: data.exercise_name,
      sets: data.sets,
    })),
  };
}

export function deleteWorkout(workoutId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM workouts WHERE id = ?', workoutId);
}

export function getWorkouts(muscleGroupId?: number): WorkoutSummary[] {
  const db = getDatabase();
  const baseQuery = `
    SELECT
      w.id,
      w.date,
      mg.name AS muscle_group_name,
      (SELECT COUNT(DISTINCT s.exercise_id) FROM sets s WHERE s.workout_id = w.id) AS exercise_count,
      (SELECT COUNT(*) FROM sets s WHERE s.workout_id = w.id) AS set_count,
      (SELECT COALESCE(SUM(s.weight * s.reps), 0) FROM sets s WHERE s.workout_id = w.id) AS total_volume,
      w.created_at
    FROM workouts w
    JOIN muscle_groups mg ON w.muscle_group_id = mg.id
  `;

  if (muscleGroupId !== undefined) {
    return db.getAllSync<WorkoutSummary>(
      baseQuery + ' WHERE w.muscle_group_id = ? ORDER BY w.date DESC, w.created_at DESC',
      muscleGroupId
    );
  }

  return db.getAllSync<WorkoutSummary>(
    baseQuery + ' ORDER BY w.date DESC, w.created_at DESC'
  );
}

export function updateSet(setId: number, weight: number, reps: number): void {
  const db = getDatabase();
  db.runSync(
    'UPDATE sets SET weight = ?, reps = ? WHERE id = ?',
    weight,
    reps,
    setId
  );
}

export function deleteSet(setId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM sets WHERE id = ?', setId);
}

export function getLoggedExercises(): LoggedExercise[] {
  const db = getDatabase();
  return db.getAllSync<LoggedExercise>(
    `SELECT DISTINCT e.id, e.name, mg.name AS muscle_group_name
     FROM sets s
     JOIN exercises e ON s.exercise_id = e.id
     JOIN muscle_groups mg ON e.muscle_group_id = mg.id
     ORDER BY e.name`
  );
}

export function getExerciseProgress(exerciseId: number, dateFrom?: string): ExerciseProgressPoint[] {
  const db = getDatabase();
  if (dateFrom) {
    return db.getAllSync<ExerciseProgressPoint>(
      `SELECT w.date, MAX(s.weight) AS max_weight
       FROM sets s
       JOIN workouts w ON s.workout_id = w.id
       WHERE s.exercise_id = ? AND w.date >= ?
       GROUP BY w.id
       ORDER BY w.date ASC`,
      exerciseId,
      dateFrom
    );
  }
  return db.getAllSync<ExerciseProgressPoint>(
    `SELECT w.date, MAX(s.weight) AS max_weight
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
     GROUP BY w.id
     ORDER BY w.date ASC`,
    exerciseId
  );
}

export function getExerciseVolume(exerciseId: number, dateFrom?: string): ExerciseVolumePoint[] {
  const db = getDatabase();
  if (dateFrom) {
    return db.getAllSync<ExerciseVolumePoint>(
      `SELECT w.date, SUM(s.weight * s.reps) AS total_volume
       FROM sets s
       JOIN workouts w ON s.workout_id = w.id
       WHERE s.exercise_id = ? AND w.date >= ?
       GROUP BY w.id
       ORDER BY w.date ASC`,
      exerciseId,
      dateFrom
    );
  }
  return db.getAllSync<ExerciseVolumePoint>(
    `SELECT w.date, SUM(s.weight * s.reps) AS total_volume
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
     GROUP BY w.id
     ORDER BY w.date ASC`,
    exerciseId
  );
}

export function getPersonalRecords(exerciseId: number): { maxWeight: PersonalRecord | null; maxVolume: VolumeRecord | null } {
  const db = getDatabase();

  const maxWeight = db.getFirstSync<PersonalRecord>(
    `SELECT s.weight, s.reps, w.date
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
     ORDER BY s.weight DESC
     LIMIT 1`,
    exerciseId
  ) ?? null;

  const maxVolume = db.getFirstSync<VolumeRecord>(
    `SELECT w.date, SUM(s.weight * s.reps) AS total_volume
     FROM sets s
     JOIN workouts w ON s.workout_id = w.id
     WHERE s.exercise_id = ?
     GROUP BY w.id
     ORDER BY total_volume DESC
     LIMIT 1`,
    exerciseId
  ) ?? null;

  return { maxWeight, maxVolume };
}

// --- Programs ---

export function createProgram(name: string): number {
  const db = getDatabase();
  const result = db.runSync('INSERT INTO programs (name) VALUES (?)', name);
  return result.lastInsertRowId;
}

export function getAllPrograms(): Program[] {
  const db = getDatabase();
  return db.getAllSync<Program>('SELECT id, name, created_at FROM programs ORDER BY name');
}

export function renameProgram(programId: number, name: string): void {
  const db = getDatabase();
  db.runSync('UPDATE programs SET name = ? WHERE id = ?', name, programId);
}

export function deleteProgram(programId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM programs WHERE id = ?', programId);
}

// --- Templates ---

export function createTemplate(
  name: string,
  muscleGroupId: number,
  splitLabel: string,
  muscleGroupIds: number[],
  exercises: { exerciseId: number; defaultSets: number }[],
  programId?: number
): number {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO workout_templates (name, muscle_group_id, split_label, muscle_group_ids, program_id) VALUES (?, ?, ?, ?, ?)',
    name,
    muscleGroupId,
    splitLabel,
    JSON.stringify(muscleGroupIds),
    programId ?? null
  );
  const templateId = result.lastInsertRowId;

  for (let i = 0; i < exercises.length; i++) {
    db.runSync(
      'INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets) VALUES (?, ?, ?, ?)',
      templateId,
      exercises[i].exerciseId,
      i,
      exercises[i].defaultSets
    );
  }

  return templateId;
}

export function getAllTemplates(): WorkoutTemplate[] {
  const db = getDatabase();
  const rows = db.getAllSync<Omit<WorkoutTemplate, 'muscle_group_ids'> & { muscle_group_ids: string }>(
    'SELECT id, name, muscle_group_id, split_label, muscle_group_ids, program_id, sort_order, created_at FROM workout_templates ORDER BY sort_order, created_at'
  );
  return rows.map((row) => ({
    ...row,
    muscle_group_ids: JSON.parse(row.muscle_group_ids) as number[],
  }));
}

export function getTemplateWithExercises(templateId: number): TemplateWithExercises | null {
  const db = getDatabase();
  const row = db.getFirstSync<Omit<WorkoutTemplate, 'muscle_group_ids'> & { muscle_group_ids: string }>(
    'SELECT id, name, muscle_group_id, split_label, muscle_group_ids, program_id, sort_order, created_at FROM workout_templates WHERE id = ?',
    templateId
  );
  if (!row) return null;

  const exercises = db.getAllSync<TemplateExercise>(
    `SELECT te.id, te.template_id, te.exercise_id, e.name AS exercise_name, te.sort_order, te.default_sets
     FROM template_exercises te
     JOIN exercises e ON te.exercise_id = e.id
     WHERE te.template_id = ?
     ORDER BY te.sort_order`,
    templateId
  );

  return {
    ...row,
    muscle_group_ids: JSON.parse(row.muscle_group_ids) as number[],
    exercises,
  };
}

export function renameTemplate(templateId: number, name: string): void {
  const db = getDatabase();
  db.runSync('UPDATE workout_templates SET name = ? WHERE id = ?', name, templateId);
}

export function deleteTemplate(templateId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM workout_templates WHERE id = ?', templateId);
}

export function assignTemplateToProgram(templateId: number, programId: number | null): void {
  const db = getDatabase();
  db.runSync('UPDATE workout_templates SET program_id = ? WHERE id = ?', programId, templateId);
}

export function updateTemplateSortOrder(templateId: number, sortOrder: number): void {
  const db = getDatabase();
  db.runSync('UPDATE workout_templates SET sort_order = ? WHERE id = ?', sortOrder, templateId);
}

// --- Template exercises ---

export function addTemplateExercise(
  templateId: number,
  exerciseId: number,
  sortOrder: number,
  defaultSets: number
): number {
  const db = getDatabase();
  const result = db.runSync(
    'INSERT INTO template_exercises (template_id, exercise_id, sort_order, default_sets) VALUES (?, ?, ?, ?)',
    templateId,
    exerciseId,
    sortOrder,
    defaultSets
  );
  return result.lastInsertRowId;
}

export function removeTemplateExercise(templateExerciseId: number): void {
  const db = getDatabase();
  db.runSync('DELETE FROM template_exercises WHERE id = ?', templateExerciseId);
}

export function updateTemplateExerciseDefaultSets(templateExerciseId: number, defaultSets: number): void {
  const db = getDatabase();
  db.runSync('UPDATE template_exercises SET default_sets = ? WHERE id = ?', defaultSets, templateExerciseId);
}

// --- Previous performance ---

export function getLastPerformance(exerciseId: number): LastPerformanceSet[] {
  const db = getDatabase();
  return db.getAllSync<LastPerformanceSet>(
    `SELECT s.set_number, s.weight, s.reps
     FROM sets s
     WHERE s.exercise_id = ? AND s.workout_id = (
       SELECT s2.workout_id FROM sets s2
       JOIN workouts w ON s2.workout_id = w.id
       WHERE s2.exercise_id = ?
       ORDER BY w.date DESC, w.created_at DESC
       LIMIT 1
     )
     ORDER BY s.set_number`,
    exerciseId,
    exerciseId
  );
}
