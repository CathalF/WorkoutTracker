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

export default function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<AuthStackParamList>>();
  const { resetPassword } = useAuth();
  const { colors } = useThemeControl();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await resetPassword(email.trim());
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
          <Ionicons name="checkmark-circle-outline" size={64} color={colors.success} />
          <Text style={styles.title}>Email Sent</Text>
          <Text style={styles.description}>
            Check your inbox for a password reset link.
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
            <Ionicons name="key-outline" size={64} color={colors.primary} />
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your email and we'll send you a reset link
            </Text>
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

            {error !== '' && <Text style={styles.error}>{error}</Text>}

            <GlassButton
              title={loading ? 'Sending...' : 'Send Reset Link'}
              onPress={handleReset}
              variant="primary"
              size="lg"
              disabled={loading}
              style={staticStyles.button}
            />

            <Pressable onPress={() => navigation.navigate('SignIn')} style={staticStyles.bottomLink}>
              <Text style={styles.link}>Back to Sign In</Text>
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
    subtitle: {
      fontSize: typography.size.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.xs,
      paddingHorizontal: spacing.base,
    },
    description: {
      fontSize: typography.size.base,
      color: colors.textSecondary,
      textAlign: 'center',
      marginTop: spacing.sm,
      marginBottom: spacing.xl,
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
    },
  });
