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

export default function SignUpScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { signUp } = useAuth();
  const { colors } = useThemeControl();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await signUp(email.trim(), password);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  };

  if (success) {
    return (
      <GradientBackground>
        <View style={staticStyles.centeredContainer}>
          <Ionicons name="mail-outline" size={64} color={colors.primary} />
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.description}>
            We sent a confirmation link to {email}. Tap the link to activate your account.
          </Text>
          <GlassButton
            title="Back to Sign In"
            onPress={() => navigation.navigate('SignIn')}
            variant="primary"
            size="lg"
            style={staticStyles.button}
          />
        </View>
      </GradientBackground>
    );
  }

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
            <Ionicons name="person-add" size={64} color={colors.primary} />
            <Text style={styles.title}>Create Account</Text>
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
              placeholder="At least 6 characters"
              value={password}
              onChangeText={(t) => { setPassword(t); setError(''); }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              style={staticStyles.input}
            />

            <GlassInput
              label="Confirm Password"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChangeText={(t) => { setConfirmPassword(t); setError(''); }}
              secureTextEntry
              autoComplete="new-password"
              textContentType="newPassword"
              style={staticStyles.input}
            />

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <GlassButton
              title={loading ? 'Creating Account...' : 'Create Account'}
              onPress={handleSignUp}
              variant="primary"
              size="lg"
              disabled={loading}
              style={staticStyles.button}
            />

            <Pressable onPress={() => navigation.navigate('SignIn')} style={staticStyles.bottomLink}>
              <Text style={styles.secondaryText}>
                Already have an account? <Text style={styles.linkInline}>Sign In</Text>
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
  centeredContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    description: {
      fontSize: typography.size.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
      paddingHorizontal: spacing.base,
      lineHeight: typography.size.base * typography.lineHeight.relaxed,
    },
    error: {
      fontSize: typography.size.sm,
      color: colors.destructive,
      textAlign: 'center',
      marginVertical: spacing.sm,
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
