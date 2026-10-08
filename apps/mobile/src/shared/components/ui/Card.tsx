import React from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@theme/index';

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
  const { colors, spacing, radius, typography } = useTheme();

  const s = StyleSheet.create({
    base: { backgroundColor: colors.background.primary, borderRadius: radius.lg },
    variant_default: { backgroundColor: colors.background.primary },
    variant_outlined: {
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: colors.border.light,
    },
    variant_filled: { backgroundColor: colors.background.secondary },

    elevation_none: {},
    elevation_sm: {
      shadowColor: '#000',
      shadowOpacity: colors.text.primary === '#EAE7E1' ? 0.25 : 0.06,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    elevation_md: {
      shadowColor: '#000',
      shadowOpacity: colors.text.primary === '#EAE7E1' ? 0.35 : 0.1,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    elevation_lg: {
      shadowColor: '#000',
      shadowOpacity: colors.text.primary === '#EAE7E1' ? 0.45 : 0.14,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      elevation: 8,
    },

    padding_none: { padding: 0 },
    padding_sm: { padding: spacing.sm },
    padding_md: { padding: spacing.md },
    padding_lg: { padding: spacing.lg },
    padding_xl: { padding: spacing.xxl },

    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: spacing.md,
    },
    headerText: { flex: 1 },
    headerTitle: { ...typography.h5, color: colors.text.primary },
    headerSubtitle: { ...typography.body2, color: colors.text.tertiary, marginTop: spacing.xxs },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border.light,
      marginVertical: spacing.md,
    },
  });

  const Wrapper = onPress ? (View as any) : View;

  return (
    <Wrapper
      style={[
        s.base,
        s[`variant_${variant}`],
        s[`elevation_${elevation}`],
        s[`padding_${padding}`],
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
  const { spacing, typography, colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: spacing.md,
      }}
    >
      <View style={{ flex: 1 }}>
        <Text style={{ ...typography.h5, color: colors.text.primary }}>{title}</Text>
        {subtitle ? (
          <Text style={{ ...typography.body2, color: colors.text.tertiary, marginTop: 2 }}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightAction}
    </View>
  );
};

Card.Divider = function CardDivider() {
  const { colors, spacing } = useTheme();
  return (
    <View
      style={{
        height: StyleSheet.hairlineWidth,
        backgroundColor: colors.border.light,
        marginVertical: spacing.md,
      }}
    />
  );
};

export default Card;
