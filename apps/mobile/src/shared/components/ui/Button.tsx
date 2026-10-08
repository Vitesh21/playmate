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
import { colors, spacing, radius, typography } from '@theme/index';

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
  const containerStyle = [
    styles.base,
    styles[`variant_${variant}`],
    styles[`size_${size}`],
    fullWidth && styles.fullWidth,
    disabled && styles.disabled,
    style,
  ];

  const textStyleComputed = [
    styles.textBase,
    styles[`text_${variant}`],
    styles[`textSize_${size}`],
    disabled && styles.textDisabled,
    textStyle,
  ];

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
      style={containerStyle}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' || variant === 'ghost' ? colors.primary[600] : colors.text.inverse}
        />
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

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
  },

  variant_primary: {
    backgroundColor: colors.primary[600],
  },
  variant_secondary: {
    backgroundColor: colors.secondary[600],
  },
  variant_outline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary[600],
  },
  variant_ghost: {
    backgroundColor: 'transparent',
  },
  variant_danger: {
    backgroundColor: colors.error[600],
  },

  size_sm: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  size_md: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  size_lg: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  size_xl: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },

  textBase: {
    ...typography.button,
  },
  text_primary: {
    color: colors.text.inverse,
  },
  text_secondary: {
    color: colors.text.inverse,
  },
  text_outline: {
    color: colors.primary[600],
  },
  text_ghost: {
    color: colors.primary[600],
  },
  text_danger: {
    color: colors.text.inverse,
  },
  textDisabled: {
    color: colors.text.disabled,
  },
  textSize_sm: {
    fontSize: 14,
    lineHeight: 20,
  },
  textSize_md: {
    fontSize: 16,
    lineHeight: 24,
  },
  textSize_lg: {
    fontSize: 18,
    lineHeight: 26,
  },
  textSize_xl: {
    fontSize: 20,
    lineHeight: 28,
  },
});

export default Button;
