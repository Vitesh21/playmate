import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@theme/index';

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info' | 'primary' | 'secondary';
type BadgeSize = 'sm' | 'md' | 'lg';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: BadgeSize;
  style?: StyleProp<ViewStyle>;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'default',
  size = 'md',
  style,
}) => {
  const { colors, radius, spacing } = useTheme();

  const s = StyleSheet.create({
    base: { alignSelf: 'flex-start', borderRadius: radius.full, alignItems: 'center', justifyContent: 'center' },

    size_sm: { paddingVertical: spacing.xxs, paddingHorizontal: spacing.sm },
    size_md: { paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
    size_lg: { paddingVertical: spacing.sm, paddingHorizontal: spacing.lg },

    variant_default: { backgroundColor: colors.neutral[100] },
    variant_primary: { backgroundColor: colors.primary[50] },
    variant_secondary: { backgroundColor: colors.secondary[50] },
    variant_success: { backgroundColor: colors.success[50] },
    variant_warning: { backgroundColor: colors.warning[50] },
    variant_error: { backgroundColor: colors.error[50] },
    variant_info: { backgroundColor: colors.primary[50] },

    text_sm: { fontSize: 10, lineHeight: 14 },
    text_md: { fontSize: 12, lineHeight: 18 },
    text_lg: { fontSize: 14, lineHeight: 20 },

    text_default: { color: colors.neutral[700] ?? colors.text.secondary },
    text_primary: { color: colors.primary[700] },
    text_secondary: { color: colors.secondary[700] },
    text_success: { color: colors.success[700] },
    text_warning: { color: colors.warning[600] ?? colors.warning[500] },
    text_error: { color: colors.error[700] },
    text_info: { color: colors.primary[700] },
  });

  return (
    <View
      style={[
        s.base,
        s[`variant_${variant}`],
        s[`size_${size}`],
        style,
      ]}
    >
      <Text
        style={[
          { fontWeight: '600' },
          s[`text_${size}`],
          s[`text_${variant}`],
        ]}
      >
        {label}
      </Text>
    </View>
  );
};

export default Badge;
