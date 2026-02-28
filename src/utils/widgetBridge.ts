import { Platform } from 'react-native';

/**
 * Safely request an Android widget update.
 * No-ops on iOS and when the native module isn't available (e.g., Expo Go).
 */
export function updateWidget() {
  if (Platform.OS !== 'android') return;
  try {
    const { requestWidgetUpdate } = require('react-native-android-widget');
    requestWidgetUpdate({ widgetName: 'WorkoutWidget' });
  } catch {}
}
