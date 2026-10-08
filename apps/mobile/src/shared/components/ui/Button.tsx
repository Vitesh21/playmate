import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { useTheme } from '@theme/index';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  leftIcon,
  rightIcon,
}) => {
  const { colors, spacing, radius, typography } = useTheme();

  const base = StyleSheet.create({
    base: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: spacing.sm,
      borderRadius: radius.md,
    },
    fullWidth: { width: '100%' },
    disabled: { opacity: 0.5 },

    variant_primary: { backgroundColor: colors.primary[600] },
    variant_secondary: { backgroundColor: colors.secondary[600] },
    variant_outline: {
      backgroundColor: 'transparent',
      borderWidth: 1.5,
      borderColor: colors.primary[500],
    },
    variant_ghost: { backgroundColor: 'transparent' },
    variant_danger: { backgroundColor: colors.error[600] },

    size_sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    size_md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    size_lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
    size_xl: { paddingVertical: spacing.xxl, paddingHorizontal: spacing.xxl },
  });

  const textBase = StyleSheet.create({
    base: { ...typography.button },
    text_primary: { color: colors.text.inverse },
    text_secondary: { color: colors.text.inverse },
    text_outline: { color: colors.primary[600] },
    text_ghost: { color: colors.primary[600] },
    text_danger: { color: colors.text.inverse },
    textDisabled: { color: colors.text.disabled },
    textSize_sm: { fontSize: 14, lineHeight: 20 },
    textSize_md: { fontSize: 16, lineHeight: 24 },
    textSize_lg: { fontSize: 18, lineHeight: 26 },
    textSize_xl: { fontSize: 20, lineHeight: 28 },
  });

  const containerStyle: StyleProp<ViewStyle> = [
    base.base,
    base[`variant_${variant}`],
    base[`size_${size}`],
    fullWidth && base.fullWidth,
    disabled && base.disabled,
    style,
  ];

  const textStyleComputed: StyleProp<TextStyle> = [
    textBase.base,
    textBase[`text_${variant}`],
    textBase[`textSize_${size}`],
    disabled && textBase.textDisabled,
    textStyle,
  ];

  const spinnerColor =
    variant === 'outline' || variant === 'ghost' ? colors.primary[600] : colors.text.inverse;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.75}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator size="small" color={spinnerColor} />
      ) : (
        <>
          {leftIcon}
          <Text style={textStyleComputed}>{title}</Text>
          {rightIcon}
        </>
      )}
    </TouchableOpacity>
  );
};

export default Button;
