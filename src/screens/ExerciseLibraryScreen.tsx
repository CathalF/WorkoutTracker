import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise, ExerciseWithMuscleGroup, MuscleGroup } from '../types';
import {
  addCustomExercise,
  deleteCustomExercise,
  getAllMuscleGroups,
  getExercisesByMuscleGroup,
  searchExercises,
} from '../database/services';
import { useTheme, ThemeColors } from '../theme';

interface Section {
  title: string;
  count: number;
  muscleGroupId: number;
  data: Exercise[];
}

export default function ExerciseLibraryScreen({ navigation }: { navigation: any }) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sections, setSections] = useState<Section[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseWithMuscleGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [newExerciseName, setNewExerciseName] = useState('');
  const [selectedMuscleGroupId, setSelectedMuscleGroupId] = useState<number | null>(null);
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);

  const loadData = useCallback(() => {
    const groups: MuscleGroup[] = getAllMuscleGroups();
    setMuscleGroups(groups);
    const newSections: Section[] = groups.map((mg) => {
      const exercises = getExercisesByMuscleGroup(mg.id);
      return {
        title: mg.name,
        count: exercises.length,
        muscleGroupId: mg.id,
        data: exercises,
      };
    });
    setSections(newSections);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const openAddModal = useCallback(() => {
    setNewExerciseName('');
    setSelectedMuscleGroupId(null);
    setModalVisible(true);
  }, []);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={openAddModal}
          style={staticStyles.headerButton}
        >
          <Ionicons name="add" size={28} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, openAddModal, colors.primary]);

  const handleAddExercise = () => {
    const trimmedName = newExerciseName.trim();
    if (trimmedName === '') {
      Alert.alert('Validation Error', 'Please enter an exercise name.');
      return;
    }
    if (selectedMuscleGroupId === null) {
      Alert.alert('Validation Error', 'Please select a muscle group.');
      return;
    }

    addCustomExercise(trimmedName, selectedMuscleGroupId);
    setModalVisible(false);
    setNewExerciseName('');
    setSelectedMuscleGroupId(null);
    loadData();

    if (isSearching && searchQuery.trim() !== '') {
      const results = searchExercises(searchQuery.trim());
      setSearchResults(results);
    }
  };

  const handleDeleteExercise = (exercise: Exercise) => {
    if (exercise.is_custom !== 1) {
      return;
    }

    Alert.alert(
      'Delete Exercise',
      `Are you sure you want to delete "${exercise.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCustomExercise(exercise.id);
            loadData();

            if (isSearching && searchQuery.trim() !== '') {
              const results = searchExercises(searchQuery.trim());
              setSearchResults(results);
            }
          },
        },
      ]
    );
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(text);

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (text.trim() === '') {
      setIsSearching(false);
      setSearchResults([]);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setIsSearching(true);
      const results = searchExercises(text.trim());
      setSearchResults(results);
    }, 300);
  };

  const toggleSection = (muscleGroupId: number) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(muscleGroupId)) {
        next.delete(muscleGroupId);
      } else {
        next.add(muscleGroupId);
      }
      return next;
    });
  };

  const renderSectionHeader = ({ section }: { section: Section }) => {
    const isCollapsed = collapsedIds.has(section.muscleGroupId);
    return (
      <Pressable
        style={styles.sectionHeader}
        onPress={() => toggleSection(section.muscleGroupId)}
      >
        <View style={staticStyles.sectionHeaderLeft}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={18}
            color={colors.primary}
          />
          <Text style={styles.sectionHeaderText}>{section.title}</Text>
        </View>
        <Text style={styles.sectionHeaderCount}>{section.count}</Text>
      </Pressable>
    );
  };

  const renderSectionItem = ({ item, section }: { item: Exercise; section: Section }) => {
    if (collapsedIds.has(section.muscleGroupId)) {
      return null;
    }

    return (
      <Pressable
        style={styles.exerciseRow}
        onLongPress={() => handleDeleteExercise(item)}
      >
        <Text style={styles.exerciseName}>{item.name}</Text>
        {item.is_custom === 1 && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>Custom</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderSearchItem = ({ item }: { item: ExerciseWithMuscleGroup }) => {
    return (
      <Pressable
        style={styles.exerciseRow}
        onLongPress={() => handleDeleteExercise(item)}
      >
        <View>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.muscleGroupLabel}>{item.muscle_group_name}</Text>
        </View>
        {item.is_custom === 1 && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>Custom</Text>
          </View>
        )}
      </Pressable>
    );
  };

  const renderEmptySearch = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color={colors.textTertiary} />
      <Text style={styles.emptyStateText}>No exercises found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
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

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          ListEmptyComponent={renderEmptySearch}
          contentContainerStyle={searchResults.length === 0 ? staticStyles.emptyListContent : staticStyles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderSectionItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={staticStyles.listContent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={15}
          windowSize={5}
        />
      )}

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Custom Exercise</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Exercise name"
              placeholderTextColor={colors.textSecondary}
              value={newExerciseName}
              onChangeText={setNewExerciseName}
              autoCapitalize="words"
              autoFocus={true}
            />

            <Text style={styles.modalLabel}>Select Muscle Group</Text>
            <ScrollView style={staticStyles.muscleGroupList}>
              {muscleGroups.map((mg) => (
                <Pressable
                  key={mg.id}
                  style={[
                    staticStyles.muscleGroupOption,
                    selectedMuscleGroupId === mg.id && styles.muscleGroupOptionSelected,
                  ]}
                  onPress={() => setSelectedMuscleGroupId(mg.id)}
                >
                  <Text
                    style={[
                      styles.muscleGroupOptionText,
                      selectedMuscleGroupId === mg.id && styles.muscleGroupOptionTextSelected,
                    ]}
                  >
                    {mg.name}
                  </Text>
                  {selectedMuscleGroupId === mg.id && (
                    <Ionicons name="checkmark" size={20} color={colors.primary} />
                  )}
                </Pressable>
              ))}
            </ScrollView>

            <View style={staticStyles.modalButtons}>
              <Pressable
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={styles.modalAddButton}
                onPress={handleAddExercise}
              >
                <Text style={staticStyles.modalAddButtonText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Static styles that don't depend on theme
const staticStyles = StyleSheet.create({
  headerButton: {
    marginRight: 8,
    padding: 4,
  },
  searchIcon: {
    marginRight: 8,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  muscleGroupList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  muscleGroupOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 4,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalAddButtonText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

const createStyles = (colors: ThemeColors) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text,
  },
  sectionHeaderCount: {
    fontSize: 15,
    color: colors.textSecondary,
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
  muscleGroupLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.modalOverlay,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    width: '85%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.text,
    marginBottom: 16,
  },
  modalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 8,
  },
  muscleGroupOptionSelected: {
    backgroundColor: colors.pressed,
  },
  muscleGroupOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  muscleGroupOptionTextSelected: {
    color: colors.primary,
    fontWeight: '600',
  },
  modalCancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  modalAddButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
