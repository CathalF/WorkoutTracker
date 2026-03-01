import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeControl } from '../theme';
import { typography, spacing } from '../theme/tokens';
import { GradientBackground, GlassButton, GlassInput } from '../components/glass';
import { useProfile } from '../contexts/ProfileContext';
import { useAuth } from '../contexts/AuthContext';
import { pickAvatar } from '../utils/avatarPicker';

interface Props {
  onComplete: () => void;
}

export default function ProfileSetupScreen({ onComplete }: Props) {
  const { colors } = useThemeControl();
  const { updateProfile, updateAvatar } = useProfile();
  const { user } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePickAvatar = async () => {
    const uri = await pickAvatar();
    if (uri) setAvatarUri(uri);
  };

  const handleContinue = async () => {
    setIsSaving(true);
    try {
      if (avatarUri) {
        await updateAvatar(avatarUri);
      }
      await updateProfile({
        display_name: displayName.trim() || extractUsername(user?.email),
        bio: bio.trim(),
      });
      onComplete();
    } catch (e) {
      console.error('Profile setup error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        display_name: extractUsername(user?.email),
        bio: '',
      });
      onComplete();
    } catch (e) {
      console.error('Profile skip error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>Set Up Your Profile</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Add a photo and name so others can recognize you
        </Text>

        <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
              <Ionicons name="person-circle-outline" size={64} color={colors.textTertiary} />
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera-outline" size={16} color="#fff" />
          </View>
        </Pressable>

        <GlassInput
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          style={styles.input}
        />

        <GlassInput
          placeholder="Short bio (optional)"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={150}
          style={styles.input}
          inputStyle={styles.bioInput}
        />

        <GlassButton
          title={isSaving ? 'Saving...' : 'Continue'}
          onPress={handleContinue}
          variant="primary"
          size="lg"
          disabled={isSaving}
          style={styles.continueButton}
        />

        {isSaving ? (
          <ActivityIndicator size="small" color={colors.primary} style={styles.skipArea} />
        ) : (
          <Pressable onPress={handleSkip} style={styles.skipArea}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
          </Pressable>
        )}
      </View>
    </GradientBackground>
  );
}

function extractUsername(email: string | undefined): string {
  if (!email) return 'User';
  return email.split('@')[0];
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  title: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.size.base,
    textAlign: 'center',
    marginBottom: spacing['2xl'],
  },
  avatarContainer: {
    marginBottom: spacing['2xl'],
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    width: '100%',
    marginBottom: spacing.base,
  },
  bioInput: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: spacing.md,
  },
  continueButton: {
    width: '100%',
    marginTop: spacing.md,
  },
  skipArea: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: typography.size.base,
    fontWeight: typography.weight.medium,
  },
});
