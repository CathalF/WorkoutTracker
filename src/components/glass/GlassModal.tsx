import { ReactNode } from 'react';
import { Modal, Pressable, Text, View, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeControl } from '../../theme';
import { typography, spacing, glass } from '../../theme/tokens';
import { GlassCard } from './GlassCard';

interface GlassModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  blur?: 'light' | 'medium' | 'heavy';
}

export function GlassModal({
  visible,
  onClose,
  title,
  children,
  blur = 'medium',
}: GlassModalProps) {
  const { colors, isDark } = useThemeControl();

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.container}>
        <BlurView
          intensity={glass.blur[blur]}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.glassOverlay },
          ]}
          onPress={onClose}
        />
        <View style={styles.contentWrapper}>
          <GlassCard blur="heavy" padding="xl">
            {title && (
              <Text
                style={[
                  styles.title,
                  {
                    color: colors.text,
                    fontSize: typography.size.lg,
                    fontWeight: typography.weight.bold,
                  },
                ]}
              >
                {title}
              </Text>
            )}
            {children}
          </GlassCard>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentWrapper: {
    width: '85%',
    maxWidth: 400,
  },
  title: {
    marginBottom: spacing.base,
  },
});
