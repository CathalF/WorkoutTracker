import { useState, useMemo } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { useThemeControl, type ThemeColors } from '../theme';
import { GradientBackground, GlassButton, GlassInput } from '../components/glass';
import { typography, spacing } from '../theme/tokens';

type AuthStackParamList = {
  SignIn: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
};

export default function SignInScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signIn } = useAuth();
  const { colors } = useThemeControl();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) setError(authError.message);
  };

  return (
    <GradientBackground>
      <KeyboardAvoidingView
        style={staticStyles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={staticStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={staticStyles.iconContainer}>
            <Ionicons name="fitness" size={64} color={colors.primary} />
            <Text style={styles.title}>Workout Tracker</Text>
            <Text style={styles.subtitle}>Sign in to continue</Text>
          </View>

          <View style={staticStyles.form}>
            <GlassInput
              label="Email"
              placeholder="you@example.com"
              value={email}
              onChangeText={(t) => { setEmail(t); setError(''); }}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
              style={staticStyles.input}
            />

            <GlassInput
              label="Password"
              placeholder="Your password"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry
              autoComplete="password"
              textContentType="password"
              style={staticStyles.input}
            />

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <GlassButton
              title={loading ? 'Signing In...' : 'Sign In'}
              onPress={handleSignIn}
              variant="primary"
              size="lg"
              disabled={loading}
              style={staticStyles.button}
            />

            <Pressable onPress={() => navigation.navigate('ForgotPassword')}>
              <Text style={styles.link}>Forgot password?</Text>
            </Pressable>

            <Pressable onPress={() => navigation.navigate('SignUp')} style={staticStyles.bottomLink}>
              <Text style={styles.secondaryText}>
                Don't have an account? <Text style={styles.linkInline}>Sign Up</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </GradientBackground>
  );
}

const staticStyles = StyleSheet.create({
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  form: {
    gap: 4,
  },
  input: {
    marginBottom: 12,
  },
  button: {
    marginTop: 8,
  },
  bottomLink: {
    alignItems: 'center',
    marginTop: 24,
  },
});

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    title: {
      fontSize: typography.size['2xl'],
      fontWeight: typography.weight.bold,
      color: colors.text,
      marginTop: spacing.base,
    },
    subtitle: {
      fontSize: typography.size.base,
      color: colors.textSecondary,
      marginTop: spacing.xs,
    },
    error: {
      fontSize: typography.size.sm,
      color: colors.destructive,
      textAlign: 'center',
      marginVertical: spacing.sm,
    },
    link: {
      fontSize: typography.size.base,
      color: colors.primary,
      textAlign: 'center',
      marginTop: spacing.base,
    },
    secondaryText: {
      fontSize: typography.size.base,
      color: colors.textSecondary,
    },
    linkInline: {
      color: colors.primary,
      fontWeight: typography.weight.semibold,
    },
  });
