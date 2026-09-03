import React, { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useDesignSystemFonts } from '@workspace/quick-mark-system/hooks/use-fonts';
import { Redirect, Stack, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { AuthProvider, useAppAuth } from '@/lib/auth';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient();

function RootLayoutNav() {
  const { isSignedIn } = useAppAuth();
  const segments = useSegments();
  const firstSegment = segments[0] as string | undefined;
  const inAuthFlow = firstSegment === 'sign-in' || firstSegment === 'sign-up';

  if (isSignedIn && inAuthFlow) return <Redirect href="/" />;

  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="editor" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
    </Stack>
  );
}

export default function RootLayout() {
  // Start loading the bundled Inter family, but keep the app responsive if a
  // browser rejects a font asset.  System text is used until it becomes ready.
  useDesignSystemFonts();

  useEffect(() => {
    // Do not block the app shell on remote/web font loading.  In a browser the
    // observer can time out while offline, which previously left the user on
    // Expo's error screen.  The UI uses platform fallbacks until fonts exist.
    void SplashScreen.hideAsync();
  }, []);

  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim();
  const proxyUrl = process.env.EXPO_PUBLIC_CLERK_PROXY_URL || undefined;

  return (
    <AuthProvider publishableKey={publishableKey} proxyUrl={proxyUrl}>
      <SafeAreaProvider>
        <ErrorBoundary>
          <QueryClientProvider client={queryClient}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <KeyboardProvider>
                <RootLayoutNav />
              </KeyboardProvider>
            </GestureHandlerRootView>
          </QueryClientProvider>
        </ErrorBoundary>
      </SafeAreaProvider>
    </AuthProvider>
  );
}
