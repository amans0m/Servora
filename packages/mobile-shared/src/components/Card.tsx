import React from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';

/** White (surface) rounded container — groups related info. */
export function Card({ style, children, ...rest }: ViewProps) {
  const t = useTheme();
  return (
    <View
      {...rest}
      style={[
        {
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.line,
          padding: 16,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
