import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { WorkoutStackParamList } from '../navigation/WorkoutStackNavigator';
import { MuscleGroup } from '../types';
import { getAllMuscleGroups } from '../database/services';

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
  const [muscleGroups, setMuscleGroups] = useState<MuscleGroup[]>([]);

  useEffect(() => {
    setMuscleGroups(getAllMuscleGroups());
  }, []);

  const handleSplitPress = (split: typeof WORKOUT_SPLITS[number]) => {
    const muscleGroupIds: number[] = [];
    let primaryMuscleGroupId = 0;

    if (split.muscleGroupNames.length === 0) {
      // Custom — show all exercises, use first muscle group as default
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

  const renderSplitCard = ({ item }: { item: typeof WORKOUT_SPLITS[number] }) => (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
      onPress={() => handleSplitPress(item)}
    >
      <Ionicons name={item.icon} size={32} color="#007AFF" />
      <Text style={styles.cardLabel}>{item.label}</Text>
    </Pressable>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Start Workout</Text>
        <Text style={styles.subtitle}>{formatDate()}</Text>
      </View>
      <FlatList
        data={WORKOUT_SPLITS}
        keyExtractor={(item) => item.label}
        renderItem={renderSplitCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    marginTop: 4,
  },
  grid: {
    padding: 16,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingVertical: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#C6C6C8',
  },
  cardPressed: {
    backgroundColor: '#E8F0FE',
  },
  cardLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
    marginTop: 8,
    textAlign: 'center',
  },
});
