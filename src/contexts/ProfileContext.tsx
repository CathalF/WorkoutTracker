import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getMyProfile, upsertProfile, uploadAvatar } from '../services/profileService';
import type { UserProfile } from '../types';

interface ProfileContextValue {
  profile: UserProfile | null;
  isLoading: boolean;
  hasProfile: boolean;
  updateProfile: (data: { display_name: string; bio: string }) => Promise<void>;
  updateAvatar: (localUri: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setIsLoading(false);
      return;
    }
    try {
      const p = await getMyProfile();
      setProfile(p);
    } catch {
      setProfile(null);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      setIsLoading(true);
      refreshProfile();
    } else {
      setProfile(null);
      setIsLoading(false);
    }
  }, [user, refreshProfile]);

  const handleUpdateProfile = useCallback(async (data: { display_name: string; bio: string }) => {
    const updated = await upsertProfile({
      display_name: data.display_name,
      bio: data.bio,
      avatar_url: profile?.avatar_url,
    });
    setProfile(updated);
  }, [profile?.avatar_url]);

  const handleUpdateAvatar = useCallback(async (localUri: string) => {
    if (!user) return;
    const publicUrl = await uploadAvatar(user.id, localUri);
    const updated = await upsertProfile({
      display_name: profile?.display_name ?? '',
      bio: profile?.bio ?? '',
      avatar_url: publicUrl,
    });
    setProfile(updated);
  }, [user, profile?.display_name, profile?.bio]);

  return (
    <ProfileContext.Provider
      value={{
        profile,
        isLoading,
        hasProfile: profile !== null,
        updateProfile: handleUpdateProfile,
        updateAvatar: handleUpdateAvatar,
        refreshProfile,
      }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
