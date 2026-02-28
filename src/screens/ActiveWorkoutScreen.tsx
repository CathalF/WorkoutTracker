import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
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
import { createWorkout, addSet, getExerciseMuscleGroupId, createTemplate, getLastPerformance, getExerciseRestTime, setExerciseRestTime, clearExerciseRestTime, DEFAULT_REST_SECONDS, checkForWeightPR, checkForRepsPR, savePR } from '../database/services';
import { LastPerformanceSet } from '../types';
import { useTheme, ThemeColors } from '../theme';
import useRestTimer from '../hooks/useRestTimer';
import { scheduleRestNotification, cancelRestNotification, handleWorkoutCompleted } from '../utils/notifications';
import { refreshQuickActions } from '../utils/quickActions';
import { updateWidget } from '../utils/widgetBridge';
import { consumePendingExercise } from '../utils/exerciseSelection';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ActiveWorkout'>;

interface SetEntry {
  weight: string;
  reps: string;
}

interface ActiveExercise {
  exerciseId: number;
  exerciseName: string;
  sets: SetEntry[];
  notes?: string;
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
  const origMuscleGroupIdRef = useRef(muscleGroupId);
  const origSplitLabelRef = useRef(splitLabel);
  const origMuscleGroupIdsRef = useRef(muscleGroupIds);
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

  // Rest time modal state
  const [restTimeModalExercise, setRestTimeModalExercise] = useState<{ index: number; id: number; name: string } | null>(null);
  const [restTimeModalValue, setRestTimeModalValue] = useState(DEFAULT_REST_SECONDS);

  // PR detection state
  const [prModalData, setPrModalData] = useState<{
    exerciseName: string;
    prType: 'weight' | 'reps';
    weight: number;
    reps: number;
  } | null>(null);
  const [sessionPRKeys, setSessionPRKeys] = useState<Set<string>>(new Set());
  const prIconScale = useRef(new Animated.Value(0)).current;

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

  // PR trophy icon animation
  useEffect(() => {
    if (prModalData) {
      prIconScale.setValue(0);
      Animated.sequence([
        Animated.spring(prIconScale, {
          toValue: 1.2,
          useNativeDriver: true,
          tension: 100,
          friction: 6,
        }),
        Animated.spring(prIconScale, {
          toValue: 1.0,
          useNativeDriver: true,
          tension: 80,
          friction: 8,
        }),
      ]).start();
    } else {
      prIconScale.setValue(0);
    }
  }, [prModalData, prIconScale]);

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

  // Detect new exercise selection from ExercisePicker (via shared ref + goBack)
  useFocusEffect(
    useCallback(() => {
      const selected = consumePendingExercise();
      if (!selected) return;

      setExercises((prev) => {
        if (prev.some((e) => e.exerciseId === selected.id)) return prev;
        return [
          ...prev,
          {
            exerciseId: selected.id,
            exerciseName: selected.name,
            sets: [{ weight: '', reps: '' }],
          },
        ];
      });

      // Fetch previous performance and rest time for newly added exercise
      const perf = getLastPerformance(selected.id);
      if (perf.length > 0) {
        setLastPerformance((prev) => new Map(prev).set(selected.id, perf));
      }
      setRestTimes((prev) => new Map(prev).set(selected.id, getExerciseRestTime(selected.id)));
    }, [])
  );

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

  const moveExercise = (fromIndex: number, toIndex: number) => {
    if (toIndex < 0 || toIndex >= exercises.length) return;
    setExercises((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });
    // Re-index completed sets
    setCompletedSets((prev) => {
      const remapped = new Set<string>();
      for (const k of prev) {
        const [exI, sI] = k.split('-').map(Number);
        let newExI = exI;
        if (exI === fromIndex) {
          newExI = toIndex;
        } else if (fromIndex < toIndex && exI > fromIndex && exI <= toIndex) {
          newExI = exI - 1;
        } else if (fromIndex > toIndex && exI >= toIndex && exI < fromIndex) {
          newExI = exI + 1;
        }
        remapped.add(`${newExI}-${sI}`);
      }
      return remapped;
    });
  };

  const updateExerciseNotes = (exerciseIndex: number, notes: string) => {
    setExercises((prev) => {
      const updated = [...prev];
      updated[exerciseIndex] = { ...updated[exerciseIndex], notes };
      return updated;
    });
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

    // PR detection
    const exerciseId = exercises[exIdx].exerciseId;
    const exerciseName = exercises[exIdx].exerciseName;
    const today = new Date().toISOString().split('T')[0];

    const weightPRKey = `${exerciseId}-weight`;
    const repsPRKey = `${exerciseId}-reps-${w}`;

    if (!sessionPRKeys.has(weightPRKey) && checkForWeightPR(exerciseId, w, r)) {
      savePR(exerciseId, 'weight', w, r, today);
      setSessionPRKeys((prev) => new Set(prev).add(weightPRKey));
      setPrModalData({ exerciseName, prType: 'weight', weight: w, reps: r });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else if (!sessionPRKeys.has(repsPRKey) && checkForRepsPR(exerciseId, w, r)) {
      savePR(exerciseId, 'reps', w, r, today);
      setSessionPRKeys((prev) => new Set(prev).add(repsPRKey));
      setPrModalData({ exerciseName, prType: 'reps', weight: w, reps: r });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

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

  const openRestTimeModal = (exIdx: number) => {
    const ex = exercises[exIdx];
    const currentRest = restTimes.get(ex.exerciseId) ?? DEFAULT_REST_SECONDS;
    setRestTimeModalExercise({ index: exIdx, id: ex.exerciseId, name: ex.exerciseName });
    setRestTimeModalValue(currentRest);
  };

  const handleSaveRestTime = () => {
    if (!restTimeModalExercise) return;
    setExerciseRestTime(restTimeModalExercise.id, restTimeModalValue);
    setRestTimes((prev) => new Map(prev).set(restTimeModalExercise.id, restTimeModalValue));
    setRestTimeModalExercise(null);
  };

  const handleClearRestTime = () => {
    if (!restTimeModalExercise) return;
    clearExerciseRestTime(restTimeModalExercise.id);
    setRestTimes((prev) => new Map(prev).set(restTimeModalExercise.id, DEFAULT_REST_SECONDS));
    setRestTimeModalValue(DEFAULT_REST_SECONDS);
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
      muscleGroupId || origMuscleGroupIdRef.current || getExerciseMuscleGroupId(exercises[0].exerciseId);
    if (!resolvedMuscleGroupId) {
      Alert.alert('Error', 'Could not determine workout muscle group.');
      return;
    }
    // Collect exercise notes
    const notesLines = exercises
      .filter((ex) => ex.notes?.trim())
      .map((ex) => `${ex.exerciseName}: ${ex.notes!.trim()}`);
    const workoutNotes = notesLines.length > 0 ? notesLines.join('\n') : undefined;

    const workoutId = createWorkout(today, resolvedMuscleGroupId, workoutNotes);

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
    handleWorkoutCompleted();
    updateWidget();
    refreshQuickActions();

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

    const resolvedMgId = muscleGroupId || origMuscleGroupIdRef.current || getExerciseMuscleGroupId(exercises[0].exerciseId);
    if (!resolvedMgId) {
      Alert.alert('Error', 'Could not determine workout muscle group.');
      return;
    }
    const resolvedSplitLabel = splitLabel || origSplitLabelRef.current || 'Custom';
    const resolvedMgIds = muscleGroupIds?.length > 0 ? muscleGroupIds : origMuscleGroupIdsRef.current;
    createTemplate(name, resolvedMgId, resolvedSplitLabel, resolvedMgIds, templateExercises);

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
                  <View style={staticStyles.exerciseTitleRow}>
                    <Text style={styles.exerciseTitle}>{exercise.exerciseName}</Text>
                    <Text style={styles.restTimeLabel}>
                      Rest: {formatTime(restTimes.get(exercise.exerciseId) ?? DEFAULT_REST_SECONDS)}
                    </Text>
                  </View>
                  <View style={staticStyles.exerciseActions}>
                    <Pressable
                      onPress={() => moveExercise(exIdx, exIdx - 1)}
                      hitSlop={6}
                      disabled={exIdx === 0}
                      style={{ opacity: exIdx === 0 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-up" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable
                      onPress={() => moveExercise(exIdx, exIdx + 1)}
                      hitSlop={6}
                      disabled={exIdx === exercises.length - 1}
                      style={{ opacity: exIdx === exercises.length - 1 ? 0.3 : 1 }}
                    >
                      <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => openRestTimeModal(exIdx)} hitSlop={8}>
                      <Ionicons name="timer-outline" size={18} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable onPress={() => removeExercise(exIdx)} hitSlop={8}>
                      <Ionicons name="close-circle" size={22} color={colors.destructive} />
                    </Pressable>
                  </View>
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

                {/* Notes section */}
                {exercise.notes !== undefined ? (
                  <View style={staticStyles.notesSection}>
                    <TextInput
                      style={styles.notesInput}
                      value={exercise.notes}
                      onChangeText={(v) => updateExerciseNotes(exIdx, v)}
                      placeholder="e.g., Felt heavy today, use lighter weight next time"
                      placeholderTextColor={colors.textTertiary}
                      multiline
                      numberOfLines={2}
                    />
                    <Pressable onPress={() => {
                      setExercises((prev) => {
                        const updated = [...prev];
                        const ex = { ...updated[exIdx] };
                        delete ex.notes;
                        updated[exIdx] = ex;
                        return updated;
                      });
                    }}>
                      <Text style={styles.removeNoteLink}>Remove note</Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    style={staticStyles.addNoteButton}
                    onPress={() => updateExerciseNotes(exIdx, '')}
                  >
                    <Ionicons name="create-outline" size={14} color={colors.textSecondary} />
                    <Text style={styles.addNoteText}>Add note</Text>
                  </Pressable>
                )}

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

      {/* Rest Time Settings Modal */}
      <Modal
        visible={restTimeModalExercise !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setRestTimeModalExercise(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRestTimeModalExercise(null)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              Rest Time
            </Text>
            <Text style={styles.restTimeModalSubtitle} numberOfLines={1}>
              {restTimeModalExercise?.name}
            </Text>

            <Text style={styles.restTimeModalDisplay}>
              {formatTime(restTimeModalValue)}
            </Text>

            <View style={staticStyles.restTimePresets}>
              {[30, 60, 90, 120, 180, 300].map((s) => (
                <Pressable
                  key={s}
                  style={[
                    styles.restTimePresetButton,
                    restTimeModalValue === s && styles.restTimePresetActive,
                  ]}
                  onPress={() => setRestTimeModalValue(s)}
                >
                  <Text
                    style={[
                      styles.restTimePresetText,
                      restTimeModalValue === s && styles.restTimePresetTextActive,
                    ]}
                  >
                    {formatTime(s)}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={staticStyles.restTimeAdjust}>
              <Pressable
                style={styles.restTimeAdjustButton}
                onPress={() => setRestTimeModalValue((v) => Math.max(15, v - 15))}
              >
                <Text style={styles.timerControlText}>-15s</Text>
              </Pressable>
              <Pressable
                style={styles.restTimeAdjustButton}
                onPress={() => setRestTimeModalValue((v) => v + 15)}
              >
                <Text style={styles.timerControlText}>+15s</Text>
              </Pressable>
            </View>

            <Pressable onPress={handleClearRestTime}>
              <Text style={styles.restTimeDefaultLink}>Use Default ({formatTime(DEFAULT_REST_SECONDS)})</Text>
            </Pressable>

            <View style={staticStyles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRestTimeModalExercise(null)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleSaveRestTime}
              >
                <Text style={staticStyles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

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

      {/* PR Celebration Modal */}
      <Modal
        visible={prModalData !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setPrModalData(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setPrModalData(null)}>
          <Pressable style={styles.prModalContent} onPress={() => {}}>
            <Animated.View style={[staticStyles.prIconContainer, { backgroundColor: colors.warning + '15', transform: [{ scale: prIconScale }] }]}>
              <Ionicons name="trophy" size={56} color={colors.warning} />
            </Animated.View>

            <Text style={styles.prTitle}>New Personal Record!</Text>
            <Text style={styles.prExerciseName}>{prModalData?.exerciseName}</Text>

            <View style={styles.prValueCard}>
              <Text style={styles.prValue}>
                {prModalData?.weight} lbs × {prModalData?.reps} reps
              </Text>
              <Text style={styles.prTypeLabel}>
                {prModalData?.prType === 'weight' ? 'Weight PR' : 'Rep PR'}
              </Text>
            </View>

            <Pressable style={styles.prDismissButton} onPress={() => setPrModalData(null)}>
              <Text style={staticStyles.prDismissText}>Keep Going!</Text>
            </Pressable>
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
  exerciseTitleRow: {
    flex: 1,
    marginRight: 8,
  },
  exerciseActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
  notesSection: {
    marginTop: 8,
    marginBottom: 4,
  },
  addNoteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 4,
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
  restTimePresets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 12,
  },
  restTimeAdjust: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 12,
  },
  prIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  prDismissText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
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
  },
  restTimeLabel: {
    fontSize: 12,
    color: colors.textTertiary,
    marginTop: 2,
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
  notesInput: {
    borderWidth: 1,
    borderColor: colors.separator,
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    color: colors.text,
    backgroundColor: colors.background,
    minHeight: 52,
    textAlignVertical: 'top',
    marginBottom: 4,
  },
  removeNoteLink: {
    fontSize: 12,
    color: colors.destructive,
    textAlign: 'right',
  },
  addNoteText: {
    fontSize: 13,
    color: colors.textSecondary,
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
  // Rest time modal styles
  restTimeModalSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 16,
  },
  restTimeModalDisplay: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  restTimePresetButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  restTimePresetActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restTimePresetText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  restTimePresetTextActive: {
    color: '#fff',
  },
  restTimeAdjustButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.background,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  restTimeDefaultLink: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 4,
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
  // PR modal styles
  prModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 32,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  prTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  prExerciseName: {
    fontSize: 17,
    color: colors.textSecondary,
    marginBottom: 20,
  },
  prValueCard: {
    width: '100%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  prValue: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text,
  },
  prTypeLabel: {
    fontSize: 13,
    color: colors.warning,
    fontWeight: '600',
    marginTop: 4,
  },
  prDismissButton: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
});
