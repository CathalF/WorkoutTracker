import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LineChart, BarChart } from 'react-native-gifted-charts';
import {
  LoggedExercise,
  ExerciseProgressPoint,
  ExerciseVolumePoint,
  PersonalRecord,
  VolumeRecord,
} from '../types';
import {
  getLoggedExercises,
  getExerciseProgress,
  getExerciseVolume,
  getPersonalRecords,
} from '../database/services';
import { useTheme, ThemeColors } from '../theme';

type TimeRange = '1M' | '3M' | '6M' | 'ALL';
type ChartType = 'weight' | 'volume';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: 'All', value: 'ALL' },
];

function formatRecordDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatVolume(volume: number): string {
  if (volume >= 10000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return volume.toLocaleString();
}

function getDateFrom(range: TimeRange): string | undefined {
  if (range === 'ALL') return undefined;
  const now = new Date();
  const days = range === '1M' ? 30 : range === '3M' ? 90 : 180;
  now.setDate(now.getDate() - days);
  return now.toISOString().split('T')[0];
}

export default function ProgressScreen() {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [exercises, setExercises] = useState<LoggedExercise[]>([]);
  const [selectedExerciseId, setSelectedExerciseId] = useState<number | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>('ALL');
  const [chartType, setChartType] = useState<ChartType>('weight');
  const [selectorOpen, setSelectorOpen] = useState(false);

  const [progressData, setProgressData] = useState<ExerciseProgressPoint[]>([]);
  const [volumeData, setVolumeData] = useState<ExerciseVolumePoint[]>([]);
  const [personalRecords, setPersonalRecords] = useState<{
    maxWeight: PersonalRecord | null;
    maxVolume: VolumeRecord | null;
  }>({ maxWeight: null, maxVolume: null });

  const selectedExercise = useMemo(
    () => exercises.find((e) => e.id === selectedExerciseId) ?? null,
    [exercises, selectedExerciseId]
  );

  useFocusEffect(
    useCallback(() => {
      const logged = getLoggedExercises();
      setExercises(logged);
      if (logged.length > 0 && !logged.find((e) => e.id === selectedExerciseId)) {
        setSelectedExerciseId(logged[0].id);
      }
    }, [selectedExerciseId])
  );

  useEffect(() => {
    if (!selectedExerciseId) return;
    const dateFrom = getDateFrom(timeRange);
    if (chartType === 'weight') {
      setProgressData(getExerciseProgress(selectedExerciseId, dateFrom));
    } else {
      setVolumeData(getExerciseVolume(selectedExerciseId, dateFrom));
    }
  }, [selectedExerciseId, timeRange, chartType]);

  useEffect(() => {
    if (!selectedExerciseId) return;
    setPersonalRecords(getPersonalRecords(selectedExerciseId));
  }, [selectedExerciseId]);

  const handleSelectExercise = (id: number) => {
    setSelectedExerciseId(id);
    setSelectorOpen(false);
  };

  const weightChartData = useMemo(() => {
    if (progressData.length < 2) return [];
    const step = progressData.length > 20 ? 5 : progressData.length > 10 ? 3 : 1;
    return progressData.map((p, i) => ({
      value: p.max_weight,
      label: i % step === 0
        ? new Date(p.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '',
      dataPointText: undefined as string | undefined,
    }));
  }, [progressData]);

  const volumeChartData = useMemo(() => {
    if (volumeData.length < 2) return [];
    const step = volumeData.length > 20 ? 5 : volumeData.length > 10 ? 3 : 1;
    return volumeData.map((v, i) => ({
      value: v.total_volume,
      label: i % step === 0
        ? new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : '',
    }));
  }, [volumeData]);

  const chartSpacing = useMemo(() => {
    const dataLen = chartType === 'weight' ? weightChartData.length : volumeChartData.length;
    if (dataLen <= 2) return 100;
    if (dataLen <= 5) return 60;
    if (dataLen <= 10) return 40;
    return 28;
  }, [chartType, weightChartData.length, volumeChartData.length]);

  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>
        <View style={staticStyles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color={colors.textTertiary} />
          <Text style={styles.emptyStateTitle}>No data yet</Text>
          <Text style={styles.emptyStateSubtitle}>
            Log some workouts to see your progress
          </Text>
        </View>
      </View>
    );
  }

  const currentData = chartType === 'weight' ? progressData : volumeData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress</Text>
      </View>

      <ScrollView style={staticStyles.scrollContent} contentContainerStyle={staticStyles.scrollContentContainer}>
        {/* Exercise Selector */}
        <Pressable
          style={({ pressed }) => [styles.exerciseSelector, pressed && styles.exerciseSelectorPressed]}
          onPress={() => setSelectorOpen(true)}
        >
          <View>
            <Text style={styles.exerciseSelectorName}>
              {selectedExercise?.name ?? 'Select Exercise'}
            </Text>
            <Text style={styles.exerciseSelectorGroup}>
              {selectedExercise?.muscle_group_name ?? ''}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={20} color={colors.textSecondary} />
        </Pressable>

        {/* Time Range Chips */}
        <View style={staticStyles.controlsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={staticStyles.chipRow}
          >
            {TIME_RANGES.map((tr) => (
              <Pressable
                key={tr.value}
                style={[
                  styles.chip,
                  timeRange === tr.value && styles.chipSelected,
                ]}
                onPress={() => setTimeRange(tr.value)}
              >
                <Text
                  style={[
                    styles.chipText,
                    timeRange === tr.value && styles.chipTextSelected,
                  ]}
                >
                  {tr.label}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Chart Type Toggle */}
        <View style={styles.toggleContainer}>
          <Pressable
            style={[styles.toggleSegment, chartType === 'weight' && styles.toggleSegmentSelected]}
            onPress={() => setChartType('weight')}
          >
            <Text style={[styles.toggleText, chartType === 'weight' && styles.toggleTextSelected]}>
              Weight
            </Text>
          </Pressable>
          <Pressable
            style={[styles.toggleSegment, chartType === 'volume' && styles.toggleSegmentSelected]}
            onPress={() => setChartType('volume')}
          >
            <Text style={[styles.toggleText, chartType === 'volume' && styles.toggleTextSelected]}>
              Volume
            </Text>
          </Pressable>
        </View>

        {/* Chart Area */}
        <View style={styles.chartCard}>
          <Text style={styles.chartLabel}>
            {chartType === 'weight' ? 'Max Weight (kg)' : 'Total Volume (kg)'}
          </Text>
          {currentData.length === 0 ? (
            <View style={staticStyles.noDataContainer}>
              <Ionicons name="bar-chart-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.noDataText}>No data for this time range</Text>
            </View>
          ) : currentData.length === 1 ? (
            <View style={staticStyles.noDataContainer}>
              <Text style={styles.singlePointValue}>
                {chartType === 'weight'
                  ? `${(currentData[0] as ExerciseProgressPoint).max_weight} kg`
                  : `${(currentData[0] as ExerciseVolumePoint).total_volume} kg`}
              </Text>
              <Text style={styles.noDataText}>Log more sessions to see trends</Text>
            </View>
          ) : chartType === 'weight' ? (
            <LineChart
              data={weightChartData}
              color={colors.primary}
              dataPointsColor={colors.primary}
              thickness={2}
              dataPointsRadius={4}
              spacing={chartSpacing}
              adjustToWidth={weightChartData.length <= 10}
              yAxisLabelWidth={50}
              yAxisTextStyle={{ fontSize: 11, color: colors.textSecondary }}
              xAxisLabelTextStyle={{ fontSize: 11, color: colors.textSecondary }}
              areaChart
              startFillColor={colors.chartAreaFillStart}
              endFillColor={colors.chartAreaFillEnd}
              startOpacity={0.3}
              endOpacity={0}
              overflowTop={30}
              pointerConfig={{
                pointerStripColor: colors.primary,
                pointerStripWidth: 1,
                pointerColor: colors.primary,
                radius: 5,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                pointerLabelComponent: (items: { value: number }[]) => (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipText}>{items[0].value} kg</Text>
                  </View>
                ),
              }}
              isAnimated
              animationDuration={600}
            />
          ) : (
            <BarChart
              data={volumeChartData}
              frontColor={colors.success}
              barWidth={20}
              barBorderRadius={4}
              spacing={chartSpacing}
              adjustToWidth={volumeChartData.length <= 10}
              yAxisLabelWidth={60}
              yAxisTextStyle={{ fontSize: 11, color: colors.textSecondary }}
              xAxisLabelTextStyle={{ fontSize: 11, color: colors.textSecondary }}
              renderTooltip={(item: { value: number }) => (
                <View style={styles.tooltipContainer}>
                  <Text style={styles.tooltipText}>{Math.round(item.value)} kg</Text>
                </View>
              )}
              isAnimated
              animationDuration={600}
            />
          )}
        </View>

        {/* Personal Records */}
        {(personalRecords.maxWeight || personalRecords.maxVolume) && (
          <View style={staticStyles.prSection}>
            <Text style={styles.prSectionTitle}>Personal Records</Text>
            <View style={styles.prCard}>
              {personalRecords.maxWeight && (
                <View style={staticStyles.prRow}>
                  <Ionicons name="trophy" size={24} color={colors.warning} />
                  <View style={staticStyles.prInfo}>
                    <Text style={styles.prLabel}>Max Weight</Text>
                    <Text style={styles.prValue}>
                      {personalRecords.maxWeight.weight} kg
                      <Text style={styles.prReps}> x {personalRecords.maxWeight.reps} reps</Text>
                    </Text>
                    <Text style={styles.prDate}>{formatRecordDate(personalRecords.maxWeight.date)}</Text>
                  </View>
                </View>
              )}
              {personalRecords.maxWeight && personalRecords.maxVolume && (
                <View style={styles.prDivider} />
              )}
              {personalRecords.maxVolume && (
                <View style={staticStyles.prRow}>
                  <Ionicons name="flame" size={24} color={colors.success} />
                  <View style={staticStyles.prInfo}>
                    <Text style={styles.prLabel}>Best Volume</Text>
                    <Text style={styles.prValue}>
                      {formatVolume(personalRecords.maxVolume.total_volume)} kg
                    </Text>
                    <Text style={styles.prDate}>{formatRecordDate(personalRecords.maxVolume.date)}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Exercise Selector Modal */}
      <Modal visible={selectorOpen} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Exercise</Text>
              <Pressable onPress={() => setSelectorOpen(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={exercises}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.exerciseRow,
                    pressed && styles.exerciseRowPressed,
                    item.id === selectedExerciseId && styles.exerciseRowSelected,
                  ]}
                  onPress={() => handleSelectExercise(item.id)}
                >
                  <Text style={styles.exerciseRowName}>{item.name}</Text>
                  <Text style={styles.exerciseRowGroup}>{item.muscle_group_name}</Text>
                </Pressable>
              )}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              removeClippedSubviews={true}
              maxToRenderPerBatch={15}
              windowSize={5}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  controlsRow: {
    marginTop: 12,
  },
  chipRow: {
    gap: 8,
  },
  noDataContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prSection: {
    marginTop: 16,
  },
  prRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  prInfo: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  // Exercise Selector
  exerciseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  exerciseSelectorPressed: {
    backgroundColor: colors.pressed,
  },
  exerciseSelectorName: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseSelectorGroup: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  // Chips
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  chipTextSelected: {
    color: '#fff',
  },
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: colors.separator,
    borderRadius: 8,
    padding: 2,
    marginTop: 12,
  },
  toggleSegment: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  toggleSegmentSelected: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  toggleTextSelected: {
    color: '#fff',
  },
  // Chart
  chartCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  chartLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  tooltipContainer: {
    backgroundColor: colors.chartTooltipBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.chartTooltipText,
  },
  noDataText: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 8,
  },
  singlePointValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
  },
  // PR
  prSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  prCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  prLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  prValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: 2,
  },
  prReps: {
    fontSize: 15,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  prDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  prDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 12,
  },
  // Empty state
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: colors.textSecondary,
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: '70%',
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exerciseRowPressed: {
    backgroundColor: colors.pressed,
  },
  exerciseRowSelected: {
    backgroundColor: colors.selectedRow,
  },
  exerciseRowName: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  exerciseRowGroup: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginLeft: 16,
  },
});
