import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import DashboardScreen from '../screens/DashboardScreen';
import WorkoutStackNavigator from './WorkoutStackNavigator';
import HistoryStackNavigator from './HistoryStackNavigator';
import ProgressScreen from '../screens/ProgressScreen';
import { useTheme } from '../theme';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const colors = useTheme();

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
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
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Dashboard' }}
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
