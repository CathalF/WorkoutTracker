import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getNotificationPreferences, getConsecutiveTrainingDays } from '../database/services';

let activeNotificationId: string | null = null;

// --- Notification identifier constants ---
const WEEKLY_REMINDER_PREFIX = 'weekly-reminder-';
const NUDGE_ID = 'inactivity-nudge';
const REST_DAY_ID = 'rest-day-suggestion';

// --- Motivational message rotation ---
const REMINDER_MESSAGES = [
  { title: 'Time to Train!', body: "Your workout is waiting. Let's crush it!" },
  { title: 'Workout Day!', body: 'Stay consistent — every rep counts.' },
  { title: "Let's Go!", body: 'Your future self will thank you.' },
  { title: 'Gym Time!', body: 'Consistency beats perfection. Show up today.' },
];

function getRandomMessage() {
  return REMINDER_MESSAGES[Math.floor(Math.random() * REMINDER_MESSAGES.length)];
}

// --- Android notification channels ---

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

// --- Rest timer notifications ---

export async function scheduleRestNotification(seconds: number) {
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

// --- Weekly reminder notifications ---

export async function scheduleWeeklyReminders(days: number[], hour: number, minute: number) {
  await cancelWeeklyReminders();
  for (const weekday of days) {
    const msg = getRandomMessage();
    await Notifications.scheduleNotificationAsync({
      identifier: `${WEEKLY_REMINDER_PREFIX}${weekday}`,
      content: {
        title: msg.title,
        body: msg.body,
        sound: true,
        ...(Platform.OS === 'android' && { channelId: 'workout-reminders' }),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday,
        hour,
        minute,
      },
    });
  }
}

export async function cancelWeeklyReminders() {
  for (let d = 1; d <= 7; d++) {
    try {
      await Notifications.cancelScheduledNotificationAsync(`${WEEKLY_REMINDER_PREFIX}${d}`);
    } catch {}
  }
}

// --- Inactivity nudge notifications ---

export async function scheduleInactivityNudge(daysFromNow: number) {
  await cancelInactivityNudge();
  const target = new Date();
  target.setDate(target.getDate() + daysFromNow);
  target.setHours(10, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    identifier: NUDGE_ID,
    content: {
      title: 'Missing You!',
      body: `You haven't worked out in ${daysFromNow} days. Time to get back at it!`,
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'workout-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: target,
    },
  });
}

export async function cancelInactivityNudge() {
  try {
    await Notifications.cancelScheduledNotificationAsync(NUDGE_ID);
  } catch {}
}

// --- Rest day suggestion notifications ---

export async function scheduleRestDaySuggestion() {
  await cancelRestDaySuggestion();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(9, 0, 0, 0);
  await Notifications.scheduleNotificationAsync({
    identifier: REST_DAY_ID,
    content: {
      title: 'Rest Day?',
      body: "You've been training hard! Consider a rest day to recover and come back stronger.",
      sound: true,
      ...(Platform.OS === 'android' && { channelId: 'workout-reminders' }),
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: tomorrow,
    },
  });
}

export async function cancelRestDaySuggestion() {
  try {
    await Notifications.cancelScheduledNotificationAsync(REST_DAY_ID);
  } catch {}
}

// --- Sync on app open ---

export async function syncNotificationSchedules() {
  try {
    const prefs = getNotificationPreferences();
    if (prefs.remindersEnabled) {
      await scheduleWeeklyReminders(prefs.reminderDays, prefs.reminderHour, prefs.reminderMinute);
    } else {
      await cancelWeeklyReminders();
    }
    if (!prefs.nudgeEnabled) {
      await cancelInactivityNudge();
    }
    if (!prefs.restDayEnabled) {
      await cancelRestDaySuggestion();
    }
  } catch (e) {
    console.warn('Failed to sync notification schedules:', e);
  }
}

// --- Workout completion hook ---

export async function handleWorkoutCompleted() {
  try {
    const prefs = getNotificationPreferences();
    if (prefs.nudgeEnabled) {
      await scheduleInactivityNudge(prefs.nudgeDays);
    }
    if (prefs.restDayEnabled) {
      const consecutiveDays = getConsecutiveTrainingDays();
      if (consecutiveDays >= prefs.restDayThreshold) {
        await scheduleRestDaySuggestion();
      } else {
        await cancelRestDaySuggestion();
      }
    }
  } catch (e) {
    console.warn('Failed to handle workout completion notifications:', e);
  }
}
