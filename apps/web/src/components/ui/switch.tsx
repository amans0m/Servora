'use client';

import * as React from 'react';
import * as SwitchPrimitive from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

export function Switch({
  checked,
  onCheckedChange,
  'aria-label': ariaLabel,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  'aria-label'?: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={ariaLabel}
      className={cn(
        'relative h-6 w-11 rounded-full border border-line transition-colors',
        checked ? 'bg-success' : 'bg-surface-alt',
      )}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          'block h-5 w-5 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-5' : 'translate-x-0.5',
        )}
      />
    </SwitchPrimitive.Root>
  );
}
