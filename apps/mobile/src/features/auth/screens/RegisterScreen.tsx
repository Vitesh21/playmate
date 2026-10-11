import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Button, FormInput } from '@shared/components/ui';
import { useTheme } from '@theme/index';
import { useAuthStore } from '@store/auth.store';
import type { RegisterScreenProps } from '@navigation/types';

const registerSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().optional(),
    email: z.string().email('Enter a valid email'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    confirmPassword: z.string().min(1, 'Confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export function RegisterScreen({ navigation }: RegisterScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const { control, handleSubmit } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { firstName: '', lastName: '', email: '', password: '', confirmPassword: '' },
  });
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);

  const onSubmit = (values: RegisterForm) => {
    register(values.email, values.password, values.firstName, values.lastName).catch((error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Registration failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Registration failed', text2: message });
    });
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
        <View style={{ marginBottom: spacing.xl }}>
          <Text style={[typography.h2, { color: colors.text.primary }]}>Create account</Text>
          <Text style={[typography.body1, { color: colors.text.secondary, marginTop: spacing.xs }]}>
            Join Playmate to book courts and shop
          </Text>
        </View>

        <FormInput
          control={control}
          name="firstName"
          label="First name"
          placeholder="John"
          autoComplete="given-name"
        />
        <FormInput
          control={control}
          name="lastName"
          label="Last name"
          placeholder="Doe"
          autoComplete="family-name"
        />
        <FormInput
          control={control}
          name="email"
          label="Email"
          placeholder="you@example.com"
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <FormInput
          control={control}
          name="password"
          label="Password"
          placeholder="At least 6 characters"
          secureTextEntry
        />
        <FormInput
          control={control}
          name="confirmPassword"
          label="Confirm password"
          placeholder="Re-enter your password"
          secureTextEntry
        />

        <Button
          title={isLoading ? 'Creating account…' : 'Create Account'}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          onPress={handleSubmit(onSubmit)}
        />

        <Button
          title="Already have an account? Sign in"
          variant="ghost"
          onPress={() => navigation.navigate('Login')}
        />
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

export default RegisterScreen;