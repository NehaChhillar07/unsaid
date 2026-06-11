import 'react-native-gesture-handler';
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import {
  Lora_400Regular,
  Lora_400Regular_Italic,
  Lora_500Medium,
  Lora_500Medium_Italic,
  Lora_600SemiBold,
} from '@expo-google-fonts/lora';
import { QueryClientProvider } from '@tanstack/react-query';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { queryClient } from '../src/lib/queryClient';
import { initAnalytics } from '../src/lib/analytics';
import { ThemeProvider, useTheme } from '../src/theme/ThemeContext';
import { AuthProvider, useAuth } from '../src/state/AuthContext';
import { FreshDropsProvider } from '../src/state/FreshDropsContext';

void SplashScreen.preventAutoHideAsync().catch(() => {});

initAnalytics();

function RootNavigator() {
  const { dark } = useTheme();
  const { session, ready, onboarded } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // auth gate: signed-out / un-onboarded users live in (onboarding),
  // signed-in onboarded users live in (tabs).
  useEffect(() => {
    if (!ready) return;
    const inOnboarding = segments[0] === '(onboarding)' || segments[0] == null;
    if ((!session || !onboarded) && !inOnboarding) {
      router.replace('/(onboarding)');
    } else if (session && onboarded && inOnboarding) {
      router.replace('/(tabs)');
    }
  }, [ready, session, onboarded, segments, router]);

  return (
    <View style={{ flex: 1, backgroundColor: dark ? '#1B1714' : '#ECE5DC' }}>
      <StatusBar style={dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(onboarding)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="compose"
          options={{ presentation: 'transparentModal', animation: 'fade' }}
        />
      </Stack>
    </View>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
    Lora_400Regular,
    Lora_400Regular_Italic,
    Lora_500Medium,
    Lora_500Medium_Italic,
    Lora_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      void SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <AuthProvider>
              <FreshDropsProvider>
                <BottomSheetModalProvider>
                  <RootNavigator />
                </BottomSheetModalProvider>
              </FreshDropsProvider>
            </AuthProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
