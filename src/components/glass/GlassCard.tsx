import { ReactNode } from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeControl } from '../../theme';
import { spacing, radii, glass } from '../../theme/tokens';

interface GlassCardProps {
  children: ReactNode;
  blur?: 'light' | 'medium' | 'heavy';
  style?: StyleProp<ViewStyle>;
  padding?: keyof typeof spacing;
}

export function GlassCard({
  children,
  blur = 'medium',
  style,
  padding = 'base',
}: GlassCardProps) {
  const { colors, isDark } = useThemeControl();

  return (
    <View style={[styles.outer, { shadowColor: colors.glassShadow }, style]}>
      <BlurView
        intensity={glass.blur[blur]}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          styles.content,
          {
            backgroundColor: colors.glassSurface,
            borderColor: colors.glassBorder,
            padding: spacing[padding],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 8,
  },
  content: {
    borderWidth: glass.borderWidth,
    borderRadius: radii.lg,
  },
});
