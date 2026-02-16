import { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import { createWorkout, addSet } from '../database/services';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ActiveWorkout'>;

interface SetEntry {
  weight: string;
  reps: string;
}

interface ActiveExercise {
  exerciseId: number;
  exerciseName: string;
  sets: SetEntry[];
}

export default function ActiveWorkoutScreen({ navigation, route }: Props) {
  const { muscleGroupId, splitLabel, muscleGroupIds } = route.params;
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const lastSelectedRef = useRef<string | null>(null);

  // Detect new exercise selection from ExercisePicker
  useEffect(() => {
    const selected = route.params.selectedExercise;
    if (!selected) return;

    const key = `${selected.id}-${Date.now()}`;
    if (lastSelectedRef.current === `${selected.id}`) return;

    // Only add if not already in the list
    const alreadyExists = exercises.some((e) => e.exerciseId === selected.id);
    if (alreadyExists) return;

    lastSelectedRef.current = `${selected.id}`;
    setExercises((prev) => [
      ...prev,
      {
        exerciseId: selected.id,
        exerciseName: selected.name,
        sets: [{ weight: '', reps: '' }],
      },
    ]);
  }, [route.params.selectedExercise]);

  const handleAddExercise = () => {
    const alreadyAddedIds = exercises.map((e) => e.exerciseId);
    navigation.navigate('ExercisePicker', {
      workoutId: -1,
      muscleGroupIds,
      alreadyAddedIds,
    });
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, i) => i !== index));
  };

  const addSetToExercise = (exerciseIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      const lastSet = exercise.sets[exercise.sets.length - 1];
      exercise.sets = [
        ...exercise.sets,
        { weight: lastSet?.weight ?? '', reps: lastSet?.reps ?? '' },
      ];
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const removeSet = (exerciseIndex: number, setIndex: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      exercise.sets = exercise.sets.filter((_, i) => i !== setIndex);
      if (exercise.sets.length === 0) {
        return updated.filter((_, i) => i !== exerciseIndex);
      }
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const updateSet = (
    exerciseIndex: number,
    setIndex: number,
    field: 'weight' | 'reps',
    value: string
  ) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      exercise.sets = [...exercise.sets];
      exercise.sets[setIndex] = { ...exercise.sets[setIndex], [field]: value };
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const incrementWeight = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      exercise.sets = [...exercise.sets];
      const current = parseFloat(exercise.sets[setIndex].weight) || 0;
      const newVal = Math.max(0, current + delta);
      exercise.sets[setIndex] = { ...exercise.sets[setIndex], weight: String(newVal) };
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const incrementReps = (exerciseIndex: number, setIndex: number, delta: number) => {
    setExercises((prev) => {
      const updated = [...prev];
      const exercise = { ...updated[exerciseIndex] };
      exercise.sets = [...exercise.sets];
      const current = parseInt(exercise.sets[setIndex].reps, 10) || 0;
      const newVal = Math.max(0, current + delta);
      exercise.sets[setIndex] = { ...exercise.sets[setIndex], reps: String(newVal) };
      updated[exerciseIndex] = exercise;
      return updated;
    });
  };

  const handleFinishWorkout = () => {
    // Validate: at least one complete set
    const hasCompleteSet = exercises.some((ex) =>
      ex.sets.some((s) => {
        const w = parseFloat(s.weight) || 0;
        const r = parseInt(s.reps, 10) || 0;
        return w > 0 && r > 0;
      })
    );

    if (!hasCompleteSet) {
      Alert.alert('Incomplete Workout', 'Add at least one complete set to save.');
      return;
    }

    // Save to DB
    const today = new Date().toISOString().split('T')[0];
    const workoutId = createWorkout(today, muscleGroupId);

    for (const exercise of exercises) {
      let setNumber = 1;
      for (const set of exercise.sets) {
        const weight = parseFloat(set.weight) || 0;
        const reps = parseInt(set.reps, 10) || 0;
        if (weight > 0 && reps > 0) {
          addSet(workoutId, exercise.exerciseId, setNumber, weight, reps);
          setNumber++;
        }
      }
    }

    Alert.alert('Workout Saved!', 'Great session!', [
      {
        text: 'OK',
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: 'StartWorkout' }] }),
      },
    ]);
  };

  const handleDiscard = () => {
    if (exercises.length === 0) {
      navigation.reset({ index: 0, routes: [{ name: 'StartWorkout' }] });
      return;
    }
    Alert.alert('Discard Workout?', 'All progress will be lost.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Discard',
        style: 'destructive',
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: 'StartWorkout' }] }),
      },
    ]);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleDiscard} style={styles.headerSide}>
          <Ionicons name="close" size={26} color="#FF3B30" />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{splitLabel}</Text>
          <Text style={styles.headerDate}>{todayFormatted}</Text>
        </View>
        <Pressable onPress={handleFinishWorkout} style={styles.finishButton}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </Pressable>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {exercises.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color="#C7C7CC" />
            <Text style={styles.emptyStateTitle}>No exercises yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add your first exercise to get started
            </Text>
            <Pressable style={styles.emptyAddButton} onPress={handleAddExercise}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.emptyAddButtonText}>Add Exercise</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {exercises.map((exercise, exIdx) => (
              <View key={exercise.exerciseId} style={styles.exerciseCard}>
                <View style={styles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                  <Pressable onPress={() => removeExercise(exIdx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  </Pressable>
                </View>

                <View style={styles.setHeaderRow}>
                  <Text style={styles.setHeaderLabel}>Set</Text>
                  <Text style={styles.setHeaderLabel}>Weight (lb)</Text>
                  <Text style={styles.setHeaderLabel}>Reps</Text>
                  <View style={{ width: 28 }} />
                </View>

                {exercise.sets.map((set, setIdx) => (
                  <View key={setIdx} style={styles.setRow}>
                    <Text style={styles.setNumber}>{setIdx + 1}</Text>

                    <View style={styles.inputGroup}>
                      <Pressable
                        style={styles.incrementButton}
                        onPress={() => incrementWeight(exIdx, setIdx, -5)}
                      >
                        <Text style={styles.incrementText}>-</Text>
                      </Pressable>
                      <TextInput
                        style={styles.weightInput}
                        value={set.weight}
                        onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#C7C7CC"
                        selectTextOnFocus
                      />
                      <Pressable
                        style={styles.incrementButton}
                        onPress={() => incrementWeight(exIdx, setIdx, 5)}
                      >
                        <Text style={styles.incrementText}>+</Text>
                      </Pressable>
                    </View>

                    <View style={styles.inputGroup}>
                      <Pressable
                        style={styles.incrementButton}
                        onPress={() => incrementReps(exIdx, setIdx, -1)}
                      >
                        <Text style={styles.incrementText}>-</Text>
                      </Pressable>
                      <TextInput
                        style={styles.repsInput}
                        value={set.reps}
                        onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#C7C7CC"
                        selectTextOnFocus
                      />
                      <Pressable
                        style={styles.incrementButton}
                        onPress={() => incrementReps(exIdx, setIdx, 1)}
                      >
                        <Text style={styles.incrementText}>+</Text>
                      </Pressable>
                    </View>

                    <Pressable
                      onPress={() => removeSet(exIdx, setIdx)}
                      hitSlop={8}
                      style={styles.deleteSetButton}
                    >
                      <Ionicons name="trash-outline" size={18} color="#FF3B30" />
                    </Pressable>
                  </View>
                ))}

                <Pressable
                  style={styles.addSetButton}
                  onPress={() => addSetToExercise(exIdx)}
                >
                  <Ionicons name="add" size={18} color="#007AFF" />
                  <Text style={styles.addSetText}>Add Set</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addExerciseButton} onPress={handleAddExercise}>
              <Ionicons name="add-circle-outline" size={22} color="#007AFF" />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </Pressable>

            <Pressable style={styles.finishWorkoutButton} onPress={handleFinishWorkout}>
              <Text style={styles.finishWorkoutButtonText}>Finish Workout</Text>
            </Pressable>
          </>
        )}
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
    width: 60,
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
  headerDate: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  finishButton: {
    width: 60,
    alignItems: 'flex-end',
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#007AFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // Empty state
  emptyState: {
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
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 24,
    gap: 8,
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  // Exercise card
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
    marginBottom: 8,
  },
  setNumber: {
    width: 24,
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
    textAlign: 'center',
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  incrementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2F2F7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    lineHeight: 20,
  },
  weightInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  repsInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
  },
  deleteSetButton: {
    width: 28,
    alignItems: 'center',
  },
  addSetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginTop: 4,
    gap: 4,
  },
  addSetText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#007AFF',
  },
  // Footer buttons
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  finishWorkoutButton: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  finishWorkoutButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
});
