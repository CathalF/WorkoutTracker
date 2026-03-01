import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { useThemeControl } from '../theme';
import { typography, spacing } from '../theme/tokens';
import { GradientBackground } from '../components/glass';
import { getProfile } from '../services/profileService';
import type { UserProfile } from '../types';

type RouteParams = RouteProp<{ UserProfile: { userId: string } }, 'UserProfile'>;

export default function UserProfileScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteParams>();
  const { colors, isDark } = useThemeControl();
  const { userId } = route.params;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getProfile(userId)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setIsLoading(false));
  }, [userId]);

  return (
    <GradientBackground>
      <View style={styles.header}>
        <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.glassElevated }]} />
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={28} color={colors.primary} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <View style={styles.content}>
        {isLoading ? (
          <ActivityIndicator size="large" color={colors.primary} />
        ) : !profile ? (
          <View style={styles.emptyState}>
            <Ionicons name="person-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>Profile not found</Text>
          </View>
        ) : (
          <>
            {profile.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
            ) : (
              <Ionicons name="person-circle-outline" size={100} color={colors.textSecondary} />
            )}
            <Text style={[styles.displayName, { color: colors.text }]}>
              {profile.display_name || 'Anonymous'}
            </Text>
            {profile.bio ? (
              <Text style={[styles.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
            ) : null}
          </>
        )}
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
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: spacing.lg,
  },
  displayName: {
    fontSize: typography.size.xl,
    fontWeight: typography.weight.bold,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  bio: {
    fontSize: typography.size.base,
    textAlign: 'center',
    lineHeight: typography.size.base * typography.lineHeight.relaxed,
  },
  emptyState: {
    alignItems: 'center',
    gap: spacing.md,
  },
  emptyText: {
    fontSize: typography.size.base,
  },
});
