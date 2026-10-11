import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Toast from 'react-native-toast-message';
import { Button, FormInput } from '@shared/components/ui';
import { useTheme } from '@theme/index';
import { useAuthStore } from '@store/auth.store';
import type { LoginScreenProps } from '@navigation/types';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginScreen({ navigation }: LoginScreenProps) {
  const { colors, spacing, typography } = useTheme();
  const { control, handleSubmit } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });
  const login = useAuthStore((s) => s.login);
  const isLoading = useAuthStore((s) => s.isLoading);

  const onSubmit = (values: LoginForm) => {
    login(values.email, values.password).catch((error: unknown) => {
      const message =
        error && typeof error === 'object' && 'message' in error
          ? String((error as { message: unknown }).message)
          : 'Login failed. Please try again.';
      Toast.show({ type: 'error', text1: 'Login failed', text2: message });
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
          <Text style={[typography.h2, { color: colors.text.primary }]}>Welcome back</Text>
          <Text style={[typography.body1, { color: colors.text.secondary, marginTop: spacing.xs }]}>
            Sign in to continue to Playmate
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

        <FormInput
          control={control}
          name="password"
          label="Password"
          placeholder="••••••••"
          secureTextEntry
        />

        <Button
          title={isLoading ? 'Signing in…' : 'Sign In'}
          variant="primary"
          size="lg"
          fullWidth
          loading={isLoading}
          onPress={handleSubmit(onSubmit)}
        />

        <View style={styles.links}>
          <Button
            title="Forgot password?"
            variant="ghost"
            onPress={() => navigation.navigate('ForgotPassword')}
          />
          <Button
            title="Create an account"
            variant="outline"
            fullWidth
            onPress={() => navigation.navigate('Register')}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  links: {
    marginTop: 16,
    alignItems: 'center',
  },
});

export default LoginScreen;