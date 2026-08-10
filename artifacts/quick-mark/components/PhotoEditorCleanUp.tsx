// src/components/PhotoEditorCleanUp.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const PhotoEditorCleanUp: React.FC<{ imageUri: string }> = ({ imageUri }) => {
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Render the image and drawing canvas here */}
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default PhotoEditorCleanUp;