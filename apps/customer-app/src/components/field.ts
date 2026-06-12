import type { TextStyle } from 'react-native';
import type { Theme } from '@servora/mobile-shared';

/** Shared text-input style matching the prototype's fields. */
export function fieldStyle(t: Theme): TextStyle {
  return {
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
    color: t.colors.ink,
    borderRadius: t.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  };
}
