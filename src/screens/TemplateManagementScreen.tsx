import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
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
import { useFocusEffect } from '@react-navigation/native';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import {
  Program,
  TemplateWithExercises,
  ExerciseWithMuscleGroup,
} from '../types';
import {
  getAllPrograms,
  getAllTemplates,
  getTemplateWithExercises,
  createProgram,
  renameProgram,
  deleteProgram,
  renameTemplate,
  deleteTemplate,
  assignTemplateToProgram,
  addTemplateExercise,
  removeTemplateExercise,
  getAllExercises,
  searchExercises,
} from '../database/services';
import { updateWidget } from '../utils/widgetBridge';
import { useTheme, ThemeColors } from '../theme';

type Props = NativeStackScreenProps<WorkoutStackParamList, 'TemplateManagement'>;

export default function TemplateManagementScreen({ navigation }: Props) {
  const colors = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [programs, setPrograms] = useState<Program[]>([]);
  const [templateDetails, setTemplateDetails] = useState<TemplateWithExercises[]>([]);
  const [expandedTemplateId, setExpandedTemplateId] = useState<number | null>(null);

  // Rename modal state
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const renameTargetRef = useRef<{ type: 'template' | 'program'; id: number } | null>(null);

  // Program picker modal state
  const [programPickerVisible, setProgramPickerVisible] = useState(false);
  const programPickerTemplateRef = useRef<number | null>(null);

  // Exercise picker modal state
  const [exercisePickerVisible, setExercisePickerVisible] = useState(false);
  const exercisePickerTemplateRef = useRef<number | null>(null);
  const [exerciseSearch, setExerciseSearch] = useState('');
  const [allExercises, setAllExercises] = useState<ExerciseWithMuscleGroup[]>([]);
  const [filteredExercises, setFilteredExercises] = useState<ExerciseWithMuscleGroup[]>([]);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadData = useCallback(() => {
    setPrograms(getAllPrograms());
    const templates = getAllTemplates();
    const details: TemplateWithExercises[] = [];
    for (const t of templates) {
      const full = getTemplateWithExercises(t.id);
      if (full) details.push(full);
    }
    setTemplateDetails(details);
    updateWidget();
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // --- Program CRUD ---

  const handleCreateProgram = () => {
    renameTargetRef.current = { type: 'program', id: -1 }; // -1 = new
    setRenameValue('');
    setRenameModalVisible(true);
  };

  const handleRenameProgram = (program: Program) => {
    renameTargetRef.current = { type: 'program', id: program.id };
    setRenameValue(program.name);
    setRenameModalVisible(true);
  };

  const handleDeleteProgram = (program: Program) => {
    Alert.alert(
      'Delete Program?',
      `"${program.name}" will be deleted. Its templates will become unassigned.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteProgram(program.id);
            loadData();
          },
        },
      ]
    );
  };

  // --- Template CRUD ---

  const handleRenameTemplate = (template: TemplateWithExercises) => {
    renameTargetRef.current = { type: 'template', id: template.id };
    setRenameValue(template.name);
    setRenameModalVisible(true);
  };

  const handleDeleteTemplate = (template: TemplateWithExercises) => {
    Alert.alert(
      'Delete Template?',
      `"${template.name}" will be permanently deleted.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteTemplate(template.id);
            if (expandedTemplateId === template.id) setExpandedTemplateId(null);
            loadData();
          },
        },
      ]
    );
  };

  const handleAssignProgram = (templateId: number) => {
    programPickerTemplateRef.current = templateId;
    setProgramPickerVisible(true);
  };

  const handleSelectProgram = (programId: number | null) => {
    if (programPickerTemplateRef.current !== null) {
      assignTemplateToProgram(programPickerTemplateRef.current, programId);
      loadData();
    }
    setProgramPickerVisible(false);
  };

  const handleRemoveExercise = (template: TemplateWithExercises, templateExerciseId: number) => {
    if (template.exercises.length <= 1) {
      Alert.alert('Cannot Remove', 'A template must have at least one exercise.');
      return;
    }
    removeTemplateExercise(templateExerciseId);
    loadData();
  };

  const handleAddExercise = (templateId: number) => {
    exercisePickerTemplateRef.current = templateId;
    setExerciseSearch('');
    const exercises = getAllExercises();
    setAllExercises(exercises);
    setFilteredExercises(exercises);
    setExercisePickerVisible(true);
  };

  const handleExerciseSearchChange = (text: string) => {
    setExerciseSearch(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (text.trim() === '') {
      setFilteredExercises(allExercises);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      setFilteredExercises(searchExercises(text.trim()));
    }, 300);
  };

  const handleSelectExercise = (exercise: ExerciseWithMuscleGroup) => {
    const templateId = exercisePickerTemplateRef.current;
    if (templateId === null) return;

    const template = templateDetails.find((t) => t.id === templateId);
    if (!template) return;

    // Don't add duplicates
    if (template.exercises.some((e) => e.exercise_id === exercise.id)) {
      Alert.alert('Already Added', 'This exercise is already in the template.');
      return;
    }

    const maxSort = template.exercises.reduce((max, e) => Math.max(max, e.sort_order), -1);
    addTemplateExercise(templateId, exercise.id, maxSort + 1, 3);
    setExercisePickerVisible(false);
    loadData();
  };

  // --- Rename modal submit ---

  const handleRenameSubmit = () => {
    const name = renameValue.trim();
    if (!name) return;

    const target = renameTargetRef.current;
    if (!target) return;

    if (target.type === 'program') {
      if (target.id === -1) {
        createProgram(name);
      } else {
        renameProgram(target.id, name);
      }
    } else {
      renameTemplate(target.id, name);
    }

    setRenameModalVisible(false);
    loadData();
  };

  // --- Group templates by program ---

  const grouped = useMemo(() => {
    const result: { program: Program | null; templates: TemplateWithExercises[] }[] = [];

    for (const program of programs) {
      const programTemplates = templateDetails.filter((t) => t.program_id === program.id);
      if (programTemplates.length > 0) {
        result.push({ program, templates: programTemplates });
      }
    }

    const unassigned = templateDetails.filter((t) => t.program_id === null);
    if (unassigned.length > 0) {
      result.push({ program: null, templates: unassigned });
    }

    return result;
  }, [programs, templateDetails]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={styles.headerTitle}>Manage Templates</Text>
        <View style={staticStyles.headerPlaceholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Programs section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Programs</Text>
          <Pressable onPress={handleCreateProgram} hitSlop={8}>
            <Ionicons name="add-circle" size={24} color={colors.primary} />
          </Pressable>
        </View>

        {programs.length === 0 ? (
          <Text style={styles.emptyHint}>No programs yet. Create one to organize templates.</Text>
        ) : (
          programs.map((program) => (
            <View key={program.id} style={styles.programCard}>
              <View style={staticStyles.programRow}>
                <Pressable style={staticStyles.programNameArea} onPress={() => handleRenameProgram(program)}>
                  <Text style={styles.programName}>{program.name}</Text>
                  <Text style={styles.programMeta}>
                    {templateDetails.filter((t) => t.program_id === program.id).length} templates
                  </Text>
                </Pressable>
                <Pressable onPress={() => handleDeleteProgram(program)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.destructive} />
                </Pressable>
              </View>
            </View>
          ))
        )}

        {/* Templates section */}
        <View style={[styles.sectionHeader, staticStyles.templatesSectionHeader]}>
          <Text style={styles.sectionTitle}>Templates</Text>
        </View>

        {templateDetails.length === 0 ? (
          <Text style={styles.emptyHint}>No templates yet. Finish a workout and save it as a template.</Text>
        ) : (
          grouped.map((group) => (
            <View key={group.program?.id ?? 'unassigned'}>
              <Text style={styles.groupLabel}>
                {group.program?.name ?? 'Unassigned'}
              </Text>
              {group.templates.map((template) => {
                const isExpanded = expandedTemplateId === template.id;
                return (
                  <View key={template.id} style={styles.templateCard}>
                    <Pressable
                      style={staticStyles.templateHeader}
                      onPress={() => setExpandedTemplateId(isExpanded ? null : template.id)}
                    >
                      <View style={staticStyles.templateInfo}>
                        <Text style={styles.templateName}>{template.name}</Text>
                        <Text style={styles.templateMeta}>
                          {template.exercises.length} exercises · {template.split_label}
                        </Text>
                      </View>
                      <View style={staticStyles.templateActions}>
                        <Pressable onPress={() => handleRenameTemplate(template)} hitSlop={6}>
                          <Ionicons name="pencil-outline" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleAssignProgram(template.id)} hitSlop={6}>
                          <Ionicons name="folder-outline" size={18} color={colors.primary} />
                        </Pressable>
                        <Pressable onPress={() => handleDeleteTemplate(template)} hitSlop={6}>
                          <Ionicons name="trash-outline" size={18} color={colors.destructive} />
                        </Pressable>
                        <Ionicons
                          name={isExpanded ? 'chevron-up' : 'chevron-down'}
                          size={18}
                          color={colors.textSecondary}
                        />
                      </View>
                    </Pressable>

                    {isExpanded && (
                      <View style={styles.exerciseList}>
                        {template.exercises.map((ex) => (
                          <View key={ex.id} style={staticStyles.exerciseRow}>
                            <View style={staticStyles.exerciseInfo}>
                              <Text style={styles.exerciseName}>{ex.exercise_name}</Text>
                              <Text style={styles.exerciseSets}>{ex.default_sets} sets</Text>
                            </View>
                            <Pressable
                              onPress={() => handleRemoveExercise(template, ex.id)}
                              hitSlop={8}
                            >
                              <Ionicons name="remove-circle-outline" size={20} color={colors.destructive} />
                            </Pressable>
                          </View>
                        ))}
                        <Pressable
                          style={staticStyles.addExerciseRow}
                          onPress={() => handleAddExercise(template.id)}
                        >
                          <Ionicons name="add" size={18} color={colors.primary} />
                          <Text style={styles.addExerciseText}>Add Exercise</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      {/* Rename / Create Program Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setRenameModalVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>
              {renameTargetRef.current?.type === 'program' && renameTargetRef.current.id === -1
                ? 'New Program'
                : renameTargetRef.current?.type === 'program'
                  ? 'Rename Program'
                  : 'Rename Template'}
            </Text>
            <TextInput
              style={styles.modalInput}
              value={renameValue}
              onChangeText={setRenameValue}
              placeholder="Name"
              placeholderTextColor={colors.textTertiary}
              autoFocus
              selectTextOnFocus
            />
            <View style={staticStyles.modalButtons}>
              <Pressable
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.modalSaveButton]}
                onPress={handleRenameSubmit}
              >
                <Text style={staticStyles.modalSaveText}>Save</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Program Picker Modal */}
      <Modal
        visible={programPickerVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setProgramPickerVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setProgramPickerVisible(false)}>
          <Pressable style={styles.modalContent} onPress={() => {}}>
            <Text style={styles.modalTitle}>Assign to Program</Text>
            <Pressable
              style={styles.pickerOption}
              onPress={() => handleSelectProgram(null)}
            >
              <Text style={styles.pickerOptionText}>None (Unassigned)</Text>
            </Pressable>
            {programs.map((program) => (
              <Pressable
                key={program.id}
                style={styles.pickerOption}
                onPress={() => handleSelectProgram(program.id)}
              >
                <Text style={styles.pickerOptionText}>{program.name}</Text>
              </Pressable>
            ))}
            <Pressable
              style={[styles.modalButton, styles.modalCancelButton, staticStyles.pickerCancelButton]}
              onPress={() => setProgramPickerVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Exercise Picker Modal */}
      <Modal
        visible={exercisePickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setExercisePickerVisible(false)}
      >
        <View style={styles.exercisePickerContainer}>
          <View style={styles.exercisePickerHeader}>
            <Pressable onPress={() => setExercisePickerVisible(false)}>
              <Ionicons name="close" size={28} color={colors.primary} />
            </Pressable>
            <Text style={styles.exercisePickerTitle}>Add Exercise</Text>
            <View style={staticStyles.headerPlaceholder} />
          </View>
          <View style={styles.searchContainer}>
            <Ionicons name="search" size={18} color={colors.textSecondary} style={staticStyles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search exercises..."
              placeholderTextColor={colors.textSecondary}
              value={exerciseSearch}
              onChangeText={handleExerciseSearchChange}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <FlatList
            data={filteredExercises}
            keyExtractor={(item) => item.id.toString()}
            renderItem={({ item }) => (
              <Pressable
                style={styles.exercisePickerRow}
                onPress={() => handleSelectExercise(item)}
              >
                <View>
                  <Text style={styles.exercisePickerName}>{item.name}</Text>
                  <Text style={styles.exercisePickerGroup}>{item.muscle_group_name}</Text>
                </View>
              </Pressable>
            )}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={staticStyles.exercisePickerList}
          />
        </View>
      </Modal>
    </View>
  );
}

const staticStyles = StyleSheet.create({
  headerPlaceholder: {
    width: 28,
  },
  templatesSectionHeader: {
    marginTop: 24,
  },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  programNameArea: {
    flex: 1,
  },
  templateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  templateInfo: {
    flex: 1,
  },
  templateActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  exerciseInfo: {
    flex: 1,
  },
  addExerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 4,
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
  pickerCancelButton: {
    marginTop: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  exercisePickerList: {
    paddingBottom: 20,
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
    paddingTop: 60,
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
  emptyHint: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  programCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  programName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  programMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  groupLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
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
    marginTop: 2,
  },
  exerciseList: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.separator,
    paddingTop: 8,
  },
  exerciseName: {
    fontSize: 15,
    color: colors.text,
  },
  exerciseSets: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  addExerciseText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.primary,
  },
  // Modals
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
  modalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text,
  },
  modalSaveButton: {
    backgroundColor: colors.primary,
  },
  pickerOption: {
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  pickerOptionText: {
    fontSize: 16,
    color: colors.text,
  },
  // Exercise picker
  exercisePickerContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    marginTop: 80,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  exercisePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  exercisePickerTitle: {
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
  exercisePickerRow: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.separator,
  },
  exercisePickerName: {
    fontSize: 16,
    color: colors.text,
  },
  exercisePickerGroup: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
