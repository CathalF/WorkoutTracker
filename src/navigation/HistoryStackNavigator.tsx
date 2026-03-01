import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HistoryScreen from '../screens/HistoryScreen';
import WorkoutDetailScreen from '../screens/WorkoutDetailScreen';
import ExercisePickerScreen from '../screens/ExercisePickerScreen';

export type HistoryStackParamList = {
  HistoryList: undefined;
  WorkoutDetail: { workoutId: number };
  ExercisePicker: { workoutId: number; muscleGroupIds: number[]; alreadyAddedIds: number[] };
};

const Stack = createNativeStackNavigator<HistoryStackParamList>();

export default function HistoryStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="HistoryList" component={HistoryScreen} />
      <Stack.Screen name="WorkoutDetail" component={WorkoutDetailScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} />
    </Stack.Navigator>
  );
}
