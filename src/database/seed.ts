import { type SQLiteDatabase } from 'expo-sqlite';

const SEED_DATA: Record<string, string[]> = {
  Legs: [
    'Squat',
    'Leg Press',
    'Romanian Deadlift',
    'Leg Extension',
    'Leg Curl',
    'Bulgarian Split Squat',
    'Calf Raise',
    'Lunges',
  ],
  Chest: [
    'Bench Press',
    'Incline Bench Press',
    'Dumbbell Fly',
    'Cable Crossover',
    'Push-Up',
    'Decline Bench Press',
    'Chest Dip',
  ],
  Back: [
    'Deadlift',
    'Barbell Row',
    'Pull-Up',
    'Lat Pulldown',
    'Seated Cable Row',
    'T-Bar Row',
    'Face Pull',
  ],
  Shoulders: [
    'Overhead Press',
    'Lateral Raise',
    'Front Raise',
    'Rear Delt Fly',
    'Arnold Press',
    'Upright Row',
  ],
  Biceps: [
    'Barbell Curl',
    'Dumbbell Curl',
    'Hammer Curl',
    'Preacher Curl',
    'Concentration Curl',
    'Cable Curl',
  ],
  Triceps: [
    'Tricep Pushdown',
    'Overhead Tricep Extension',
    'Skull Crusher',
    'Close-Grip Bench Press',
    'Tricep Dip',
    'Kickback',
  ],
  Core: [
    'Plank',
    'Crunch',
    'Hanging Leg Raise',
    'Russian Twist',
    'Cable Woodchop',
    'Ab Wheel Rollout',
  ],
};

export function seedDatabase(db: SQLiteDatabase): void {
  const existing = db.getAllSync<{ count: number }>(
    'SELECT COUNT(*) as count FROM muscle_groups'
  );

  if (existing[0].count > 0) {
    return;
  }

  db.execSync('BEGIN TRANSACTION');
  try {
    for (const [muscleGroup, exercises] of Object.entries(SEED_DATA)) {
      const result = db.runSync(
        'INSERT INTO muscle_groups (name) VALUES (?)',
        muscleGroup
      );
      const groupId = result.lastInsertRowId;

      for (const exercise of exercises) {
        db.runSync(
          'INSERT INTO exercises (name, muscle_group_id, is_custom) VALUES (?, ?, 0)',
          exercise,
          groupId
        );
      }
    }
    db.execSync('COMMIT');
  } catch (e) {
    db.execSync('ROLLBACK');
    throw e;
  }
}
