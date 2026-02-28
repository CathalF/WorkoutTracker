import { StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import DashboardStackNavigator from './DashboardStackNavigator';
import WorkoutStackNavigator from './WorkoutStackNavigator';
import HistoryStackNavigator from './HistoryStackNavigator';
import ProgressScreen from '../screens/ProgressScreen';
import { useThemeControl } from '../theme';

const Tab = createBottomTabNavigator();

export default function AppNavigator() {
  const { colors, isDark } = useThemeControl();

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
        tabBarStyle: {
          position: 'absolute',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.glassBorder,
          elevation: 0,
          backgroundColor: 'transparent',
        },
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={isDark ? 'dark' : 'light'}
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassSurface }]}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardStackNavigator}
        options={{ title: 'Dashboard', headerShown: false }}
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
      <Tab.Screen name="Progress" component={ProgressScreen} options={{ headerShown: false }} />
    </Tab.Navigator>
  );
}
