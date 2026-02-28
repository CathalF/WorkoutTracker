// Shared module for passing selected exercise from ExercisePicker back to ActiveWorkout.
// ExercisePicker sets the pending selection, then calls navigation.goBack().
// ActiveWorkout reads it via useFocusEffect on regaining focus.

let pendingExercise: { id: number; name: string } | null = null;
let pendingTimestamp: number = 0;
const TTL_MS = 30_000;

export function setPendingExercise(exercise: { id: number; name: string }) {
  pendingExercise = exercise;
  pendingTimestamp = Date.now();
}

export function consumePendingExercise(): { id: number; name: string } | null {
  if (pendingExercise && (Date.now() - pendingTimestamp) < TTL_MS) {
    const ex = pendingExercise;
    pendingExercise = null;
    return ex;
  }
  pendingExercise = null;
  return null;
}
