import { useCallback, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { HistoryStackParamList } from '../navigation/HistoryStackNavigator';
import { WorkoutDetail, ExerciseWithSets, WorkoutSet } from '../types';
import {
  getWorkoutWithSets,
  updateSet,
  deleteSet,
  deleteWorkout,
} from '../database/services';

type Props = NativeStackScreenProps<HistoryStackParamList, 'WorkoutDetail'>;

interface EditingCell {
  setId: number;
  field: 'weight' | 'reps';
}

function formatDate(dateStr: string): string {
  const parts = dateStr.split('-');
  const date = new Date(
    parseInt(parts[0], 10),
    parseInt(parts[1], 10) - 1,
    parseInt(parts[2], 10)
  );
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function computeStats(workout: WorkoutDetail) {
  let setCount = 0;
  let totalVolume = 0;
  for (const exercise of workout.exercises) {
    setCount += exercise.sets.length;
    for (const set of exercise.sets) {
      totalVolume += set.weight * set.reps;
    }
  }
  return {
    exerciseCount: workout.exercises.length,
    setCount,
    totalVolume,
  };
}

function formatVolume(volume: number): string {
  if (volume >= 1000) {
    return `${(volume / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  }
  return String(volume);
}

export default function WorkoutDetailScreen({ navigation, route }: Props) {
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadData = useCallback(() => {
    const data = getWorkoutWithSets(workoutId);
    setWorkout(data);
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleDeleteWorkout = () => {
    Alert.alert(
      'Delete Workout',
      "Delete this workout? This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteWorkout(workoutId);
            navigation.goBack();
          },
        },
      ]
    );
  };

  const handleDeleteSet = (setId: number) => {
    Alert.alert(
      'Delete Set',
      'Remove this set from the workout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteSet(setId);
            loadData();
          },
        },
      ]
    );
  };

  const handleStartEdit = (setId: number, field: 'weight' | 'reps', currentValue: number) => {
    setEditingCell({ setId, field });
    setEditValue(String(currentValue));
  };

  const handleSaveEdit = (set: WorkoutSet) => {
    if (!editingCell) return;

    const numericValue = parseFloat(editValue) || 0;
    const newWeight = editingCell.field === 'weight' ? numericValue : set.weight;
    const newReps = editingCell.field === 'reps' ? Math.round(numericValue) : set.reps;

    updateSet(set.id, newWeight, newReps);
    setEditingCell(null);
    setEditValue('');
    loadData();
  };

  const handleCancelEdit = () => {
    setEditingCell(null);
    setEditValue('');
  };

  if (!workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.headerSide}>
            <Ionicons name="chevron-back" size={26} color="#007AFF" />
          </Pressable>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Workout</Text>
          </View>
          <View style={styles.headerSide} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Workout not found</Text>
        </View>
      </View>
    );
  }

  const stats = computeStats(workout);

  const renderSetRow = (set: WorkoutSet, index: number) => {
    const isEditingWeight =
      editingCell?.setId === set.id && editingCell.field === 'weight';
    const isEditingReps =
      editingCell?.setId === set.id && editingCell.field === 'reps';

    return (
      <View key={set.id} style={[styles.setRow, index % 2 === 1 && styles.setRowAlt]}>
        <Text style={styles.setNumber}>{index + 1}</Text>

        {isEditingWeight ? (
          <TextInput
            style={styles.editInput}
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            onBlur={() => handleSaveEdit(set)}
            onSubmitEditing={() => handleSaveEdit(set)}
          />
        ) : (
          <Pressable
            style={styles.editableCell}
            onPress={() => handleStartEdit(set.id, 'weight', set.weight)}
          >
            <Text style={styles.setCellText}>{set.weight} lbs</Text>
            <Ionicons name="pencil-outline" size={12} color="#C7C7CC" />
          </Pressable>
        )}

        {isEditingReps ? (
          <TextInput
            style={styles.editInput}
            value={editValue}
            onChangeText={setEditValue}
            keyboardType="numeric"
            autoFocus
            selectTextOnFocus
            onBlur={() => handleSaveEdit(set)}
            onSubmitEditing={() => handleSaveEdit(set)}
          />
        ) : (
          <Pressable
            style={styles.editableCell}
            onPress={() => handleStartEdit(set.id, 'reps', set.reps)}
          >
            <Text style={styles.setCellText}>{set.reps}</Text>
            <Ionicons name="pencil-outline" size={12} color="#C7C7CC" />
          </Pressable>
        )}

        <Pressable
          onPress={() => handleDeleteSet(set.id)}
          hitSlop={8}
          style={styles.deleteSetButton}
        >
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
        </Pressable>
      </View>
    );
  };

  const renderExerciseCard = (exercise: ExerciseWithSets) => (
    <View key={exercise.exercise_id} style={styles.exerciseCard}>
      <View style={styles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>{exercise.exercise_name}</Text>
      </View>

      <View style={styles.setHeaderRow}>
        <Text style={styles.setHeaderLabel}>Set</Text>
        <Text style={styles.setHeaderLabel}>Weight</Text>
        <Text style={styles.setHeaderLabel}>Reps</Text>
        <View style={{ width: 28 }} />
      </View>

      {exercise.sets.map((set, index) => renderSetRow(set, index))}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerSide}>
          <Ionicons name="chevron-back" size={26} color="#007AFF" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{workout.muscle_group_name}</Text>
        </View>
        <Pressable onPress={handleDeleteWorkout} style={styles.headerSide}>
          <Ionicons name="trash-outline" size={22} color="#FF3B30" />
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summarySection}>
          <Text style={styles.summaryDate}>{formatDate(workout.date)}</Text>
          <Text style={styles.summaryStats}>
            {stats.exerciseCount} exercise{stats.exerciseCount !== 1 ? 's' : ''} ·{' '}
            {stats.setCount} set{stats.setCount !== 1 ? 's' : ''} ·{' '}
            {formatVolume(stats.totalVolume)} lbs volume
          </Text>
          {workout.notes ? (
            <Text style={styles.summaryNotes}>{workout.notes}</Text>
          ) : null}
        </View>

        {workout.exercises.map(renderExerciseCard)}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  headerSide: {
    width: 44,
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#8E8E93',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  summarySection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  summaryDate: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  summaryStats: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 4,
  },
  summaryNotes: {
    fontSize: 15,
    color: '#000',
    marginTop: 8,
    fontStyle: 'italic',
  },
  exerciseCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  exerciseTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
    flex: 1,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  setHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  setRowAlt: {
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
  },
  setNumber: {
    width: 24,
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  editableCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  setCellText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  editInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginHorizontal: 4,
    backgroundColor: '#fff',
  },
  deleteSetButton: {
    width: 28,
    alignItems: 'center',
  },
});
