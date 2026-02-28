import { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { RecentPR, MonthlyStats } from '../types';
import {
  getWorkoutDaysInRange,
  getWeeklyStreak,
  getMonthlyStats,
  getRecentPRs,
  getSetting,
} from '../database/services';
import { useTheme, ThemeColors } from '../theme';

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return volume.toLocaleString();
}

export default function DashboardScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const navigation = useNavigation<any>();

  const [weekDays, setWeekDays] = useState<Set<number>>(new Set());
  const [streak, setStreak] = useState(0);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({ workoutCount: 0, totalVolume: 0 });
  const [recentPRs, setRecentPRs] = useState<RecentPR[]>([]);
  const [weeklyGoal, setWeeklyGoal] = useState(3);
  const [hasWorkouts, setHasWorkouts] = useState(true);

  const loadDashboardData = useCallback(() => {
    // Calculate current week boundaries (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon, ...
    const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Load workout days this week
    const days = getWorkoutDaysInRange(mondayStr, sundayStr);
    const dayIndices = new Set<number>();
    for (const d of days) {
      const date = new Date(d + 'T00:00:00');
      const dow = date.getDay(); // 0=Sun, 1=Mon, ...
      const index = dow === 0 ? 6 : dow - 1; // Convert to 0=Mon, 6=Sun
      dayIndices.add(index);
    }
    setWeekDays(dayIndices);

    // Load weekly goal
    const goalStr = getSetting('weekly_goal', '3');
    const goal = parseInt(goalStr, 10) || 3;
    setWeeklyGoal(goal);

    // Load streak
    const currentStreak = getWeeklyStreak(goal);
    setStreak(currentStreak);

    // Load monthly stats
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1; // 1-indexed
    const stats = getMonthlyStats(currentYear, currentMonth);
    setMonthlyStats(stats);

    // Load recent PRs
    const prs = getRecentPRs(5);
    setRecentPRs(prs);

    // Determine if any workouts exist
    setHasWorkouts(stats.workoutCount > 0 || days.length > 0 || prs.length > 0);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  // Today's day index (0=Mon, 6=Sun)
  const todayIndex = useMemo(() => {
    const dow = new Date().getDay();
    return dow === 0 ? 6 : dow - 1;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <Pressable onPress={() => navigation.navigate('Settings')} hitSlop={8}>
          <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        style={staticStyles.scrollView}
        contentContainerStyle={staticStyles.scrollContent}
      >
        {!hasWorkouts ? (
          <View style={staticStyles.emptyState}>
            <Ionicons name="fitness-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>Welcome!</Text>
            <Text style={styles.emptySubtitle}>
              Complete your first workout to see your stats, streaks, and personal records here.
            </Text>
          </View>
        ) : (
          <>
            {/* Weekly Overview */}
            <View style={styles.weekContainer}>
              <Text style={styles.sectionTitle}>This Week</Text>
              <View style={staticStyles.weekRow}>
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((label, index) => {
                  const isTrained = weekDays.has(index);
                  const isToday = index === todayIndex;
                  return (
                    <View key={index} style={staticStyles.dayColumn}>
                      <View
                        style={[
                          styles.dayDot,
                          isTrained && styles.dayDotActive,
                          isToday && !isTrained && styles.dayDotToday,
                        ]}
                      />
                      <Text style={[styles.dayLabel, isToday && styles.dayLabelToday]}>
                        {label}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Stats Row */}
            <View style={staticStyles.statsRow}>
              <View style={[styles.statCard, staticStyles.statCardHalf]}>
                <Ionicons name="flame" size={24} color={colors.warning} />
                <Text style={styles.statValue}>{streak}</Text>
                <Text style={styles.statLabel}>week streak</Text>
              </View>
              <View style={[styles.statCard, staticStyles.statCardHalf]}>
                <Ionicons name="barbell" size={24} color={colors.primary} />
                <Text style={styles.statValue}>{monthlyStats.workoutCount}</Text>
                <Text style={styles.statLabel}>workouts this month</Text>
              </View>
            </View>

            {/* Volume Card */}
            <View style={styles.statCard}>
              <View style={staticStyles.volumeHeader}>
                <Ionicons name="trending-up" size={20} color={colors.success} />
                <Text style={styles.volumeLabel}>Volume This Month</Text>
              </View>
              <Text style={styles.volumeValue}>
                {formatVolume(monthlyStats.totalVolume)} kg
              </Text>
            </View>

            {/* Recent PRs */}
            <Text style={[styles.sectionTitle, staticStyles.prSectionTitle]}>Recent PRs</Text>
            {recentPRs.length === 0 ? (
              <Text style={styles.emptyPRText}>Complete workouts to see your PRs here</Text>
            ) : (
              recentPRs.map((pr) => (
                <View key={pr.id} style={styles.prRow}>
                  <Ionicons name="trophy" size={20} color={colors.warning} />
                  <View style={staticStyles.prInfo}>
                    <Text style={styles.prName}>{pr.exercise_name}</Text>
                    <Text style={styles.prDetail}>
                      {pr.weight} kg × {pr.reps} reps · {pr.pr_type === 'weight' ? 'Weight PR' : 'Rep PR'}
                    </Text>
                  </View>
                  <Text style={styles.prDate}>{formatDate(pr.date)}</Text>
                </View>
              ))
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    paddingHorizontal: 32,
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginTop: 12,
  },
  dayColumn: {
    alignItems: 'center',
    gap: 6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCardHalf: {
    flex: 1,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  prSectionTitle: {
    marginTop: 12,
  },
  prInfo: {
    flex: 1,
    marginLeft: 10,
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
  },
  // Weekly overview
  weekContainer: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  dayDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.separator,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayDotActive: {
    backgroundColor: colors.primary,
  },
  dayDotToday: {
    backgroundColor: 'transparent',
    borderWidth: 2,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  dayLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  dayLabelToday: {
    color: colors.primary,
    fontWeight: '600',
  },
  // Stats
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 12,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  statLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  volumeLabel: {
    fontSize: 15,
    color: colors.textSecondary,
  },
  volumeValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  // PRs
  emptyPRText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingVertical: 16,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    marginBottom: 8,
  },
  prName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  prDetail: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  prDate: {
    fontSize: 12,
    color: colors.textTertiary,
  },
});
