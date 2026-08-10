// src/screens/PhotoEditorScreen.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import PhotoEditorCanvas from '../components/PhotoEditorCanvas';
import { PhotoEditorHeader, PhotoEditorToolbar } from '../components/PhotoEditorToolbar';

const PhotoEditorScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <PhotoEditorHeader />
      <PhotoEditorCanvas imageUri="your_image_uri_here" />
      <PhotoEditorToolbar activeTool="cleanup" onToolSelect={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default PhotoEditorScreen;
