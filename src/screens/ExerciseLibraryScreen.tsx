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
import { Exercise, ExerciseWithMuscleGroup, MuscleGroup } from '../types';
import {
  getAllMuscleGroups,
  getExercisesByMuscleGroup,
  searchExercises,
} from '../database/services';

interface Section {
  title: string;
  count: number;
  muscleGroupId: number;
  data: Exercise[];
}

export default function ExerciseLibraryScreen({ navigation }: { navigation: any }) {
  const [sections, setSections] = useState<Section[]>([]);
  const [collapsedIds, setCollapsedIds] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ExerciseWithMuscleGroup[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(() => {
    const muscleGroups: MuscleGroup[] = getAllMuscleGroups();
    const newSections: Section[] = muscleGroups.map((mg) => {
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

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => {
            // Will be wired in Task 6
          }}
          style={styles.headerButton}
        >
          <Ionicons name="add" size={28} color="#007AFF" />
        </Pressable>
      ),
    });
  }, [navigation]);

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
        <View style={styles.sectionHeaderLeft}>
          <Ionicons
            name={isCollapsed ? 'chevron-forward' : 'chevron-down'}
            size={18}
            color="#007AFF"
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
      <View style={styles.exerciseRow}>
        <Text style={styles.exerciseName}>{item.name}</Text>
        {item.is_custom === 1 && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>Custom</Text>
          </View>
        )}
      </View>
    );
  };

  const renderSearchItem = ({ item }: { item: ExerciseWithMuscleGroup }) => {
    return (
      <View style={styles.exerciseRow}>
        <View>
          <Text style={styles.exerciseName}>{item.name}</Text>
          <Text style={styles.muscleGroupLabel}>{item.muscle_group_name}</Text>
        </View>
        {item.is_custom === 1 && (
          <View style={styles.customBadge}>
            <Text style={styles.customBadgeText}>Custom</Text>
          </View>
        )}
      </View>
    );
  };

  const renderEmptySearch = () => (
    <View style={styles.emptyState}>
      <Ionicons name="search-outline" size={48} color="#C7C7CC" />
      <Text style={styles.emptyStateText}>No exercises found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
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

      {isSearching ? (
        <FlatList
          data={searchResults}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSearchItem}
          ListEmptyComponent={renderEmptySearch}
          contentContainerStyle={searchResults.length === 0 ? styles.emptyListContent : styles.listContent}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          renderSectionHeader={renderSectionHeader}
          renderItem={renderSectionItem}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
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
  listContent: {
    paddingBottom: 20,
  },
  emptyListContent: {
    flex: 1,
  },
  headerButton: {
    marginRight: 8,
    padding: 4,
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F2F2F7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C6C6C8',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#000',
  },
  sectionHeaderCount: {
    fontSize: 15,
    color: '#8E8E93',
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
  exerciseName: {
    fontSize: 16,
    color: '#000',
  },
  muscleGroupLabel: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  customBadge: {
    backgroundColor: '#007AFF',
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
    color: '#8E8E93',
    marginTop: 12,
  },
});
