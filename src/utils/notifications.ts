import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let activeNotificationId: string | null = null;

export async function setupNotificationChannels() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Rest Timer',
      importance: Notifications.AndroidImportance.HIGH,
      sound: 'default',
    });
    await Notifications.setNotificationChannelAsync('workout-reminders', {
      name: 'Workout Reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      sound: 'default',
    });
  }
}

export async function scheduleRestNotification(seconds: number) {
  // Cancel any existing scheduled notification
  if (activeNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(activeNotificationId);
  }
  activeNotificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Rest Complete',
      body: 'Time to start your next set!',
      sound: true,
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' && { channelId: 'rest-timer' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds,
      repeats: false,
    },
  });
}

export async function cancelRestNotification() {
  if (activeNotificationId) {
    await Notifications.cancelScheduledNotificationAsync(activeNotificationId);
    activeNotificationId = null;
  }
}

export async function syncNotificationSchedules() {
  // Placeholder — fully implemented in Task 2
}
