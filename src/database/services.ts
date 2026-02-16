import { getDatabase } from './database';
import {
  MuscleGroup,
  Exercise,
  ExerciseWithMuscleGroup,
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
