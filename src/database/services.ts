import { getDatabase } from './database';
import {
  MuscleGroup,
  Exercise,
  ExerciseWithMuscleGroup,
  WorkoutSet,
  WorkoutDetail,
  WorkoutSummary,
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
