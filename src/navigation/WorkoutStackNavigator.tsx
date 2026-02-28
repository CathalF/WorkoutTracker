import { createNativeStackNavigator } from '@react-navigation/native-stack';
import StartWorkoutScreen from '../screens/StartWorkoutScreen';
import ActiveWorkoutScreen from '../screens/ActiveWorkoutScreen';
import ExercisePickerScreen from '../screens/ExercisePickerScreen';
import TemplateManagementScreen from '../screens/TemplateManagementScreen';

export type WorkoutStackParamList = {
  StartWorkout: undefined;
  ActiveWorkout: {
    workoutId: number;
    muscleGroupId: number;
    splitLabel: string;
    muscleGroupIds: number[];
    selectedExercise?: { id: number; name: string };
    fromTemplate?: {
      templateId: number;
      exercises: { exerciseId: number; exerciseName: string; defaultSets: number }[];
    };
  };
  ExercisePicker: {
    workoutId: number;
    muscleGroupIds: number[];
    alreadyAddedIds: number[];
  };
  TemplateManagement: undefined;
};

const Stack = createNativeStackNavigator<WorkoutStackParamList>();

export default function WorkoutStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="StartWorkout" component={StartWorkoutScreen} />
      <Stack.Screen name="ActiveWorkout" component={ActiveWorkoutScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
      <Stack.Screen name="TemplateManagement" component={TemplateManagementScreen} />
    </Stack.Navigator>
  );
}
