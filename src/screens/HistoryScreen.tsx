import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { HistoryStackParamList } from '../navigation/HistoryStackNavigator';
import { MuscleGroup, WorkoutSummary } from '../types';
import { getAllMuscleGroups, getWorkouts } from '../database/services';

type NavigationProp = NativeStackNavigationProp<HistoryStackParamList, 'HistoryList'>;

interface Section {
  title: string;
  data: WorkoutSummary[];
}

function formatSectionDate(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  // Parse the date string as local date (YYYY-MM-DD format)
  const parts = dateStr.split('-');
  const date = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  date.setHours(0, 0, 0, 0);

  if (date.getTime() === today.getTime()) {
    return 'Today';
  }
  if (date.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  const currentYear = today.getFullYear();
  const dateYear = date.getFullYear();

  if (dateYear === currentYear) {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  }

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(createdAt: string): string {
  const date = new Date(createdAt);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(volume);
}

function groupByDate(workouts: WorkoutSummary[]): Section[] {
  const map = new Map<string, WorkoutSummary[]>();
  for (const w of workouts) {
    const existing = map.get(w.date);
    if (existing) {
      existing.push(w);
    } else {
      map.set(w.date, [w]);
    }
  }

  const sections: Section[] = [];
  for (const [date, data] of map.entries()) {
    sections.push({ title: formatSectionDate(date), data });
  }
  return sections;
}

export default function HistoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [workouts, setWorkouts] = useState<WorkoutSummary[]>([]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [selectedFilterId, setSelectedFilterId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(() => {
    const groups = getAllMuscleGroups();
    setMuscleGroups(groups);
    const results = getWorkouts(selectedFilterId ?? undefined);
    setWorkouts(results);
  }, [selectedFilterId]);

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleFilterPress = (muscleGroupId: number | null) => {
    setSelectedFilterId(muscleGroupId);
  };

  // Re-load workouts when filter changes
  useEffect(() => {
    const results = getWorkouts(selectedFilterId ?? undefined);
    setWorkouts(results);
  }, [selectedFilterId]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
    setRefreshing(false);
  };

  const handleWorkoutPress = (workoutId: number) => {
    navigation.navigate('WorkoutDetail', { workoutId });
  };

  const sections = groupByDate(workouts);

  const selectedFilterName =
    selectedFilterId !== null
      ? muscleGroups.find((mg) => mg.id === selectedFilterId)?.name ?? ''
      : '';

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  const renderWorkoutCard = ({ item }: { item: WorkoutSummary }) => (
    <Pressable
      style={({ pressed }) => [styles.workoutCard, pressed && styles.workoutCardPressed]}
      onPress={() => handleWorkoutPress(item.id)}
    >
      <View style={styles.workoutCardContent}>
        <View style={styles.workoutCardLeft}>
          <Text style={styles.workoutMuscleGroup}>{item.muscle_group_name}</Text>
          <Text style={styles.workoutTime}>{formatTime(item.created_at)}</Text>
          <Text style={styles.workoutStats}>
            {item.exercise_count} exercise{item.exercise_count !== 1 ? 's' : ''} ·{' '}
            {item.set_count} set{item.set_count !== 1 ? 's' : ''} ·{' '}
            {formatVolume(item.total_volume)} lbs volume
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
      </View>
    </Pressable>
  );

  const renderEmpty = () => {
    if (selectedFilterId !== null) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="filter-outline" size={64} color="#C7C7CC" />
          <Text style={styles.emptyStateTitle}>No {selectedFilterName} workouts</Text>
          <Text style={styles.emptyStateSubtitle}>
            Try a different filter or log a workout
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="time-outline" size={64} color="#C7C7CC" />
        <Text style={styles.emptyStateTitle}>No workouts yet</Text>
        <Text style={styles.emptyStateSubtitle}>
          Complete a workout to see it here
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>History</Text>
      </View>

      <View style={styles.filterContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          <Pressable
            style={[
              styles.filterChip,
              selectedFilterId === null && styles.filterChipSelected,
            ]}
            onPress={() => handleFilterPress(null)}
          >
            <Text
              style={[
                styles.filterChipText,
                selectedFilterId === null && styles.filterChipTextSelected,
              ]}
            >
              All
            </Text>
          </Pressable>
          {muscleGroups.map((mg) => (
            <Pressable
              key={mg.id}
              style={[
                styles.filterChip,
                selectedFilterId === mg.id && styles.filterChipSelected,
              ]}
              onPress={() => handleFilterPress(mg.id)}
            >
              <Text
                style={[
                  styles.filterChipText,
                  selectedFilterId === mg.id && styles.filterChipTextSelected,
                ]}
              >
                {mg.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderWorkoutCard}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          sections.length === 0 ? styles.emptyListContent : styles.listContent
        }
        stickySectionHeadersEnabled={false}
        refreshing={refreshing}
        onRefresh={handleRefresh}
      />
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
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  filterContainer: {
    backgroundColor: '#fff',
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
  },
  filterChipSelected: {
    backgroundColor: '#007AFF',
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  filterChipTextSelected: {
    color: '#fff',
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  sectionHeader: {
    paddingVertical: 8,
    paddingHorizontal: 24,
    backgroundColor: '#F2F2F7',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
  },
  workoutCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  workoutCardPressed: {
    backgroundColor: '#E8F0FE',
  },
  workoutCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  workoutCardLeft: {
    flex: 1,
  },
  workoutMuscleGroup: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  workoutTime: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 2,
  },
  workoutStats: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
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
});
