import React from 'react';
import { View, Text, StyleSheet, ActivityIndicator, StyleProp, ViewStyle } from 'react-native';
import { colors, spacing, typography } from '@theme/index';

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
  return (
    <View style={[styles.container, style]}>
      {icon && <View style={styles.iconWrapper}>{icon}</View>}
      <Text style={styles.title}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

interface LoadingStateProps {
  label?: string;
  style?: StyleProp<ViewStyle>;
}

export const LoadingState: React.FC<LoadingStateProps> = ({ label, style }) => {
  return (
    <View style={[styles.container, style]}>
      <ActivityIndicator size="large" color={colors.primary[600]} />
      {label ? <Text style={[styles.description, { marginTop: spacing.md }]}>{label}</Text> : null}
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
  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, { color: colors.error[600] }]}>{title}</Text>
      {description ? <Text style={styles.description}>{description}</Text> : null}
      {action && <View style={styles.action}>{action}</View>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  iconWrapper: {
    marginBottom: spacing.lg,
  },
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
  action: {
    marginTop: spacing.xl,
    minWidth: 200,
  },
});

export default EmptyState;
