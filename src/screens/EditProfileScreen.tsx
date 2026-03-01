import { useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation } from '@react-navigation/native';
import { useThemeControl } from '../theme';
import { typography, spacing } from '../theme/tokens';
import { GradientBackground, GlassButton, GlassInput } from '../components/glass';
import { useProfile } from '../contexts/ProfileContext';
import { pickAvatar } from '../utils/avatarPicker';

export default function EditProfileScreen() {
  const navigation = useNavigation();
  const { colors, isDark } = useThemeControl();
  const { profile, updateProfile, updateAvatar } = useProfile();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [newAvatarUri, setNewAvatarUri] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const avatarSource = newAvatarUri ?? profile?.avatar_url;

  const handlePickAvatar = async () => {
    const uri = await pickAvatar();
    if (uri) setNewAvatarUri(uri);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (newAvatarUri) {
        await updateAvatar(newAvatarUri);
      }
      await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim(),
      });
      navigation.goBack();
    } catch (e) {
      console.error('Edit profile error:', e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <GradientBackground>
      <View style={styles.header}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassElevated }]} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        <Pressable onPress={handlePickAvatar} style={styles.avatarContainer}>
          {avatarSource ? (
            <Image source={{ uri: avatarSource }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.glassSurface, borderColor: colors.glassBorder }]}>
              <Ionicons name="person-circle-outline" size={56} color={colors.textTertiary} />
            </View>
          )}
          <View style={[styles.cameraBadge, { backgroundColor: colors.primary }]}>
            <Ionicons name="camera-outline" size={14} color="#fff" />
          </View>
        </Pressable>

        <GlassInput
          label="Display name"
          placeholder="Display name"
          value={displayName}
          onChangeText={setDisplayName}
          autoCapitalize="words"
          style={styles.input}
        />

        <GlassInput
          label="Bio"
          placeholder="Short bio (optional)"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={150}
          style={styles.input}
          inputStyle={styles.bioInput}
        />

        <GlassButton
          title={isSaving ? 'Saving...' : 'Save'}
          onPress={handleSave}
          variant="primary"
          size="lg"
          disabled={isSaving}
          style={styles.saveButton}
        />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerPlaceholder: {
    width: 28,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing['2xl'],
  },
  avatarContainer: {
    marginBottom: spacing['2xl'],
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
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
  saveButton: {
    width: '100%',
    marginTop: spacing.md,
  },
});
