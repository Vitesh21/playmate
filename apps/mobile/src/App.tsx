import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast, { BaseToast } from 'react-native-toast-message';
import { StyleSheet, View } from 'react-native';
import RootNavigator from './shared/navigation/RootNavigator';
import { useAuthStore } from './shared/store/auth.store';
import { ThemeProvider, useTheme } from './shared/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 30 * 1000,
    },
    mutations: {
      retry: 0,
    },
  },
});

function ThemedApp() {
  const restoreSession = useAuthStore((s) => s.restoreSession);
  const { resolvedMode, colors } = useTheme();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background.screen }]}>
      <StatusBar
        style={resolvedMode === 'dark' ? 'light' : 'dark'}
        backgroundColor={colors.background.primary}
      />
      <RootNavigator />
      <Toast
        topOffset={80}
        config={{
          success: (props: any) => (
            <View style={[styles.toastBase, { backgroundColor: colors.success[50], borderLeftColor: colors.success[600] }]}>
              <BaseToast {...props} />
            </View>
          ),
          error: (props: any) => (
            <View style={[styles.toastBase, { backgroundColor: colors.error[50], borderLeftColor: colors.error[600] }]}>
              <BaseToast {...props} />
            </View>
          ),
        }}
      />
    </View>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider initialMode="system">
            <ThemedApp />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  toastBase: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    minWidth: 320,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});
