export interface MuscleGroup {
  id: number;
  name: string;
}

export interface Exercise {
  id: number;
  name: string;
  muscle_group_id: number;
  is_custom: number;
}

export interface ExerciseWithMuscleGroup extends Exercise {
  muscle_group_name: string;
}

export interface Workout {
  id: number;
  date: string;
  muscle_group_id: number;
  notes: string | null;
  created_at: string;
}

export interface WorkoutSet {
  id: number;
  workout_id: number;
  exercise_id: number;
  set_number: number;
  weight: number;
  reps: number;
}

export interface ExerciseWithSets {
  exercise_id: number;
  exercise_name: string;
  sets: WorkoutSet[];
}

export interface WorkoutDetail extends Workout {
  muscle_group_name: string;
  exercises: ExerciseWithSets[];
}

export interface WorkoutSummary {
  id: number;
  date: string;
  muscle_group_name: string;
  exercise_count: number;
  set_count: number;
  total_volume: number;
  created_at: string;
}
