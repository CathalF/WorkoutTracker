// Shared module for passing selected exercise from ExercisePicker back to ActiveWorkout.
// ExercisePicker sets the pending selection, then calls navigation.goBack().
// ActiveWorkout reads it via useFocusEffect on regaining focus.

let pendingExercise: { id: number; name: string } | null = null;

export function setPendingExercise(exercise: { id: number; name: string }) {
  pendingExercise = exercise;
}

export function consumePendingExercise(): { id: number; name: string } | null {
  const exercise = pendingExercise;
  pendingExercise = null;
  return exercise;
}
