import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, FormInput } from '@shared/components/ui';
import { useTheme } from '@theme/index';
import apiClient from '@shared/services/api';
import type { ApiResponse } from '@playmate/types';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { AuthStackParamList } from '@navigation/types';

const forgotSchema = z.object({
  email: z.string().email('Enter a valid email'),
});

type ForgotForm = z.infer<typeof forgotSchema>;
type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export function ForgotPasswordScreen({ navigation }: Props) {
  const { colors, spacing, typography } = useTheme();
  const { control, handleSubmit } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
  });
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = async (values: ForgotForm) => {
    setSubmitting(true);
    try {
      await apiClient.post<ApiResponse<never>>('/auth/reset-password', { email: values.email });
      setSent(true);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { padding: spacing.lg }]}
        keyboardShouldPersistTaps="handled"
      >
        {sent ? (
          <View>
            <Text style={[typography.h2, { color: colors.text.primary }]}>Check your inbox</Text>
            <Text style={[typography.body1, { color: colors.text.secondary, marginTop: spacing.xs }]}>
              If an account exists for that email, a password reset link has been sent.
            </Text>
            <Button
              title="Back to Sign In"
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.lg }}
              onPress={() => navigation.navigate('Login')}
            />
          </View>
        ) : (
          <>
            <View style={{ marginBottom: spacing.xl }}>
              <Text style={[typography.h2, { color: colors.text.primary }]}>Reset password</Text>
              <Text style={[typography.body1, { color: colors.text.secondary, marginTop: spacing.xs }]}>
                Enter your email and we'll send you a reset link.
              </Text>
            </View>

            <FormInput
              control={control}
              name="email"
              label="Email"
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
            />

            <Button
              title={submitting ? 'Sending…' : 'Send Reset Link'}
              variant="primary"
              size="lg"
              fullWidth
              loading={submitting}
              onPress={handleSubmit(onSubmit)}
            />

            <Button
              title="Back to Sign In"
              variant="ghost"
              onPress={() => navigation.navigate('Login')}
            />
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
});

export default ForgotPasswordScreen;