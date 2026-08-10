// src/components/PhotoEditorCanvas.tsx
import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const PhotoEditorCanvas: React.FC<{ imageUri: string }> = ({ imageUri }) => {
  return (
    <GestureHandlerRootView style={styles.container}>
      {/* Render the image here */}
      <Image source={{ uri: imageUri }} style={styles.image} />
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
});

export default PhotoEditorCanvas;
