import { View, Text, StyleSheet } from 'react-native';

interface OnboardingScreenProps {
  onComplete: (initialRoute?: string) => void;
}

export default function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Onboarding Placeholder</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000',
  },
  text: {
    color: '#fff',
    fontSize: 18,
  },
});
