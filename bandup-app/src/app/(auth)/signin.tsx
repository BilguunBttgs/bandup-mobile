import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { PinInput } from '@/components/pin-input';
import { useAuthStore } from '@/stores/auth-store';

export default function SigninScreen() {
  const router = useRouter();
  const { signin, isLoading, error, clearError } = useAuthStore();

  const [identifier, setIdentifier] = useState(''); // email or username
  const [pin, setPin] = useState('');

  const canSubmit = identifier.trim().length >= 3 && pin.length === 4;

  async function handleSignin() {
    if (!canSubmit || isLoading) return;
    clearError();
    try {
      await signin({ identifier: identifier.trim(), password: pin });
      // auth store sets token → root layout redirects to (app) automatically
    } catch {
      // error is already in the store
    }
  }

  return (
    <View className="flex-1" style={{ backgroundColor: '#F5EEE6' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EEE6" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          className="flex-1"
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled">
            {/* ── Header ── */}
            <View className="flex-row items-center px-4 pt-2 pb-4">
              <Pressable
                onPress={() => router.back()}
                className="w-10 h-10 rounded-full items-center justify-center active:opacity-60"
                style={{ backgroundColor: 'rgba(196,77,48,0.12)' }}>
                <Text className="text-lg" style={{ color: '#C44D30' }}>
                  ←
                </Text>
              </Pressable>
            </View>

            <View className="flex-1 px-6 gap-8">
              {/* ── Title ── */}
              <View className="gap-1">
                <Text
                  className="text-3xl text-[#1C1209]"
                  style={{ fontWeight: '800', letterSpacing: -0.5 }}>
                  Welcome back 👋
                </Text>
                <Text className="text-[#9B8A7A] text-base">
                  Sign in to continue your progress.
                </Text>
              </View>

              {/* ── Fields ── */}
              <View className="gap-5">
                {/* Identifier */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold tracking-wider text-[#6B5540] uppercase">
                    Email or username
                  </Text>
                  <TextInput
                    value={identifier}
                    onChangeText={setIdentifier}
                    placeholder="you@example.com or username"
                    placeholderTextColor="#C4AFA5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    keyboardType="email-address"
                    returnKeyType="next"
                    className="h-14 px-4 rounded-2xl text-base text-[#1C1209]"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1.5,
                      borderColor: identifier.length > 0 ? '#C44D30' : '#E5D9D0',
                    }}
                  />
                </View>

                {/* PIN */}
                <View className="gap-3">
                  <Text className="text-xs font-semibold tracking-wider text-[#6B5540] uppercase">
                    Your 4-digit PIN
                  </Text>
                  <PinInput value={pin} onChange={setPin} />
                </View>
              </View>

              {/* ── Error ── */}
              {error ? (
                <View
                  className="px-4 py-3 rounded-xl"
                  style={{ backgroundColor: '#FEE2E2' }}>
                  <Text className="text-sm text-red-700 text-center">{error}</Text>
                </View>
              ) : null}

              {/* ── Submit ── */}
              <View className="gap-4 pb-8">
                <Pressable
                  onPress={handleSignin}
                  disabled={!canSubmit || isLoading}
                  className="h-14 rounded-2xl items-center justify-center active:opacity-80"
                  style={{
                    backgroundColor: canSubmit ? '#C44D30' : '#E5D9D0',
                  }}>
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text
                      className="text-base"
                      style={{
                        color: canSubmit ? 'white' : '#9B8A7A',
                        fontWeight: '700',
                      }}>
                      Sign in
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.replace('/(auth)/signup')}
                  className="items-center py-2 active:opacity-70">
                  <Text className="text-sm" style={{ color: '#C44D30', fontWeight: '600' }}>
                    Don't have an account? Sign up
                  </Text>
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
