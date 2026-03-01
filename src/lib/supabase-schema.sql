-- Workout Tracker — Supabase Postgres Schema
-- Run this in your Supabase SQL Editor to set up the cloud database.
-- This mirrors the local SQLite schema with UUID primary keys,
-- user_id ownership, timestamps, and Row Level Security.

-- ============================================================
-- 1. Helper function: auto-update updated_at on row changes
-- ============================================================
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 2. Tables
-- ============================================================

-- Muscle groups (shared reference data — no user_id)
CREATE TABLE muscle_groups (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Exercises (seed exercises are shared; custom exercises belong to a user)
CREATE TABLE exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
  is_custom BOOLEAN NOT NULL DEFAULT FALSE,
  default_rest_seconds INTEGER,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Workouts
CREATE TABLE workouts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  date DATE NOT NULL,
  muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Sets
CREATE TABLE sets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  workout_id UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Programs
CREATE TABLE programs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Workout templates
CREATE TABLE workout_templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  muscle_group_id BIGINT NOT NULL REFERENCES muscle_groups(id),
  split_label TEXT NOT NULL,
  muscle_group_ids JSONB NOT NULL DEFAULT '[]',
  program_id UUID REFERENCES programs(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Template exercises
CREATE TABLE template_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  sort_order INTEGER NOT NULL,
  default_sets INTEGER NOT NULL DEFAULT 3,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Personal records
CREATE TABLE personal_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  exercise_id UUID NOT NULL REFERENCES exercises(id),
  pr_type TEXT NOT NULL,
  weight NUMERIC NOT NULL,
  reps INTEGER NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- User settings (key-value per user)
CREATE TABLE user_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  UNIQUE(user_id, key)
);

-- ============================================================
-- 3. Indexes
-- ============================================================
CREATE INDEX idx_exercises_user_id ON exercises(user_id);
CREATE INDEX idx_exercises_muscle_group_id ON exercises(muscle_group_id);
CREATE INDEX idx_workouts_user_id ON workouts(user_id);
CREATE INDEX idx_workouts_date ON workouts(date);
CREATE INDEX idx_workouts_muscle_group_id ON workouts(muscle_group_id);
CREATE INDEX idx_sets_workout_id ON sets(workout_id);
CREATE INDEX idx_sets_exercise_id ON sets(exercise_id);
CREATE INDEX idx_programs_user_id ON programs(user_id);
CREATE INDEX idx_workout_templates_user_id ON workout_templates(user_id);
CREATE INDEX idx_workout_templates_program_id ON workout_templates(program_id);
CREATE INDEX idx_template_exercises_template_id ON template_exercises(template_id);
CREATE INDEX idx_template_exercises_exercise_id ON template_exercises(exercise_id);
CREATE INDEX idx_personal_records_user_id ON personal_records(user_id);
CREATE INDEX idx_personal_records_exercise_id ON personal_records(exercise_id);
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- ============================================================
-- 4. updated_at triggers
-- ============================================================
CREATE TRIGGER trg_muscle_groups_updated
  BEFORE UPDATE ON muscle_groups
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_exercises_updated
  BEFORE UPDATE ON exercises
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_workouts_updated
  BEFORE UPDATE ON workouts
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_sets_updated
  BEFORE UPDATE ON sets
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_programs_updated
  BEFORE UPDATE ON programs
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_workout_templates_updated
  BEFORE UPDATE ON workout_templates
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_template_exercises_updated
  BEFORE UPDATE ON template_exercises
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_personal_records_updated
  BEFORE UPDATE ON personal_records
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER trg_user_settings_updated
  BEFORE UPDATE ON user_settings
  FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- ============================================================
-- 5. Row Level Security
-- ============================================================

-- Muscle groups: public read (shared reference data)
ALTER TABLE muscle_groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read muscle groups"
  ON muscle_groups FOR SELECT USING (true);

-- Exercises: shared seed + user-owned custom
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read shared or own exercises"
  ON exercises FOR SELECT
  USING (is_custom = FALSE OR user_id = (SELECT auth.uid()));
CREATE POLICY "Insert own custom exercises"
  ON exercises FOR INSERT
  WITH CHECK (is_custom = TRUE AND user_id = (SELECT auth.uid()));
CREATE POLICY "Update own custom exercises"
  ON exercises FOR UPDATE
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY "Delete own custom exercises"
  ON exercises FOR DELETE
  USING (user_id = (SELECT auth.uid()));

-- Workouts
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own workouts"
  ON workouts FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own workouts"
  ON workouts FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own workouts"
  ON workouts FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own workouts"
  ON workouts FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Sets (inherited via workout ownership)
ALTER TABLE sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own sets"
  ON sets FOR SELECT
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users insert own sets"
  ON sets FOR INSERT
  WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users update own sets"
  ON sets FOR UPDATE
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (workout_id IN (SELECT id FROM workouts WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users delete own sets"
  ON sets FOR DELETE
  USING (workout_id IN (SELECT id FROM workouts WHERE user_id = (SELECT auth.uid())));

-- Programs
ALTER TABLE programs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own programs"
  ON programs FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own programs"
  ON programs FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own programs"
  ON programs FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own programs"
  ON programs FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Workout templates
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own templates"
  ON workout_templates FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own templates"
  ON workout_templates FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own templates"
  ON workout_templates FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own templates"
  ON workout_templates FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Template exercises (inherited via template ownership)
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own template exercises"
  ON template_exercises FOR SELECT
  USING (template_id IN (SELECT id FROM workout_templates WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users insert own template exercises"
  ON template_exercises FOR INSERT
  WITH CHECK (template_id IN (SELECT id FROM workout_templates WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users update own template exercises"
  ON template_exercises FOR UPDATE
  USING (template_id IN (SELECT id FROM workout_templates WHERE user_id = (SELECT auth.uid())))
  WITH CHECK (template_id IN (SELECT id FROM workout_templates WHERE user_id = (SELECT auth.uid())));
CREATE POLICY "Users delete own template exercises"
  ON template_exercises FOR DELETE
  USING (template_id IN (SELECT id FROM workout_templates WHERE user_id = (SELECT auth.uid())));

-- Personal records
ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own PRs"
  ON personal_records FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own PRs"
  ON personal_records FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own PRs"
  ON personal_records FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own PRs"
  ON personal_records FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- User settings
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own settings"
  ON user_settings FOR SELECT USING ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users insert own settings"
  ON user_settings FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users update own settings"
  ON user_settings FOR UPDATE
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);
CREATE POLICY "Users delete own settings"
  ON user_settings FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- ============================================================
-- 6. Seed data
-- ============================================================
INSERT INTO muscle_groups (name) VALUES
  ('Chest'), ('Back'), ('Shoulders'), ('Biceps'), ('Triceps'),
  ('Legs'), ('Core'), ('Full Body')
ON CONFLICT (name) DO NOTHING;

-- Seed exercises (shared — no user_id)
INSERT INTO exercises (name, muscle_group_id, is_custom) VALUES
  ('Bench Press', 1, FALSE),
  ('Incline Dumbbell Press', 1, FALSE),
  ('Cable Flye', 1, FALSE),
  ('Push-Up', 1, FALSE),
  ('Deadlift', 2, FALSE),
  ('Barbell Row', 2, FALSE),
  ('Pull-Up', 2, FALSE),
  ('Lat Pulldown', 2, FALSE),
  ('Seated Cable Row', 2, FALSE),
  ('Overhead Press', 3, FALSE),
  ('Lateral Raise', 3, FALSE),
  ('Face Pull', 3, FALSE),
  ('Barbell Curl', 4, FALSE),
  ('Dumbbell Curl', 4, FALSE),
  ('Hammer Curl', 4, FALSE),
  ('Tricep Pushdown', 5, FALSE),
  ('Overhead Tricep Extension', 5, FALSE),
  ('Close-Grip Bench Press', 5, FALSE),
  ('Squat', 6, FALSE),
  ('Leg Press', 6, FALSE),
  ('Romanian Deadlift', 6, FALSE),
  ('Leg Curl', 6, FALSE),
  ('Leg Extension', 6, FALSE),
  ('Calf Raise', 6, FALSE),
  ('Plank', 7, FALSE),
  ('Cable Crunch', 7, FALSE),
  ('Hanging Leg Raise', 7, FALSE),
  ('Burpee', 8, FALSE),
  ('Clean and Press', 8, FALSE);
