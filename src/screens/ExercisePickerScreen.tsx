import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlatList,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import { Exercise, ExerciseWithMuscleGroup, MuscleGroup } from '../types';
import {
  getAllMuscleGroups,
  getExercisesByMuscleGroup,
  searchExercises,
} from '../database/services';
import { useTheme, ThemeColors } from '../theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExercisePicker'>;

interface Section {
  title: string;
  data: Exercise[];
}

export default function ExercisePickerScreen({ navigation, route }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { muscleGroupIds, alreadyAddedIds } = route.params;
  const alreadyAddedSet = new Set(alreadyAddedIds);

  const [sections, setSections] = useState<Section[]>([]);
  const [showAll, setShowAll] = useState(muscleGroupIds.length === 0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseWithMuscleGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadExercises = useCallback(() => {
    const allGroups: MuscleGroup[] = getAllMuscleGroups();
    const groupsToShow = showAll
      ? allGroups
      : allGroups.filter((g) => muscleGroupIds.includes(g.id));

    const newSections: Section[] = groupsToShow
      .map((mg) => ({
        title: mg.name,
        data: getExercisesByMuscleGroup(mg.id),
      }))
      .filter((s) => s.data.length > 0);

    setSections(newSections);
  }, [muscleGroupIds, showAll]);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setIsSearching(true);
      let results = searchExercises(text.trim());
      if (!showAll && muscleGroupIds.length > 0) {
        results = results.filter((e) => muscleGroupIds.includes(e.muscle_group_id));
      }
      setSearchResults(results);
    }, 300);
  };

  const selectExercise = (exerciseId: number, exerciseName: string) => {
    if (alreadyAddedSet.has(exerciseId)) return;
    navigation.navigate('ActiveWorkout', {
      ...route.params,
      selectedExercise: { id: exerciseId, name: exerciseName },
    } as any);
  };

  const renderExerciseItem = (exercise: Exercise, isAdded: boolean) => (
    <Pressable
      key={exercise.id}
      style={[styles.exerciseRow, isAdded && staticStyles.exerciseRowDisabled]}
      onPress={() => selectExercise(exercise.id, exercise.name)}
      disabled={isAdded}
    >
      <Text style={[styles.exerciseName, isAdded && styles.exerciseNameDisabled]}>
        {exercise.name}
      </Text>
      {isAdded && <Ionicons name="checkmark-circle" size={20} color={colors.textSecondary} />}
    </Pressable>
  );

  const renderSearchItem = ({ item }: { item: ExerciseWithMuscleGroup }) => {
    const isAdded = alreadyAddedSet.has(item.id);
    return (
      <Pressable
        style={[styles.exerciseRow, isAdded && staticStyles.exerciseRowDisabled]}
        onPress={() => selectExercise(item.id, item.name)}
        disabled={isAdded}
      >
        <View>
          <Text style={[styles.exerciseName, isAdded && styles.exerciseNameDisabled]}>
            {item.name}
          </Text>
          <Text style={styles.muscleGroupLabel}>{item.muscle_group_name}</Text>
        </View>
        {isAdded && <Ionicons name="checkmark-circle" size={20} color={colors.textSecondary} />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={staticStyles.backButton}>
          <Ionicons name="close" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Select Exercise</Text>
        <View style={staticStyles.backButton} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textSecondary} style={staticStyles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={handleSearchChange}
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
        />
      </View>

      {muscleGroupIds.length > 0 && (
        <Pressable style={styles.browseAllToggle} onPress={() => setShowAll((v) => !v)}>
          <Text style={styles.browseAllText}>
            {showAll ? 'Show split only' : 'Browse all muscle groups'}
          </Text>
          <Ionicons
            name={showAll ? 'contract-outline' : 'expand-outline'}
            size={18}
            color={colors.primary}
          />
        </Pressable>
      )}

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
              <Text style={styles.emptyStateText}>No exercises found</Text>
            </View>
          }
          contentContainerStyle={searchResults.length === 0 ? staticStyles.emptyListContent : staticStyles.listContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={({ section }) => (
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionHeaderText}>{section.title}</Text>
            </View>
          )}
          renderItem={({ item }) => renderExerciseItem(item, alreadyAddedSet.has(item.id))}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={staticStyles.listContent}
          keyboardShouldPersistTaps="handled"
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
        />
      )}
    </View>
  );
}

const staticStyles = StyleSheet.create({
  backButton: {
    width: 40,
    alignItems: 'center',
  },
  searchIcon: {
    marginRight: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  exerciseRowDisabled: {
    opacity: 0.5,
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.searchBackground,
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: colors.text,
  },
  browseAllToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  browseAllText: {
    fontSize: 15,
    color: colors.primary,
    fontWeight: '500',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  exerciseName: {
    fontSize: 16,
    color: colors.text,
  },
  exerciseNameDisabled: {
    color: colors.textSecondary,
  },
  muscleGroupLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: colors.textSecondary,
    marginTop: 12,
  },
});
