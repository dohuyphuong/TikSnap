// Preserved composition of the editor materials while the route is being refined.
import React from 'react';
import { View, StyleSheet } from 'react-native';
import EditorCanvas from './components/EditorCanvas';
import { EditorHeader } from './components/EditorHeader';
import { EditorToolbar } from './components/EditorToolbar';

const LegacyPhotoEditorScreen: React.FC = () => {
  return (
    <View style={styles.container}>
      <EditorHeader />
      <EditorCanvas frame={{ x: 0, y: 0, width: 0, height: 0 }} canvasSize={{ width: 0, height: 0 }} />
      <EditorToolbar activeTool="cleanup" onToolSelect={() => {}} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
});

export default LegacyPhotoEditorScreen;
