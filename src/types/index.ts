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

export interface ExerciseProgressPoint {
  date: string;
  max_weight: number;
}

export interface ExerciseVolumePoint {
  date: string;
  total_volume: number;
}

export interface PersonalRecord {
  weight: number;
  reps: number;
  date: string;
}

export interface VolumeRecord {
  date: string;
  total_volume: number;
}

export interface LoggedExercise {
  id: number;
  name: string;
  muscle_group_name: string;
}

export interface Program {
  id: number;
  name: string;
  created_at: string;
}

export interface WorkoutTemplate {
  id: number;
  name: string;
  muscle_group_id: number;
  split_label: string;
  muscle_group_ids: number[];
  program_id: number | null;
  sort_order: number;
  created_at: string;
}

export interface TemplateExercise {
  id: number;
  template_id: number;
  exercise_id: number;
  exercise_name: string;
  sort_order: number;
  default_sets: number;
}

export interface TemplateWithExercises extends WorkoutTemplate {
  exercises: TemplateExercise[];
}

export interface LastPerformanceSet {
  set_number: number;
  weight: number;
  reps: number;
}

export interface DetectedPR {
  exerciseId: number;
  exerciseName: string;
  prType: 'weight' | 'reps';
  weight: number;
  reps: number;
  date: string;
}

export interface RecentPR {
  id: number;
  exercise_name: string;
  pr_type: string;
  weight: number;
  reps: number;
  date: string;
}

export interface MonthlyStats {
  workoutCount: number;
  totalVolume: number;
}

export interface UserProfile {
  id: string;           // UUID — same as auth.users.id
  display_name: string;
  bio: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreferences {
  remindersEnabled: boolean;
  reminderDays: number[];   // expo weekday numbers: 1=Sun, 2=Mon, ..., 7=Sat
  reminderHour: number;     // 0-23
  reminderMinute: number;   // 0-59
  nudgeEnabled: boolean;
  nudgeDays: number;        // days of inactivity before nudge (2-7)
  restDayEnabled: boolean;
  restDayThreshold: number; // consecutive training days before suggesting rest (2-5)
}
