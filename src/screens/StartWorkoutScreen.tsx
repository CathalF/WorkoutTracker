import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import { MuscleGroup, WorkoutTemplate, Program } from '../types';
import {
  getAllMuscleGroups,
  getAllTemplates,
  getAllPrograms,
  getTemplateWithExercises,
} from '../database/services';
import { useTheme, ThemeColors } from '../theme';

type NavigationProp = NativeStackNavigationProp<WorkoutStackParamList, 'StartWorkout'>;

const WORKOUT_SPLITS = [
  { label: 'Legs', icon: 'fitness-outline' as const, muscleGroupNames: ['Legs'] },
  { label: 'Chest', icon: 'body-outline' as const, muscleGroupNames: ['Chest'] },
  { label: 'Back', icon: 'arrow-back-circle-outline' as const, muscleGroupNames: ['Back'] },
  { label: 'Shoulders', icon: 'man-outline' as const, muscleGroupNames: ['Shoulders'] },
  { label: 'Chest & Biceps', icon: 'barbell-outline' as const, muscleGroupNames: ['Chest', 'Biceps'] },
  { label: 'Shoulders & Triceps', icon: 'barbell-outline' as const, muscleGroupNames: ['Shoulders', 'Triceps'] },
  { label: 'Custom', icon: 'create-outline' as const, muscleGroupNames: [] as string[] },
];

function formatDate(): string {
  const d = new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default function StartWorkoutScreen() {
  const navigation = useNavigation<NavigationProp>();
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);

  useFocusEffect(
    useCallback(() => {
      setMuscleGroups(getAllMuscleGroups());
      setTemplates(getAllTemplates());
      setPrograms(getAllPrograms());
    }, [])
  );

  const handleSplitPress = (split: typeof WORKOUT_SPLITS[number]) => {
    const muscleGroupIds: number[] = [];
    let primaryMuscleGroupId = 0;

    if (split.muscleGroupNames.length === 0) {
      if (muscleGroups.length > 0) {
        primaryMuscleGroupId = muscleGroups[0].id;
      }
    } else {
      for (const name of split.muscleGroupNames) {
        const mg = muscleGroups.find((g) => g.name === name);
        if (mg) muscleGroupIds.push(mg.id);
      }
      primaryMuscleGroupId = muscleGroupIds[0] ?? 0;
    }

    navigation.navigate('ActiveWorkout', {
      workoutId: -1,
      muscleGroupId: primaryMuscleGroupId,
      splitLabel: split.label,
      muscleGroupIds,
    });
  };

  const handleTemplatePress = (template: WorkoutTemplate) => {
    const full = getTemplateWithExercises(template.id);
    if (!full) return;

    navigation.navigate('ActiveWorkout', {
      workoutId: -1,
      muscleGroupId: full.muscle_group_id,
      splitLabel: full.split_label,
      muscleGroupIds: full.muscle_group_ids,
      fromTemplate: {
        templateId: full.id,
        exercises: full.exercises.map((e) => ({
          exerciseId: e.exercise_id,
          exerciseName: e.exercise_name,
          defaultSets: e.default_sets,
        })),
      },
    });
  };

  const getTemplateExerciseCount = (template: WorkoutTemplate): number => {
    const full = getTemplateWithExercises(template.id);
    return full?.exercises.length ?? 0;
  };

  // Group templates by program
  const groupedTemplates = useMemo(() => {
    if (programs.length === 0) return null;

    const groups: { program: Program | null; templates: WorkoutTemplate[] }[] = [];

    for (const program of programs) {
      const programTemplates = templates.filter((t) => t.program_id === program.id);
      if (programTemplates.length > 0) {
        groups.push({ program, templates: programTemplates });
      }
    }

    const unassigned = templates.filter((t) => t.program_id === null);
    if (unassigned.length > 0) {
      groups.push({ program: null, templates: unassigned });
    }

    return groups.length > 0 ? groups : null;
  }, [templates, programs]);

  // Build split rows for the 2-column grid
  const splitRows = useMemo(() => {
    const rows: (typeof WORKOUT_SPLITS[number])[][] = [];
    for (let i = 0; i < WORKOUT_SPLITS.length; i += 2) {
      rows.push(WORKOUT_SPLITS.slice(i, i + 2));
    }
    return rows;
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Start Workout</Text>
        <Text style={styles.subtitle}>{formatDate()}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {templates.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>My Templates</Text>
              <Pressable onPress={() => navigation.navigate('TemplateManagement')}>
                <Text style={styles.manageLink}>Manage</Text>
              </Pressable>
            </View>

            {groupedTemplates ? (
              groupedTemplates.map((group) => (
                <View key={group.program?.id ?? 'unassigned'}>
                  <Text style={styles.programLabel}>
                    {group.program?.name ?? 'Other'}
                  </Text>
                  {group.templates.map((template) => (
                    <Pressable
                      key={template.id}
                      style={({ pressed }) => [styles.templateCard, pressed && styles.cardPressed]}
                      onPress={() => handleTemplatePress(template)}
                    >
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={styles.templateMeta}>
                        {getTemplateExerciseCount(template)} exercises · {template.split_label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ))
            ) : (
              templates.map((template) => (
                <Pressable
                  key={template.id}
                  style={({ pressed }) => [styles.templateCard, pressed && styles.cardPressed]}
                  onPress={() => handleTemplatePress(template)}
                >
                  <Text style={styles.templateName}>{template.name}</Text>
                  <Text style={styles.templateMeta}>
                    {getTemplateExerciseCount(template)} exercises · {template.split_label}
                  </Text>
                </Pressable>
              ))
            )}

            <View style={styles.divider} />
            <Text style={styles.scratchLabel}>Or start from scratch</Text>
          </>
        )}

        {splitRows.map((row, rowIdx) => (
          <View key={rowIdx} style={styles.splitRow}>
            {row.map((split) => (
              <Pressable
                key={split.label}
                style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
                onPress={() => handleSplitPress(split)}
              >
                <Ionicons name={split.icon} size={32} color={colors.primary} />
                <Text style={styles.cardLabel}>{split.label}</Text>
              </Pressable>
            ))}
            {row.length === 1 && <View style={styles.cardPlaceholder} />}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: colors.surface,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 4,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  manageLink: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  programLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  templateName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  templateMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.separator,
    marginVertical: 20,
  },
  scratchLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 12,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  cardPlaceholder: {
    flex: 1,
    marginHorizontal: 6,
  },
  cardPressed: {
    backgroundColor: colors.pressed,
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginTop: 8,
    textAlign: 'center',
  },
});
