import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  View,
} from 'react-native';
import {
  createNavigationContainerRef,
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import AppNavigator from './src/navigation/AppNavigator';
import { initializeDatabase } from './src/database';
import { getSetting, setSetting } from './src/database/services';
import { ThemeProvider, useTheme } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import OnboardingScreen from './src/screens/OnboardingScreen';
import { setupNotificationChannels, syncNotificationSchedules } from './src/utils/notifications';
import { refreshQuickActions } from './src/utils/quickActions';
import { handleQuickAction } from './src/utils/quickActionHandler';
import { updateWidget } from './src/utils/widgetBridge';

// Safe import — expo-quick-actions native module may not be available in Expo Go
let QuickActions: any = { useQuickActionCallback: (_cb: any) => {}, initial: null };
try {
  const mod = require('expo-quick-actions');
  // Only use the real module if the native hook is available (requires dev build)
  if (typeof mod.useQuickActionCallback === 'function') {
    QuickActions = mod;
  }
} catch {}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

setupNotificationChannels();

export type RootTabParamList = {
  Dashboard: undefined;
  'Log Workout': { screen?: string; params?: Record<string, unknown> };
  History: undefined;
  Progress: undefined;
};

export const navigationRef = createNavigationContainerRef<RootTabParamList>();

function AppContent() {
  const colors = useTheme();
  const scheme = useColorScheme();

  const navigationTheme = {
    ...(scheme === 'dark' ? DarkTheme : DefaultTheme),
    colors: {
      ...(scheme === 'dark' ? DarkTheme.colors : DefaultTheme.colors),
      primary: colors.primary,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.primary,
    },
  };

  // Handle quick actions when app is already running (warm start)
  QuickActions.useQuickActionCallback((action: any) => {
    handleQuickAction(action);
  });

  // Handle quick action that launched the app (cold start)
  useEffect(() => {
    if (QuickActions.initial) {
      const timer = setTimeout(() => handleQuickAction(QuickActions.initial!), 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const linking = {
    prefixes: ['workouttracker://'],
    config: {
      screens: {
        'Log Workout': {
          path: 'workout',
          screens: {
            StartWorkout: '',
          },
        },
      },
    },
  };

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navigationTheme}>
      <AppNavigator />
      <StatusBar style={colors.statusBar === 'dark' ? 'dark' : 'light'} />
    </NavigationContainer>
  );
}

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(false);
  const [onboardingDone, setOnboardingDone] = useState(false);

  const attemptInit = () => {
    setInitError(false);
    try {
      initializeDatabase();

      const done = getSetting('onboarding_completed', 'false');
      setOnboardingDone(done === 'true');

      setIsReady(true);
      requestNotificationPermissions();
      syncNotificationSchedules();
      refreshQuickActions();
      updateWidget();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setInitError(true);
    }
  };

  const handleOnboardingComplete = (initialRoute?: string) => {
    setSetting('onboarding_completed', 'true');
    setOnboardingDone(true);
    if (initialRoute) {
      setTimeout(() => {
        navigationRef.current?.navigate(initialRoute as never);
      }, 100);
    }
  };

  async function requestNotificationPermissions() {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') {
      await Notifications.requestPermissionsAsync();
    }
  }

  useEffect(() => {
    attemptInit();
  }, []);

  const bg = isDark ? '#000000' : '#F2F2F7';
  const accent = isDark ? '#0A84FF' : '#007AFF';

  if (initError) {
    return (
      <View style={[styles.loading, { backgroundColor: bg }]}>
        <Ionicons name="cloud-offline-outline" size={64} color="#FF3B30" />
        <Text style={[styles.errorTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>Database Error</Text>
        <Text style={styles.errorSubtitle}>
          Failed to initialize the database. Please restart the app.
        </Text>
        <Pressable style={[styles.retryButton, { backgroundColor: accent }]} onPress={attemptInit}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={[styles.loading, { backgroundColor: bg }]}>
        <ActivityIndicator size="large" color={accent} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        {onboardingDone ? <AppContent /> : <OnboardingScreen onComplete={handleOnboardingComplete} />}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 16,
  },
  errorSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});
