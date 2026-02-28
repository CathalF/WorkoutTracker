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
import { ThemeProvider, useTheme } from './src/theme';
import ErrorBoundary from './src/components/ErrorBoundary';
import { setupNotificationChannels, syncNotificationSchedules } from './src/utils/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

setupNotificationChannels();

export const navigationRef = createNavigationContainerRef();

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
  const [isReady, setIsReady] = useState(false);
  const [initError, setInitError] = useState(false);

  const attemptInit = () => {
    setInitError(false);
    try {
      initializeDatabase();
      setIsReady(true);
      requestNotificationPermissions();
      syncNotificationSchedules();
    } catch (error) {
      console.error('Failed to initialize database:', error);
      setInitError(true);
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

  if (initError) {
    return (
      <View style={styles.loading}>
        <Ionicons name="cloud-offline-outline" size={64} color="#FF3B30" />
        <Text style={styles.errorTitle}>Database Error</Text>
        <Text style={styles.errorSubtitle}>
          Failed to initialize the database. Please restart the app.
        </Text>
        <Pressable style={styles.retryButton} onPress={attemptInit}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!isReady) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
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
    backgroundColor: '#007AFF',
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
