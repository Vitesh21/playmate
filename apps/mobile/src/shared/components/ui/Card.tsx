import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { colors, spacing, radius, typography } from '@theme/index';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  elevation?: 'none' | 'sm' | 'md' | 'lg';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'default' | 'outlined' | 'filled';
  onPress?: () => void;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  elevation = 'sm',
  padding = 'md',
  variant = 'default',
  onPress,
}) => {
  const Wrapper = onPress ? (View as any) : View;

  return (
    <Wrapper
      style={[
        styles.base,
        styles[`variant_${variant}`],
        styles[`elevation_${elevation}`],
        styles[`padding_${padding}`],
        style,
      ]}
      onTouchEnd={onPress}
    >
      {children}
    </Wrapper>
  );
};

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
}

Card.Header = function CardHeader({ title, subtitle, rightAction }: CardHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction}
    </View>
  );
};

Card.Divider = function CardDivider() {
  return <View style={styles.divider} />;
};

const styles = StyleSheet.create({
  base: {
    backgroundColor: colors.background.primary,
    borderRadius: radius.lg,
  },
  variant_default: {
    backgroundColor: colors.background.primary,
  },
  variant_outlined: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  variant_filled: {
    backgroundColor: colors.background.secondary,
  },
  elevation_none: {},
  elevation_sm: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  elevation_md: {
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  elevation_lg: {
    shadowColor: '#000',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  padding_none: {
    padding: 0,
  },
  padding_sm: {
    padding: spacing.sm,
  },
  padding_md: {
    padding: spacing.md,
  },
  padding_lg: {
    padding: spacing.lg,
  },
  padding_xl: {
    padding: spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h5,
    color: colors.text.primary,
  },
  headerSubtitle: {
    ...typography.body2,
    color: colors.text.tertiary,
    marginTop: spacing.xxs,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border.light,
    marginVertical: spacing.md,
  },
});

export default Card;
