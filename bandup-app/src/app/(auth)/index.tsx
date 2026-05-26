import { useRouter } from 'expo-router';
import { Pressable, StatusBar, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// ─── Mascot ───────────────────────────────────────────────────────────────────
// Replace this component with a real <Image> once the asset is ready.
function Mascot() {
  return (
    <View className="relative items-center justify-center">
      {/* Body */}
      <View
        className="w-28 h-32 rounded-[32px] items-center justify-center"
        style={{ backgroundColor: '#C44D30' }}>
        {/* Face */}
        <View className="items-center gap-1 mb-2">
          <View className="flex-row gap-3 mb-1">
            <View className="w-2 h-2 rounded-full bg-[#1C1209]" />
            <View className="w-2 h-2 rounded-full bg-[#1C1209]" />
          </View>
          {/* Smile */}
          <View
            className="w-6 h-3 rounded-b-full border-b-2 border-x-2 border-[#1C1209]"
            style={{ borderTopWidth: 0 }}
          />
        </View>
        {/* Lines (book/card) */}
        <View
          className="w-14 rounded-lg px-2 py-2 gap-1"
          style={{ backgroundColor: 'rgba(245,238,230,0.85)' }}>
          <View className="h-1 rounded-full bg-[#C44D30]/50" />
          <View className="h-1 rounded-full bg-[#C44D30]/50 w-3/4" />
          <View className="h-1 rounded-full bg-[#C44D30]/50" />
        </View>
      </View>
      {/* Shadow */}
      <View className="w-24 h-3 rounded-full bg-black/10 -mt-1" />
      {/* Star decoration */}
      <Text className="absolute -top-1 -right-2 text-xl">⭐</Text>
    </View>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <View className="flex-1" style={{ backgroundColor: '#F5EEE6' }}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5EEE6" />

      <SafeAreaView className="flex-1 px-6">
        {/* ── Hero section ── */}
        <View className="flex-1 items-center justify-center gap-5">
          <Mascot />

          <View className="items-center gap-2 mt-2">
            <Text
              className="text-5xl text-[#1C1209]"
              style={{ fontWeight: '800', letterSpacing: -1 }}>
              Bandup
            </Text>
            <Text className="text-base text-[#6B5540] text-center leading-6 px-4">
              Your IELTS coach in your pocket.{'\n'}
              Practice daily, watch your band score climb.
            </Text>
          </View>

          {/* Badge */}
          <View
            className="flex-row items-center gap-2 px-5 py-2.5 rounded-full"
            style={{ backgroundColor: '#E8D5A3' }}>
            <Text className="text-sm" style={{ color: '#6B5A1E' }}>
              📈
            </Text>
            <Text
              className="text-xs tracking-widest"
              style={{ color: '#6B5A1E', fontWeight: '700' }}>
              BUILT FOR BAND 5.5 → 8.0
            </Text>
          </View>
        </View>

        {/* ── CTA section ── */}
        <View className="gap-4 pb-8">
          {/* Primary: Continue with email */}
          <Pressable
            onPress={() => router.push('/(auth)/signup')}
            className="flex-row items-center justify-center gap-3 py-4 rounded-2xl active:opacity-80"
            style={{ backgroundColor: '#C44D30' }}>
            <Text className="text-lg text-white" style={{ fontWeight: '600' }}>
              ✉️  Continue with email
            </Text>
          </Pressable>

          {/* Secondary: Sign in */}
          <Pressable
            onPress={() => router.push('/(auth)/signin')}
            className="items-center py-3 active:opacity-70">
            <Text className="text-base" style={{ color: '#C44D30', fontWeight: '600' }}>
              I already have an account
            </Text>
          </Pressable>

          {/* Legal */}
          <Text className="text-xs text-[#9B8A7A] text-center">
            By continuing you agree to our Terms &amp; Privacy.
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}
