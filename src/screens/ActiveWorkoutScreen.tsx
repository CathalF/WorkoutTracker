import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  Alert,
  Animated,
  Keyboard,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useKeepAwake } from 'expo-keep-awake';
import * as Haptics from 'expo-haptics';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import { createWorkout, addSet, getExerciseMuscleGroupId, createTemplate, getLastPerformance, getExerciseRestTime, DEFAULT_REST_SECONDS } from '../database/services';
import { LastPerformanceSet } from '../types';
import { useTheme, ThemeColors } from '../theme';
import useRestTimer from '../hooks/useRestTimer';
import { scheduleRestNotification, cancelRestNotification } from '../utils/notifications';

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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ActiveWorkoutScreen({ navigation, route }: Props) {
  useKeepAwake();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { muscleGroupId, splitLabel, muscleGroupIds } = route.params;
  const [exercises, setExercises] = useState<ActiveExercise[]>([]);
  const lastSelectedRef = useRef<string | null>(null);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const savedWorkoutIdRef = useRef<number | null>(null);
  const [lastPerformance, setLastPerformance] = useState<Map<number, LastPerformanceSet[]>>(new Map());
  const templateInitRef = useRef(false);

  // Set completion tracking
  const [completedSets, setCompletedSets] = useState<Set<string>>(new Set());

  // Rest time cache per exercise
  const [restTimes, setRestTimes] = useState<Map<number, number>>(new Map());

  // Timer completion message
  const [showRestComplete, setShowRestComplete] = useState(false);
  const restCompleteTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Timer bar animation
  const timerSlideAnim = useRef(new Animated.Value(100)).current;

  const onTimerComplete = useCallback(() => {
    cancelRestNotification();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowRestComplete(true);
    restCompleteTimeoutRef.current = setTimeout(() => {
      setShowRestComplete(false);
    }, 1500);
  }, []);

  const { secondsRemaining, isRunning, totalDuration, startTimer, stopTimer, adjustTime } = useRestTimer({
    onComplete: onTimerComplete,
  });

  // Animate timer bar in/out
  useEffect(() => {
    if (isRunning || showRestComplete) {
      Animated.spring(timerSlideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    } else {
      Animated.timing(timerSlideAnim, {
        toValue: 100,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRunning, showRestComplete, timerSlideAnim]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (restCompleteTimeoutRef.current) {
        clearTimeout(restCompleteTimeoutRef.current);
      }
    };
  }, []);

  // Initialize from template on mount
  useEffect(() => {
    const fromTemplate = route.params.fromTemplate;
    if (!fromTemplate || templateInitRef.current) return;
    templateInitRef.current = true;

    const initialExercises: ActiveExercise[] = fromTemplate.exercises.map((te) => ({
      exerciseId: te.exerciseId,
      exerciseName: te.exerciseName,
      sets: Array.from({ length: Math.max(te.defaultSets, 1) }, () => ({ weight: '', reps: '' })),
    }));
    setExercises(initialExercises);

    // Fetch previous performance and rest times for all template exercises
    const perfMap = new Map<number, LastPerformanceSet[]>();
    const rtMap = new Map<number, number>();
    for (const te of fromTemplate.exercises) {
      const perf = getLastPerformance(te.exerciseId);
      if (perf.length > 0) {
        perfMap.set(te.exerciseId, perf);
      }
      rtMap.set(te.exerciseId, getExerciseRestTime(te.exerciseId));
    }
    setLastPerformance(perfMap);
    setRestTimes(rtMap);
  }, [route.params.fromTemplate]);

  // Detect new exercise selection from ExercisePicker
  useEffect(() => {
    const selected = route.params.selectedExercise;
    if (!selected) return;

    if (lastSelectedRef.current === `${selected.id}`) return;

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

    // Fetch previous performance and rest time for newly added exercise
    const perf = getLastPerformance(selected.id);
    if (perf.length > 0) {
      setLastPerformance((prev) => new Map(prev).set(selected.id, perf));
    }
    setRestTimes((prev) => new Map(prev).set(selected.id, getExerciseRestTime(selected.id)));
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
    // Remove from completedSets
    const key = `${exerciseIndex}-${setIndex}`;
    setCompletedSets((prev) => {
      const next = new Set(prev);
      next.delete(key);
      // Re-index keys for sets after the removed one
      const updated = new Set<string>();
      for (const k of next) {
        const [exI, sI] = k.split('-').map(Number);
        if (exI === exerciseIndex && sI > setIndex) {
          updated.add(`${exI}-${sI - 1}`);
        } else {
          updated.add(k);
        }
      }
      return updated;
    });

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

  const toggleSetComplete = (exIdx: number, setIdx: number) => {
    const key = `${exIdx}-${setIdx}`;
    if (completedSets.has(key)) {
      setCompletedSets((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
      return;
    }

    // Validate set has weight and reps
    const set = exercises[exIdx].sets[setIdx];
    const w = parseFloat(set.weight) || 0;
    const r = parseInt(set.reps, 10) || 0;
    if (w <= 0 || r <= 0) {
      Alert.alert('Incomplete Set', 'Enter weight and reps first.');
      return;
    }

    setCompletedSets((prev) => new Set(prev).add(key));

    // Start rest timer
    const restSeconds = restTimes.get(exercises[exIdx].exerciseId) ?? DEFAULT_REST_SECONDS;
    startTimer(restSeconds);
    scheduleRestNotification(restSeconds);
  };

  const handleSkipTimer = () => {
    stopTimer();
    cancelRestNotification();
    setShowRestComplete(false);
    if (restCompleteTimeoutRef.current) {
      clearTimeout(restCompleteTimeoutRef.current);
      restCompleteTimeoutRef.current = null;
    }
  };

  const handleFinishWorkout = () => {
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

    // Stop timer if running
    if (isRunning) {
      stopTimer();
      cancelRestNotification();
    }

    const today = new Date().toISOString().split('T')[0];
    const resolvedMuscleGroupId =
      muscleGroupId || getExerciseMuscleGroupId(exercises[0].exerciseId);
    if (!resolvedMuscleGroupId) {
      Alert.alert('Error', 'Could not determine workout muscle group.');
      return;
    }
    const workoutId = createWorkout(today, resolvedMuscleGroupId);

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

    savedWorkoutIdRef.current = workoutId;

    Alert.alert('Workout Saved!', 'Great session!', [
      {
        text: 'Done',
        onPress: () =>
          navigation.reset({ index: 0, routes: [{ name: 'StartWorkout' }] }),
      },
      {
        text: 'Save as Template',
        onPress: () => {
          setTemplateName(splitLabel);
          setTemplateModalVisible(true);
        },
      },
    ]);
  };

  const handleSaveTemplate = () => {
    const name = templateName.trim();
    if (!name) return;

    const templateExercises = exercises
      .filter((ex) => ex.sets.some((s) => (parseFloat(s.weight) || 0) > 0 && (parseInt(s.reps, 10) || 0) > 0))
      .map((ex) => ({
        exerciseId: ex.exerciseId,
        defaultSets: ex.sets.filter((s) => (parseFloat(s.weight) || 0) > 0 && (parseInt(s.reps, 10) || 0) > 0).length,
      }));

    if (templateExercises.length === 0) return;

    createTemplate(name, muscleGroupId, splitLabel, muscleGroupIds, templateExercises);

    setTemplateModalVisible(false);
    Alert.alert('Template Saved!', `"${name}" is ready to use.`, [
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
        onPress: () => {
          if (isRunning) {
            stopTimer();
            cancelRestNotification();
          }
          navigation.reset({ index: 0, routes: [{ name: 'StartWorkout' }] });
        },
      },
    ]);
  };

  const todayFormatted = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const timerProgress = totalDuration > 0 ? 1 - secondsRemaining / totalDuration : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleDiscard} style={staticStyles.headerSide}>
          <Ionicons name="close" size={26} color={colors.destructive} />
        </Pressable>
        <View style={staticStyles.headerCenter}>
          <Text style={styles.headerTitle}>{splitLabel}</Text>
          <Text style={styles.headerDate}>{todayFormatted}</Text>
        </View>
        <Pressable onPress={handleFinishWorkout} style={staticStyles.finishButton}>
          <Text style={styles.finishButtonText}>Finish</Text>
        </Pressable>
      </View>

      <ScrollView
        style={staticStyles.scrollView}
        contentContainerStyle={[
          staticStyles.scrollContent,
          (isRunning || showRestComplete) && { paddingBottom: 120 },
        ]}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={() => Keyboard.dismiss()}
      >
        {exercises.length === 0 ? (
          <View style={staticStyles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyStateTitle}>No exercises yet</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add your first exercise to get started
            </Text>
            <Pressable style={styles.emptyAddButton} onPress={handleAddExercise}>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={staticStyles.emptyAddButtonText}>Add Exercise</Text>
            </Pressable>
          </View>
        ) : (
          <>
            {exercises.map((exercise, exIdx) => (
              <View key={exercise.exerciseId} style={styles.exerciseCard}>
                <View style={staticStyles.exerciseHeader}>
                  <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                  <Pressable onPress={() => removeExercise(exIdx)} hitSlop={8}>
                    <Ionicons name="close-circle" size={22} color={colors.destructive} />
                  </Pressable>
                </View>

                <View style={staticStyles.setHeaderRow}>
                  <View style={{ width: 30 }} />
                  <Text style={styles.setHeaderLabel}>Set</Text>
                  <Text style={styles.setHeaderLabel}>Weight (lb)</Text>
                  <Text style={styles.setHeaderLabel}>Reps</Text>
                  <View style={{ width: 28 }} />
                </View>

                {exercise.sets.map((set, setIdx) => {
                  const key = `${exIdx}-${setIdx}`;
                  const isComplete = completedSets.has(key);
                  const prevPerf = lastPerformance.get(exercise.exerciseId);
                  const prevSet = prevPerf?.find((p) => p.set_number === setIdx + 1);
                  return (
                    <View key={setIdx}>
                      <View style={[staticStyles.setRow, isComplete && styles.completedSetRow]}>
                        <Pressable onPress={() => toggleSetComplete(exIdx, setIdx)} hitSlop={6}>
                          <Ionicons
                            name={isComplete ? 'checkmark-circle' : 'checkmark-circle-outline'}
                            size={22}
                            color={isComplete ? colors.success : colors.textSecondary}
                          />
                        </Pressable>
                        <Text style={[styles.setNumber, isComplete && { color: colors.success }]}>
                          {setIdx + 1}
                        </Text>

                        <View style={[staticStyles.inputGroup, isComplete && { opacity: 0.6 }]}>
                          <Pressable
                            style={styles.incrementButton}
                            onPress={() => incrementWeight(exIdx, setIdx, -5)}
                            disabled={isComplete}
                          >
                            <Text style={styles.incrementText}>-</Text>
                          </Pressable>
                          <TextInput
                            style={styles.weightInput}
                            value={set.weight}
                            onChangeText={(v) => updateSet(exIdx, setIdx, 'weight', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            selectTextOnFocus
                            editable={!isComplete}
                          />
                          <Pressable
                            style={styles.incrementButton}
                            onPress={() => incrementWeight(exIdx, setIdx, 5)}
                            disabled={isComplete}
                          >
                            <Text style={styles.incrementText}>+</Text>
                          </Pressable>
                        </View>

                        <View style={[staticStyles.inputGroup, isComplete && { opacity: 0.6 }]}>
                          <Pressable
                            style={styles.incrementButton}
                            onPress={() => incrementReps(exIdx, setIdx, -1)}
                            disabled={isComplete}
                          >
                            <Text style={styles.incrementText}>-</Text>
                          </Pressable>
                          <TextInput
                            style={styles.repsInput}
                            value={set.reps}
                            onChangeText={(v) => updateSet(exIdx, setIdx, 'reps', v)}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor={colors.textTertiary}
                            selectTextOnFocus
                            editable={!isComplete}
                          />
                          <Pressable
                            style={styles.incrementButton}
                            onPress={() => incrementReps(exIdx, setIdx, 1)}
                            disabled={isComplete}
                          >
                            <Text style={styles.incrementText}>+</Text>
                          </Pressable>
                        </View>

                        <Pressable
                          onPress={() => removeSet(exIdx, setIdx)}
                          hitSlop={8}
                          style={staticStyles.deleteSetButton}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                        </Pressable>
                      </View>
                      {prevSet && (
                        <Text style={styles.prevPerformance}>
                          prev: {prevSet.weight} × {prevSet.reps}
                        </Text>
                      )}
                    </View>
                  );
                })}

                <Pressable
                  style={staticStyles.addSetButton}
                  onPress={() => addSetToExercise(exIdx)}
                >
                  <Ionicons name="add" size={18} color={colors.primary} />
                  <Text style={styles.addSetText}>Add Set</Text>
                </Pressable>
              </View>
            ))}

            <Pressable style={styles.addExerciseButton} onPress={handleAddExercise}>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
              <Text style={styles.addExerciseText}>Add Exercise</Text>
            </Pressable>

            <Pressable style={styles.finishWorkoutButton} onPress={handleFinishWorkout}>
              <Text style={staticStyles.finishWorkoutButtonText}>Finish Workout</Text>
            </Pressable>
          </>
        )}
      </ScrollView>

      {/* Timer Bar */}
      <Animated.View
        style={[
          styles.timerBar,
          { transform: [{ translateY: timerSlideAnim }] },
        ]}
        pointerEvents={isRunning || showRestComplete ? 'auto' : 'none'}
      >
        {/* Progress track */}
        <View style={styles.timerProgressTrack}>
          <View style={[styles.timerProgressFill, { width: `${timerProgress * 100}%` }]} />
        </View>

        {showRestComplete && !isRunning ? (
          <View style={staticStyles.timerContent}>
            <Text style={[styles.restCompleteText]}>Rest Complete!</Text>
          </View>
        ) : (
          <View style={staticStyles.timerContent}>
            <View style={staticStyles.timerTopRow}>
              <Text style={styles.timerCountdown}>{formatTime(secondsRemaining)}</Text>
              <Text style={styles.timerLabel}>Resting...</Text>
            </View>
            <View style={staticStyles.timerControls}>
              <Pressable
                style={styles.timerControlButton}
                onPress={() => adjustTime(-30)}
              >
                <Text style={styles.timerControlText}>-30s</Text>
              </Pressable>
              <Pressable
                style={styles.timerControlButton}
                onPress={() => adjustTime(30)}
              >
                <Text style={styles.timerControlText}>+30s</Text>
              </Pressable>
              <Pressable
                style={styles.timerSkipButton}
                onPress={handleSkipTimer}
              >
                <Text style={styles.timerSkipText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        )}
      </Animated.View>

      <Modal
        visible={templateModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTemplateModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setTemplateModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Save as Template</Text>
            <TextInput
              style={styles.modalInput}
              value={templateName}
              onChangeText={setTemplateName}
              placeholder="Template name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              selectTextOnFocus
            />
            <View style={staticStyles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setTemplateModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveTemplate}
              >
                <Text style={staticStyles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  headerSide: {
    width: 60,
  },
  headerCenter: {
    alignItems: 'center',
    flex: 1,
  },
  finishButton: {
    width: 60,
    alignItems: 'flex-end',
  },
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
  },
  emptyAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
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
    marginBottom: 8,
    gap: 4,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    gap: 4,
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
  finishWorkoutButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
  timerContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timerTopRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
    marginBottom: 8,
  },
  timerControls: {
    flexDirection: 'row',
    gap: 10,
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
  headerDate: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  finishButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.primary,
  },
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
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginTop: 24,
    gap: 8,
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
  setNumber: {
    width: 20,
    fontSize: 15,
    fontWeight: '600',
    color: colors.textSecondary,
    textAlign: 'center',
  },
  completedSetRow: {
    backgroundColor: colors.success + '10',
    borderRadius: 8,
    paddingVertical: 2,
    paddingHorizontal: 4,
    marginHorizontal: -4,
  },
  incrementButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  incrementText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    lineHeight: 20,
  },
  weightInput: {
    width: 56,
    height: 36,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  repsInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 8,
    textAlign: 'center',
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  prevPerformance: {
    fontSize: 11,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: 6,
    marginTop: -4,
  },
  addSetText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 12,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  addExerciseText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  finishWorkoutButton: {
    backgroundColor: colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  // Timer bar styles
  timerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  timerProgressTrack: {
    height: 3,
    backgroundColor: colors.separator,
  },
  timerProgressFill: {
    height: 3,
    backgroundColor: colors.primary,
  },
  timerCountdown: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text,
  },
  timerLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  timerControlButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  timerControlText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  timerSkipButton: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  timerSkipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  restCompleteText: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.success,
    textAlign: 'center',
    paddingVertical: 8,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 10,
    paddingHorizontal: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  modalButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
});
