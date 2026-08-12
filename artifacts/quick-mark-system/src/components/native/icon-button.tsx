import type { ComponentProps, ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { useColors } from '../../hooks/use-colors';

type IconButtonProps = Omit<ComponentProps<typeof Pressable>, 'children'> & {
  children: ReactNode;
  size?: 'compact' | 'default';
  variant?: 'ghost' | 'surface' | 'primary';
};

/** A compact, accessible tap target for a single icon or short visual action. */
export function IconButton({
  children,
  size = 'default',
  variant = 'surface',
  style,
  ...props
}: IconButtonProps) {
  const colors = useColors();
  const dimension = size === 'compact' ? 36 : 42;
  const backgroundColor =
    variant === 'primary'
      ? colors.primary
      : variant === 'surface'
        ? colors.card
        : 'transparent';

  return (
    <Pressable
      accessibilityRole="button"
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          backgroundColor,
          borderColor: variant === 'surface' ? colors.border : 'transparent',
          opacity: pressed ? 0.72 : 1,
        },
        typeof style === 'function' ? style({ pressed }) : style,
      ]}
      {...props}
    >
      <View pointerEvents="none">{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
  },
});
