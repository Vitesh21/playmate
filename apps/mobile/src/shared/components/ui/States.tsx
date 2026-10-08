import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { useTheme } from '@theme/index';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();
  const s = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxxl,
    },
    icon: { marginBottom: spacing.lg },
    title: {
      ...typography.h4,
      color: colors.text.primary,
      textAlign: 'center',
      marginBottom: spacing.xs,
    },
    description: {
      ...typography.body2,
      color: colors.text.tertiary,
      textAlign: 'center',
    },
    action: { marginTop: spacing.xl, minWidth: 200 },
  });

  return (
    <View style={[s.container, style]}>
      {icon ? <View style={s.icon}>{icon}</View> : null}
      <Text style={s.title}>{title}</Text>
      {description ? <Text style={s.description}>{description}</Text> : null}
      {action ? <View style={s.action}>{action}</View> : null}
    </View>
  );
};

interface LoadingStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label, style }) => {
  const { colors, spacing, typography } = useTheme();
  const s = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxxl,
    },
    label: { marginTop: spacing.md, ...typography.body2, color: colors.text.tertiary },
  });
  return (
    <View style={[s.container, style]}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {label ? <Text style={s.label}>{label}</Text> : null}
    </View>
  );
};

interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'Please try again later.',
  action,
  style,
}) => {
  const { colors, spacing, typography } = useTheme();
  const s = StyleSheet.create({
    container: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xxl,
      paddingVertical: spacing.xxxl,
    },
    title: { ...typography.h4, color: colors.error[600], textAlign: 'center', marginBottom: spacing.xs },
    description: { ...typography.body2, color: colors.text.tertiary, textAlign: 'center' },
    action: { marginTop: spacing.xl, minWidth: 200 },
  });
  return (
    <View style={[s.container, style]}>
      <Text style={s.title}>{title}</Text>
      <Text style={s.description}>{description}</Text>
      {action ? <View style={s.action}>{action}</View> : null}
    </View>
  );
};

export default EmptyState;
