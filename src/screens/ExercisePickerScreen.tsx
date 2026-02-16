import { useCallback, useEffect, useRef, useState } from 'react';
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

type Props = NativeStackScreenProps<WorkoutStackParamList, 'ExercisePicker'>;

interface Section {
  title: string;
  data: Exercise[];
}

export default function ExercisePickerScreen({ navigation, route }: Props) {
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
      style={[styles.exerciseRow, isAdded && styles.exerciseRowDisabled]}
      onPress={() => selectExercise(exercise.id, exercise.name)}
      disabled={isAdded}
    >
      <Text style={[styles.exerciseName, isAdded && styles.exerciseNameDisabled]}>
        {exercise.name}
      </Text>
      {isAdded && <Ionicons name="checkmark-circle" size={20} color="#8E8E93" />}
    </Pressable>
  );

  const renderSearchItem = ({ item }: { item: ExerciseWithMuscleGroup }) => {
    const isAdded = alreadyAddedSet.has(item.id);
    return (
      <Pressable
        style={[styles.exerciseRow, isAdded && styles.exerciseRowDisabled]}
        onPress={() => selectExercise(item.id, item.name)}
        disabled={isAdded}
      >
        <View>
          <Text style={[styles.exerciseName, isAdded && styles.exerciseNameDisabled]}>
            {item.name}
          </Text>
          <Text style={styles.muscleGroupLabel}>{item.muscle_group_name}</Text>
        </View>
        {isAdded && <Ionicons name="checkmark-circle" size={20} color="#8E8E93" />}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="close" size={28} color="#007AFF" />
        </Pressable>
        <Text style={styles.headerTitle}>Select Exercise</Text>
        <View style={styles.backButton} />
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor="#8E8E93"
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
            color="#007AFF"
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
              <Ionicons name="search-outline" size={48} color="#C7C7CC" />
              <Text style={styles.emptyStateText}>No exercises found</Text>
            </View>
          }
          contentContainerStyle={searchResults.length === 0 ? styles.emptyListContent : styles.listContent}
          keyboardShouldPersistTaps="handled"
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
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  backButton: {
    width: 40,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#000',
  },
  browseAllToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  browseAllText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  sectionHeader: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  sectionHeaderText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  exerciseRowDisabled: {
    opacity: 0.5,
  },
  exerciseName: {
    fontSize: 16,
    color: '#000',
  },
  exerciseNameDisabled: {
    color: '#8E8E93',
  },
  muscleGroupLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 12,
  },
});
