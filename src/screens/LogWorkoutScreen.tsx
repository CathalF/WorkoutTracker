import { StyleSheet, Text, View } from 'react-native';

export default function LogWorkoutScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Log Workout</Text>
      <Text style={styles.subtitle}>Start a new workout session</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});
