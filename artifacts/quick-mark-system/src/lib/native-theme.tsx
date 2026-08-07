import { tokens } from '../generated/tokens';

export const nativeTheme = {
  colors: tokens.color,
  radius: Number.parseFloat(tokens.radius) * 16,
  spacing: Number.parseFloat(tokens.spacing) * 16,
  fonts: {
    regular: 'Inter_400Regular',
    medium: 'Inter_500Medium',
    semibold: 'Inter_600SemiBold',
    bold: 'Inter_700Bold',
  },
} as const;

export type NativeTheme = typeof nativeTheme;