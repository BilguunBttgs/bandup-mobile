import '../global.css';

import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';

import { useAuthStore } from '@/stores/auth-store';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();

  const token = useAuthStore((s) => s.token);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);

  // Load the stored token once on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Redirect to the correct group whenever auth state changes
  useEffect(() => {
    if (!isHydrated) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!token && !inAuthGroup) {
      router.replace('/(auth)');
    } else if (token && inAuthGroup) {
      router.replace('/(app)');
    }
  }, [token, isHydrated, segments, router]);

  // Don't render anything until we've read the stored token
  if (!isHydrated) return null;

  return (
    <Stack screenOptions={{ headerShown: false }} />
  );
}
