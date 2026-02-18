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

type TimeRange = '1M' | '3M' | '6M' | 'ALL';
type ChartType = 'weight' | 'volume';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '1M', value: '1M' },
  { label: '3M', value: '3M' },
  { label: '6M', value: '6M' },
  { label: 'All', value: 'ALL' },
];

function getDateFrom(range: TimeRange): string | undefined {
  if (range === 'ALL') return undefined;
  const now = new Date();
  const days = range === '1M' ? 30 : range === '3M' ? 90 : 180;
  now.setDate(now.getDate() - days);
  return now.toISOString().split('T')[0];
}

export default function ProgressScreen() {
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

  // Load logged exercises on focus
  useFocusEffect(
    useCallback(() => {
      const logged = getLoggedExercises();
      setExercises(logged);
      if (logged.length > 0 && !logged.find((e) => e.id === selectedExerciseId)) {
        setSelectedExerciseId(logged[0].id);
      }
    }, [selectedExerciseId])
  );

  // Load chart data when exercise, time range, or chart type changes
  useEffect(() => {
    if (!selectedExerciseId) return;
    const dateFrom = getDateFrom(timeRange);
    if (chartType === 'weight') {
      setProgressData(getExerciseProgress(selectedExerciseId, dateFrom));
    } else {
      setVolumeData(getExerciseVolume(selectedExerciseId, dateFrom));
    }
  }, [selectedExerciseId, timeRange, chartType]);

  // Load personal records when exercise changes
  useEffect(() => {
    if (!selectedExerciseId) return;
    setPersonalRecords(getPersonalRecords(selectedExerciseId));
  }, [selectedExerciseId]);

  const handleSelectExercise = (id: number) => {
    setSelectedExerciseId(id);
    setSelectorOpen(false);
  };

  // Chart data transformations
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

  // Empty state: no logged exercises
  if (exercises.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Progress</Text>
        </View>
        <View style={styles.emptyState}>
          <Ionicons name="analytics-outline" size={64} color="#C7C7CC" />
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

      <ScrollView style={styles.scrollContent} contentContainerStyle={styles.scrollContentContainer}>
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
          <Ionicons name="chevron-down" size={20} color="#8E8E93" />
        </Pressable>

        {/* Time Range Chips */}
        <View style={styles.controlsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
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
            {chartType === 'weight' ? 'Max Weight (lbs)' : 'Total Volume (lbs)'}
          </Text>
          {currentData.length === 0 ? (
            <View style={styles.noDataContainer}>
              <Ionicons name="bar-chart-outline" size={48} color="#C7C7CC" />
              <Text style={styles.noDataText}>No data for this time range</Text>
            </View>
          ) : currentData.length === 1 ? (
            <View style={styles.noDataContainer}>
              <Text style={styles.singlePointValue}>
                {chartType === 'weight'
                  ? `${(currentData[0] as ExerciseProgressPoint).max_weight} lbs`
                  : `${(currentData[0] as ExerciseVolumePoint).total_volume} lbs`}
              </Text>
              <Text style={styles.noDataText}>Log more sessions to see trends</Text>
            </View>
          ) : chartType === 'weight' ? (
            <LineChart
              data={weightChartData}
              color="#007AFF"
              dataPointsColor="#007AFF"
              thickness={2}
              dataPointsRadius={4}
              spacing={chartSpacing}
              adjustToWidth={weightChartData.length <= 10}
              yAxisLabelWidth={50}
              yAxisTextStyle={{ fontSize: 11, color: '#8E8E93' }}
              xAxisLabelTextStyle={{ fontSize: 11, color: '#8E8E93' }}
              areaChart
              startFillColor="rgba(0,122,255,0.15)"
              endFillColor="rgba(0,122,255,0.01)"
              startOpacity={0.3}
              endOpacity={0}
              overflowTop={30}
              pointerConfig={{
                pointerStripColor: '#007AFF',
                pointerStripWidth: 1,
                pointerColor: '#007AFF',
                radius: 5,
                pointerLabelWidth: 80,
                pointerLabelHeight: 30,
                pointerLabelComponent: (items: { value: number }[]) => (
                  <View style={styles.tooltipContainer}>
                    <Text style={styles.tooltipText}>{items[0].value} lbs</Text>
                  </View>
                ),
              }}
              isAnimated
              animationDuration={600}
            />
          ) : (
            <BarChart
              data={volumeChartData}
              frontColor="#34C759"
              barWidth={20}
              barBorderRadius={4}
              spacing={chartSpacing}
              adjustToWidth={volumeChartData.length <= 10}
              yAxisLabelWidth={60}
              yAxisTextStyle={{ fontSize: 11, color: '#8E8E93' }}
              xAxisLabelTextStyle={{ fontSize: 11, color: '#8E8E93' }}
              renderTooltip={(item: { value: number }) => (
                <View style={styles.tooltipContainer}>
                  <Text style={styles.tooltipText}>{Math.round(item.value)} lbs</Text>
                </View>
              )}
              isAnimated
              animationDuration={600}
            />
          )}
        </View>

        {/* Personal Records — placeholder for Task 4 */}
        {(personalRecords.maxWeight || personalRecords.maxVolume) && (
          <View style={styles.prSection}>
            <Text style={styles.prSectionTitle}>Personal Records</Text>
            <View style={styles.prPlaceholder}>
              <Text style={styles.chartPlaceholderText}>PR card goes here</Text>
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
                <Ionicons name="close" size={24} color="#000" />
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
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  // Exercise Selector
  exerciseSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  exerciseSelectorPressed: {
    backgroundColor: '#E8F0FE',
  },
  exerciseSelectorName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  exerciseSelectorGroup: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  // Controls
  controlsRow: {
    marginTop: 12,
  },
  chipRow: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  chipSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  chipTextSelected: {
    color: '#fff',
  },
  // Toggle
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
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
    backgroundColor: '#007AFF',
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  toggleTextSelected: {
    color: '#fff',
  },
  // Chart
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  chartLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 12,
  },
  chartPlaceholderText: {
    fontSize: 15,
    color: '#C7C7CC',
  },
  tooltipContainer: {
    backgroundColor: '#333',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tooltipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  noDataContainer: {
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataText: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 8,
  },
  singlePointValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  // PR Section placeholders
  prSection: {
    marginTop: 16,
  },
  prSectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  prPlaceholder: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Empty state
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginTop: 16,
  },
  emptyStateSubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 4,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
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
    borderBottomColor: '#C6C6C8',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  exerciseRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  exerciseRowPressed: {
    backgroundColor: '#E8F0FE',
  },
  exerciseRowSelected: {
    backgroundColor: '#F0F7FF',
  },
  exerciseRowName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  exerciseRowGroup: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginLeft: 16,
  },
});
