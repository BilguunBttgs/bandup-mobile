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

export default function SignupScreen() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');

  const canSubmit = username.trim().length >= 3 && email.includes('@') && pin.length === 4;

  async function handleSignup() {
    if (!canSubmit || isLoading) return;
    clearError();
    try {
      await signup({ username: username.trim(), email: email.trim(), password: pin });
      // token is now set in store → root layout redirects to (app) automatically
    } catch {
      // error already set in store, shown below
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
                  Create account
                </Text>
                <Text className="text-[#9B8A7A] text-base">
                  Start your IELTS journey today.
                </Text>
              </View>

              {/* ── Fields ── */}
              <View className="gap-5">
                {/* Username */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold tracking-wider text-[#6B5540] uppercase">
                    Username
                  </Text>
                  <TextInput
                    value={username}
                    onChangeText={setUsername}
                    placeholder="e.g. ielts_hero"
                    placeholderTextColor="#C4AFA5"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    className="h-14 px-4 rounded-2xl text-base text-[#1C1209]"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1.5,
                      borderColor: username.length > 0 ? '#C44D30' : '#E5D9D0',
                    }}
                  />
                </View>

                {/* Email */}
                <View className="gap-2">
                  <Text className="text-xs font-semibold tracking-wider text-[#6B5540] uppercase">
                    Email
                  </Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    placeholder="you@example.com"
                    placeholderTextColor="#C4AFA5"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                    className="h-14 px-4 rounded-2xl text-base text-[#1C1209]"
                    style={{
                      backgroundColor: 'white',
                      borderWidth: 1.5,
                      borderColor: email.length > 0 ? '#C44D30' : '#E5D9D0',
                    }}
                  />
                </View>

                {/* PIN */}
                <View className="gap-3">
                  <View>
                    <Text className="text-xs font-semibold tracking-wider text-[#6B5540] uppercase">
                      Create a 4-digit PIN
                    </Text>
                    <Text className="text-xs text-[#9B8A7A] mt-0.5">
                      You'll use this to sign in to your account.
                    </Text>
                  </View>
                  <PinInput value={pin} onChange={setPin} />
                </View>
              </View>

              {/* ── Error banner ── */}
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
                  onPress={handleSignup}
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
                      Create account
                    </Text>
                  )}
                </Pressable>

                <Pressable
                  onPress={() => router.replace('/(auth)/signin')}
                  className="items-center py-2 active:opacity-70">
                  <Text className="text-sm" style={{ color: '#C44D30', fontWeight: '600' }}>
                    Already have an account? Sign in
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
