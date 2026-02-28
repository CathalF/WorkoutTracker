import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
import { useTheme, ThemeColors } from '../theme';

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
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { workoutId } = route.params;
  const [workout, setWorkout] = useState<WorkoutDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCell, setEditingCell] = useState<EditingCell | null>(null);
  const [editValue, setEditValue] = useState('');

  const loadData = useCallback(() => {
    setIsLoading(true);
    const data = getWorkoutWithSets(workoutId);
    setWorkout(data);
    setIsLoading(false);
  }, [workoutId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
      setEditingCell(null);
      setEditValue('');
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

  if (isLoading || !workout) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={staticStyles.headerSide}>
            <Ionicons name="chevron-back" size={26} color={colors.primary} />
          </Pressable>
          <View style={staticStyles.headerCenter}>
            <Text style={styles.headerTitle}>Workout</Text>
          </View>
          <View style={staticStyles.headerSide} />
        </View>
        <View style={staticStyles.loadingContainer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={colors.primary} />
          ) : (
            <Text style={styles.loadingText}>Workout not found</Text>
          )}
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
      <View key={set.id} style={[staticStyles.setRow, index % 2 === 1 && styles.setRowAlt]}>
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
            style={staticStyles.editableCell}
            onPress={() => handleStartEdit(set.id, 'weight', set.weight)}
          >
            <Text style={styles.setCellText}>{set.weight} kg</Text>
            <Ionicons name="pencil-outline" size={12} color={colors.textTertiary} />
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
            style={staticStyles.editableCell}
            onPress={() => handleStartEdit(set.id, 'reps', set.reps)}
          >
            <Text style={styles.setCellText}>{set.reps}</Text>
            <Ionicons name="pencil-outline" size={12} color={colors.textTertiary} />
          </Pressable>
        )}

        <Pressable
          onPress={() => handleDeleteSet(set.id)}
          hitSlop={8}
          style={staticStyles.deleteSetButton}
        >
          <Ionicons name="trash-outline" size={16} color={colors.destructive} />
        </Pressable>
      </View>
    );
  };

  const renderExerciseCard = (exercise: ExerciseWithSets) => (
    <View key={exercise.exercise_id} style={styles.exerciseCard}>
      <View style={staticStyles.exerciseHeader}>
        <Text style={styles.exerciseTitle}>{exercise.exercise_name}</Text>
      </View>

      <View style={staticStyles.setHeaderRow}>
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
        <Pressable onPress={() => navigation.goBack()} style={staticStyles.headerSide}>
          <Ionicons name="chevron-back" size={26} color={colors.primary} />
        </Pressable>
        <View style={staticStyles.headerCenter}>
          <Text style={styles.headerTitle}>{workout.muscle_group_name}</Text>
        </View>
        <Pressable onPress={handleDeleteWorkout} style={staticStyles.headerSide}>
          <Ionicons name="trash-outline" size={22} color={colors.destructive} />
        </Pressable>
      </View>

      <ScrollView
        style={staticStyles.scrollView}
        contentContainerStyle={staticStyles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.summarySection}>
          <Text style={styles.summaryDate}>{formatDate(workout.date)}</Text>
          <Text style={styles.summaryStats}>
            {stats.exerciseCount} exercise{stats.exerciseCount !== 1 ? 's' : ''} ·{' '}
            {stats.setCount} set{stats.setCount !== 1 ? 's' : ''} ·{' '}
            {formatVolume(stats.totalVolume)} kg volume
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

const staticStyles = StyleSheet.create({
  headerSide: {
    width: 44,
    alignItems: 'center',
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  exerciseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  setHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 2,
  },
  editableCell: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  deleteSetButton: {
    width: 28,
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  summarySection: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  summaryDate: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  summaryStats: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  summaryNotes: {
    fontSize: 15,
    color: colors.text,
    marginTop: 8,
    fontStyle: 'italic',
  },
  exerciseCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  exerciseTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
  },
  setHeaderLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
    textTransform: 'uppercase',
    flex: 1,
    textAlign: 'center',
  },
  setRowAlt: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 6,
  },
  setNumber: {
    width: 24,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  setCellText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  editInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
    marginHorizontal: 4,
    backgroundColor: colors.surface,
  },
});
