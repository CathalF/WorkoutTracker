import { useCallback, useEffect, useState } from 'react';
import {
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Exercise, MuscleGroup } from '../types';
import {
  getAllMuscleGroups,
  getExercisesByMuscleGroup,
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

  const renderItem = ({ item, section }: { item: Exercise; section: Section }) => {
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

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id.toString()}
        renderSectionHeader={renderSectionHeader}
        renderItem={renderItem}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={styles.listContent}
      />
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
  headerButton: {
    marginRight: 8,
    padding: 4,
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
});
