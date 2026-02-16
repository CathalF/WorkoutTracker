import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import ExerciseLibraryScreen from '../screens/ExerciseLibraryScreen';
import WorkoutStackNavigator from './WorkoutStackNavigator';
import HistoryStackNavigator from './HistoryStackNavigator';
import ProgressScreen from '../screens/ProgressScreen';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Exercises':
              iconName = focused ? 'barbell' : 'barbell-outline';
              break;
            case 'Log Workout':
              iconName = focused ? 'add-circle' : 'add-circle-outline';
              break;
            case 'History':
              iconName = focused ? 'time' : 'time-outline';
              break;
            case 'Progress':
              iconName = focused ? 'trending-up' : 'trending-up-outline';
              break;
            default:
              iconName = 'ellipse';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: 'gray',
      })}
    >
      <Tab.Screen
        name="Exercises"
        component={ExerciseLibraryScreen}
        options={{ title: 'Exercise Library' }}
      />
      <Tab.Screen
        name="Log Workout"
        component={WorkoutStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen
        name="History"
        component={HistoryStackNavigator}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Progress" component={ProgressScreen} />
    </Tab.Navigator>
  );
}
