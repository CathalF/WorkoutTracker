import { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  TextInputProps,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useThemeControl } from '../../theme';
import { typography, spacing, radii, glass } from '../../theme/tokens';

interface GlassInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: StyleProp<TextStyle>;
}

export function GlassInput({
  label,
  style,
  inputStyle,
  onFocus,
  onBlur,
  ...rest
}: GlassInputProps) {
  const { colors, isDark } = useThemeControl();
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {label && (
        <Text
          style={[
            styles.label,
            {
              color: colors.textSecondary,
              fontSize: typography.size.sm,
              fontWeight: typography.weight.medium,
            },
          ]}
        >
          {label}
        </Text>
      )}
      <View style={styles.inputContainer}>
        <BlurView
          intensity={glass.blur.light}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />
        <TextInput
          placeholderTextColor={colors.textTertiary}
          {...rest}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          style={[
            styles.input,
            {
              backgroundColor: colors.glassSurface,
              color: colors.text,
              borderColor: focused ? colors.primary : colors.glassBorder,
              fontSize: typography.size.base,
            },
            inputStyle,
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  inputContainer: {
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  input: {
    height: 44,
    paddingHorizontal: spacing.base,
    borderWidth: glass.borderWidth,
    borderRadius: radii.md,
  },
});
