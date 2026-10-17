import { useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';

import { AppText } from '@/components/ui/app-text';
import { useAppTheme } from '@/theme/theme-provider';

const otpLength = 6;

type OtpCodeInputProps = {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  label?: string;
};

export function OtpCodeInput({ value, onChange, onBlur, error, label = 'Six-digit code' }: OtpCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);
  const { colors, radius, spacing } = useAppTheme();
  const digits = Array.from({ length: otpLength }, (_, index) => value[index] ?? '');
  const activeIndex = Math.min(value.length, otpLength - 1);

  function updateValue(nextValue: string) {
    onChange(nextValue.replace(/\D/g, '').slice(0, otpLength));
  }

  return (
    <View style={{ gap: spacing.sm }}>
      <AppText variant="caption">{label}</AppText>
      <View style={{ position: 'relative' }}>
        <Pressable
          accessible={false}
          onPress={() => inputRef.current?.focus()}>
          <View
            accessible={false}
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            pointerEvents="none"
            style={{ flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm }}>
            {digits.map((digit, index) => {
              const isActive = isFocused && index === activeIndex;

              return (
                <View
                  key={index}
                  style={{
                    minWidth: 0,
                    maxWidth: 48,
                    height: 52,
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderWidth: isActive ? 2 : 1,
                    borderColor: error ? colors.danger : isActive ? colors.primary : colors.border,
                    borderRadius: radius.lg,
                    backgroundColor: colors.surface,
                  }}>
                  <AppText variant="subtitle">{digit}</AppText>
                </View>
              );
            })}
          </View>
        </Pressable>

        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={updateValue}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
          selection={{ start: value.length, end: value.length }}
          accessibilityLabel={label}
          accessibilityHint="Enter or paste the six-digit code from your email"
          autoCapitalize="none"
          autoComplete="one-time-code"
          autoCorrect={false}
          caretHidden
          inputMode="numeric"
          returnKeyType="done"
          spellCheck={false}
          style={{ position: 'absolute', top: 0, left: 0, width: 1, height: 1, opacity: 0 }}
        />
      </View>
      {error ? <AppText variant="caption" tone="danger">{error}</AppText> : null}
    </View>
  );
}
