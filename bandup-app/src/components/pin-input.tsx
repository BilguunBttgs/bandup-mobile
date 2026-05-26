import { useRef } from 'react';
import { Pressable, TextInput, View } from 'react-native';

interface PinInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
}

/**
 * A 4-dot PIN input. Tapping anywhere on the row focuses a hidden TextInput;
 * each digit is shown as a filled dot in its own box.
 */
export function PinInput({ value, onChange, length = 4 }: PinInputProps) {
  const inputRef = useRef<TextInput>(null);

  return (
    <Pressable
      onPress={() => inputRef.current?.focus()}
      className="flex-row gap-3 justify-center">
      {Array.from({ length }).map((_, i) => {
        const filled = i < value.length;
        const active = i === value.length;
        return (
          <View
            key={i}
            className={`w-14 h-14 rounded-2xl items-center justify-center border-2 ${
              filled
                ? 'border-[#C44D30] bg-[#C44D30]/10'
                : active
                  ? 'border-[#C44D30] bg-white'
                  : 'border-stone-200 bg-stone-50'
            }`}>
            {filled && <View className="w-3 h-3 rounded-full bg-[#C44D30]" />}
          </View>
        );
      })}

      {/* Hidden real input — keyboard, cursor, and value all live here */}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, length))}
        keyboardType="number-pad"
        maxLength={length}
        caretHidden
        style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
      />
    </Pressable>
  );
}
