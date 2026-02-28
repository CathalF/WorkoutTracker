import { Pressable, Text, View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { useThemeControl } from '../../theme';
import { typography, spacing, radii, glass } from '../../theme/tokens';

interface GlassButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  size?: 'sm' | 'md' | 'lg';
  style?: StyleProp<ViewStyle>;
}

const sizeConfig = {
  sm: { height: 36, fontSize: typography.size.sm, px: spacing.md },
  md: { height: 44, fontSize: typography.size.base, px: spacing.base },
  lg: { height: 52, fontSize: typography.size.md, px: spacing.xl },
} as const;

export function GlassButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  icon,
  size = 'md',
  style,
}: GlassButtonProps) {
  const { colors, isDark } = useThemeControl();
  const config = sizeConfig[size];

  if (variant === 'primary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.base,
          {
            height: config.height,
            paddingHorizontal: config.px,
            backgroundColor: disabled
              ? colors.primaryDisabled
              : pressed
                ? colors.primaryPressed
                : colors.primary,
            borderRadius: radii.md,
          },
          style,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={config.fontSize}
            color="#FFFFFF"
            style={{ marginRight: spacing.sm, opacity: disabled ? 0.5 : 1 }}
          />
        )}
        <Text
          style={[
            styles.text,
            {
              fontSize: config.fontSize,
              color: '#FFFFFF',
              opacity: disabled ? 0.5 : 1,
            },
          ]}
        >
          {title}
        </Text>
      </Pressable>
    );
  }

  // Secondary variant (glass)
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        styles.secondaryOuter,
        {
          height: config.height,
          paddingHorizontal: config.px,
          borderRadius: radii.md,
          borderColor: colors.glassBorder,
          opacity: disabled ? 0.5 : pressed ? 0.7 : 1,
        },
        style,
      ]}
    >
      <BlurView
        intensity={glass.blur.light}
        tint={isDark ? 'dark' : 'light'}
        style={StyleSheet.absoluteFill}
      />
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: colors.glassSurface, borderRadius: radii.md },
        ]}
      />
      {icon && (
        <Ionicons
          name={icon}
          size={config.fontSize}
          color={colors.primary}
          style={{ marginRight: spacing.sm }}
        />
      )}
      <Text
        style={[styles.text, { fontSize: config.fontSize, color: colors.primary }]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryOuter: {
    overflow: 'hidden',
    borderWidth: glass.borderWidth,
  },
  text: {
    fontWeight: typography.weight.semibold,
  },
});
