import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { NotificationPreferences } from '../types';
import {
  getSetting,
  setSetting,
  getNotificationPreferences,
  saveNotificationPreferences,
} from '../database/services';
import {
  scheduleWeeklyReminders,
  cancelWeeklyReminders,
  scheduleInactivityNudge,
  cancelInactivityNudge,
  cancelRestDaySuggestion,
} from '../utils/notifications';
import { useThemeControl, ThemeColors } from '../theme';
import { GradientBackground } from '../components/glass';
import { useAuth } from '../contexts/AuthContext';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
// Maps display index (0=Sun..6=Sat) to expo weekday (1=Sun..7=Sat)
const DAY_WEEKDAYS = [1, 2, 3, 4, 5, 6, 7];

function formatTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useThemeControl();
  const { signOut, user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    remindersEnabled: false,
    reminderDays: [2, 4, 6],
    reminderHour: 8,
    reminderMinute: 0,
    nudgeEnabled: false,
    nudgeDays: 3,
    restDayEnabled: false,
    restDayThreshold: 3,
  });

  useEffect(() => {
    const goalStr = getSetting('weekly_goal', '3');
    setWeeklyGoal(parseInt(goalStr, 10) || 3);
    setPrefs(getNotificationPreferences());
  }, []);

  const handleGoalChange = useCallback((goal: number) => {
    setWeeklyGoal(goal);
    setSetting('weekly_goal', goal.toString());
  }, []);

  const updatePrefs = useCallback((updated: NotificationPreferences) => {
    setPrefs(updated);
    saveNotificationPreferences(updated);
  }, []);

  const handleToggleReminders = useCallback((enabled: boolean) => {
    const updated = { ...prefs, remindersEnabled: enabled };
    updatePrefs(updated);
    if (enabled) {
      scheduleWeeklyReminders(updated.reminderDays, updated.reminderHour, updated.reminderMinute);
    } else {
      cancelWeeklyReminders();
    }
  }, [prefs, updatePrefs]);

  const handleToggleDay = useCallback((weekday: number) => {
    const days = prefs.reminderDays.includes(weekday)
      ? prefs.reminderDays.filter((d) => d !== weekday)
      : [...prefs.reminderDays, weekday];
    if (days.length === 0) return; // Must have at least one day
    const updated = { ...prefs, reminderDays: days };
    updatePrefs(updated);
    if (updated.remindersEnabled) {
      scheduleWeeklyReminders(days, updated.reminderHour, updated.reminderMinute);
    }
  }, [prefs, updatePrefs]);

  const adjustTime = useCallback((direction: 1 | -1) => {
    let totalMinutes = prefs.reminderHour * 60 + prefs.reminderMinute + direction * 30;
    totalMinutes = Math.max(5 * 60, Math.min(22 * 60, totalMinutes));
    const newHour = Math.floor(totalMinutes / 60);
    const newMinute = totalMinutes % 60;
    const updated = { ...prefs, reminderHour: newHour, reminderMinute: newMinute };
    updatePrefs(updated);
    if (updated.remindersEnabled) {
      scheduleWeeklyReminders(updated.reminderDays, newHour, newMinute);
    }
  }, [prefs, updatePrefs]);

  const handleToggleNudge = useCallback((enabled: boolean) => {
    const updated = { ...prefs, nudgeEnabled: enabled };
    updatePrefs(updated);
    if (enabled) {
      scheduleInactivityNudge(updated.nudgeDays);
    } else {
      cancelInactivityNudge();
    }
  }, [prefs, updatePrefs]);

  const handleNudgeDaysChange = useCallback((days: number) => {
    const updated = { ...prefs, nudgeDays: days };
    updatePrefs(updated);
    if (updated.nudgeEnabled) {
      scheduleInactivityNudge(days);
    }
  }, [prefs, updatePrefs]);

  const handleToggleRestDay = useCallback((enabled: boolean) => {
    const updated = { ...prefs, restDayEnabled: enabled };
    updatePrefs(updated);
    if (!enabled) {
      cancelRestDaySuggestion();
    }
  }, [prefs, updatePrefs]);

  const handleRestDayThresholdChange = useCallback((threshold: number) => {
    const updated = { ...prefs, restDayThreshold: threshold };
    updatePrefs(updated);
    if (!updated.restDayEnabled) {
      cancelRestDaySuggestion();
    }
  }, [prefs, updatePrefs]);

  return (
    <GradientBackground>
      <View style={styles.header}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassElevated }]} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={staticStyles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={staticStyles.scrollContent}>
        {/* Training Section */}
        <Text style={styles.sectionLabel}>TRAINING</Text>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Weekly Workout Goal</Text>
        </View>
        <View style={[styles.settingCard, staticStyles.optionRow]}>
          {[2, 3, 4, 5, 6, 7].map((n) => (
            <Pressable
              key={n}
              style={[styles.optionButton, weeklyGoal === n && styles.optionButtonActive]}
              onPress={() => handleGoalChange(n)}
            >
              <Text style={[styles.optionButtonText, weeklyGoal === n && styles.optionButtonTextActive]}>
                {n}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Workout Reminders Section */}
        <Text style={styles.sectionLabel}>WORKOUT REMINDERS</Text>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Remind me to work out</Text>
          <Switch
            value={prefs.remindersEnabled}
            onValueChange={handleToggleReminders}
            trackColor={{ false: colors.glassBorder, true: colors.primary }}
          />
        </View>

        {prefs.remindersEnabled && (
          <>
            <View style={[styles.settingCard, staticStyles.dayPickerRow]}>
              {DAY_LABELS.map((label, index) => {
                const weekday = DAY_WEEKDAYS[index];
                const isActive = prefs.reminderDays.includes(weekday);
                return (
                  <Pressable
                    key={index}
                    style={[styles.dayButton, isActive && styles.dayButtonActive]}
                    onPress={() => handleToggleDay(weekday)}
                  >
                    <Text style={[styles.dayButtonText, isActive && styles.dayButtonTextActive]}>
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.timeCard}>
              <Pressable style={styles.timeButton} onPress={() => adjustTime(-1)}>
                <Ionicons name="remove" size={20} color={colors.text} />
              </Pressable>
              <Text style={styles.timeDisplay}>
                {formatTime(prefs.reminderHour, prefs.reminderMinute)}
              </Text>
              <Pressable style={styles.timeButton} onPress={() => adjustTime(1)}>
                <Ionicons name="add" size={20} color={colors.text} />
              </Pressable>
            </View>
          </>
        )}

        {/* Inactivity Nudge Section */}
        <Text style={styles.sectionLabel}>INACTIVITY NUDGE</Text>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Remind me after inactivity</Text>
          <Switch
            value={prefs.nudgeEnabled}
            onValueChange={handleToggleNudge}
            trackColor={{ false: colors.glassBorder, true: colors.primary }}
          />
        </View>

        {prefs.nudgeEnabled && (
          <>
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Nudge after {prefs.nudgeDays} days</Text>
            </View>
            <View style={[styles.settingCard, staticStyles.optionRow]}>
              {[2, 3, 4, 5, 6, 7].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.optionButton, prefs.nudgeDays === n && styles.optionButtonActive]}
                  onPress={() => handleNudgeDaysChange(n)}
                >
                  <Text style={[styles.optionButtonText, prefs.nudgeDays === n && styles.optionButtonTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Rest Day Suggestions Section */}
        <Text style={styles.sectionLabel}>REST DAY SUGGESTIONS</Text>
        <View style={styles.settingCard}>
          <Text style={styles.settingLabel}>Suggest rest days</Text>
          <Switch
            value={prefs.restDayEnabled}
            onValueChange={handleToggleRestDay}
            trackColor={{ false: colors.glassBorder, true: colors.primary }}
          />
        </View>

        {prefs.restDayEnabled && (
          <>
            <View style={styles.settingCard}>
              <Text style={styles.settingLabel}>Suggest after {prefs.restDayThreshold} consecutive days</Text>
            </View>
            <View style={[styles.settingCard, staticStyles.optionRow]}>
              {[2, 3, 4, 5].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.optionButton, prefs.restDayThreshold === n && styles.optionButtonActive]}
                  onPress={() => handleRestDayThresholdChange(n)}
                >
                  <Text style={[styles.optionButtonText, prefs.restDayThreshold === n && styles.optionButtonTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        )}

        {/* Account Section */}
        <Text style={styles.sectionLabel}>ACCOUNT</Text>
        {user?.email && (
          <View style={styles.settingCard}>
            <Text style={styles.settingLabel}>{user.email}</Text>
          </View>
        )}
        <Pressable
          style={({ pressed }) => [styles.settingCard, pressed && staticStyles.pressed]}
          onPress={signOut}
        >
          <Text style={styles.signOutText}>Sign Out</Text>
          <Ionicons name="log-out-outline" size={20} color={colors.destructive} />
        </Pressable>
      </ScrollView>
    </GradientBackground>
  );
}

const staticStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 40,
  },
  headerPlaceholder: {
    width: 28,
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
  },
  dayPickerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.7,
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.glassBorder,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    color: colors.textSecondary,
    paddingHorizontal: 16,
    marginTop: 24,
    marginBottom: 8,
  },
  settingCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.glassSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  dayButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  dayButtonTextActive: {
    color: '#fff',
  },
  timeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.glassSurface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  timeDisplay: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.text,
    minWidth: 100,
    textAlign: 'center',
  },
  timeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButton: {
    height: 44,
    minWidth: 48,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.glassSurface,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 12,
  },
  optionButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  optionButtonTextActive: {
    color: '#fff',
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.destructive,
  },
});
