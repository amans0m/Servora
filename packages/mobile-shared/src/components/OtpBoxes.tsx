import React, { useRef } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

export interface OtpBoxesProps {
  length?: number;
  value: string;
  onChangeText?: (v: string) => void;
  editable?: boolean; // engineer entering the code
  locked?: boolean; // customer side before payment — blurred placeholder
}

/** Four large digit boxes — capture or display start/completion codes. */
export function OtpBoxes({ length = 4, value, onChangeText, editable, locked }: OtpBoxesProps) {
  const t = useTheme();
  const inputRef = useRef<TextInput>(null);
  const cells = Array.from({ length });

  return (
    <Pressable
      style={styles.row}
      onPress={() => editable && inputRef.current?.focus()}
      accessibilityLabel="OTP code"
    >
      {editable ? (
        <TextInput
          ref={inputRef}
          value={value}
          onChangeText={(v) => onChangeText?.(v.replace(/\D/g, '').slice(0, length))}
          keyboardType="number-pad"
          maxLength={length}
          style={styles.hiddenInput}
          autoFocus
        />
      ) : null}
      {cells.map((_, i) => {
        const char = locked ? '•' : (value[i] ?? '');
        const filled = !locked && Boolean(value[i]);
        return (
          <View
            key={i}
            style={[
              styles.cell,
              {
                borderColor: filled ? t.colors.primary : t.colors.line,
                backgroundColor: filled ? t.colors.primarySoft : t.colors.surface,
                borderRadius: t.radius.sm,
              },
            ]}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: '800',
                color: locked ? t.colors.muted : t.colors.primary,
                opacity: locked ? 0.4 : 1,
              }}
            >
              {char}
            </Text>
          </View>
        );
      })}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  cell: { width: 50, height: 58, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
});
