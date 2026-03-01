import type { Action } from 'expo-quick-actions';
import { navigationRef } from '../../App';
import { getTemplateWithExercises } from '../database/services';

export function handleQuickAction(action: Action) {
  if (!navigationRef.isReady()) return;

  if (action.id === 'start-workout') {
    navigationRef.navigate('Log Workout', { screen: 'StartWorkout' });
    return;
  }

  // Template-based launch
  const templateId = action.params?.templateId;
  if (!templateId) return;

  const template = getTemplateWithExercises(Number(templateId));
  if (!template) {
    // Template was deleted -- fall back to StartWorkout
    navigationRef.navigate('Log Workout', { screen: 'StartWorkout' });
    return;
  }

  navigationRef.navigate('Log Workout', {
    screen: 'ActiveWorkout',
    params: {
      workoutId: -1,
      muscleGroupId: template.muscle_group_id,
      splitLabel: template.split_label,
      muscleGroupIds: template.muscle_group_ids,
      fromTemplate: {
        templateId: template.id,
        exercises: template.exercises.map((e) => ({
          exerciseId: e.exercise_id,
          exerciseName: e.exercise_name,
          defaultSets: e.default_sets,
        })),
      },
    },
  });
}
