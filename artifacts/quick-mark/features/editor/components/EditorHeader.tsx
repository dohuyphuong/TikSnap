import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

import { IconButton } from '@workspace/quick-mark-system/components/native/icon-button';
import { useColors } from '@workspace/quick-mark-system/hooks/use-colors';

/** Shared header material for editor flows that need navigation and history actions. */
export function EditorHeader() {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <IconButton accessibilityLabel="Go back" variant="ghost">
        <Ionicons name="arrow-back-outline" size={21} color={colors.foreground} />
      </IconButton>
      <View style={styles.actions}>
        <IconButton accessibilityLabel="Undo" size="compact" variant="ghost">
          <Ionicons name="arrow-undo-outline" size={19} color={colors.foreground} />
        </IconButton>
        <IconButton accessibilityLabel="Redo" size="compact" variant="ghost">
          <Ionicons name="arrow-redo-outline" size={19} color={colors.foreground} />
        </IconButton>
      </View>
      <IconButton accessibilityLabel="Finish editing" variant="primary">
        <Ionicons name="checkmark" size={21} color={colors.primaryForeground} />
      </IconButton>
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 2 },
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 8,
  },
});
