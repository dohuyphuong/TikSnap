import { useColorScheme } from 'react-native';
import { nativeTheme } from '../lib/native-theme';

export function useColors() {
  const scheme = useColorScheme();
  const palette =
    scheme === 'dark' ? nativeTheme.colors.dark : nativeTheme.colors.light;

  return {
    ...palette,
    radius: nativeTheme.radius,
    spacing: nativeTheme.spacing,
    fonts: nativeTheme.fonts,
  };
}