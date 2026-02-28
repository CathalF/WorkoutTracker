import * as Notifications from 'expo-notifications';

let activeNotificationId: string | null = null;

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
