import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  onToolSelect: (tool: string) => void;
  activeTool: string;
}

export const PhotoEditorToolbar = ({ onToolSelect, activeTool }: Props) => {
  const tools = [
    { id: 'cleanup', icon: 'trash-outline' },
    { id: 'styles', icon: 'color-palette-outline' },
    { id: 'adjust', icon: 'contrast-outline' },
    { id: 'crop', icon: 'crop-outline' },
  ];

  return (
    <View style={styles.container}>
      {tools.map((tool) => (
        <TouchableOpacity 
          key={tool.id} 
          style={styles.button} 
          onPress={() => onToolSelect(tool.id)}
        >
          <Ionicons 
            name={tool.icon as any} 
            size={24} 
            color={activeTool === tool.id ? '#0A84FF' : '#FFFFFF'} 
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};

export const PhotoEditorHeader = () => {
  return (
    <View style={styles.headerContainer}>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="arrow-back-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="checkmark-done-outline" size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.headerButton}>
        <Ionicons name="arrow-undo-outline" size={24} color="#FFFFFF" />
        <Ionicons name="arrow-redo-outline" size={24} color="#FFFFFF" style={styles.redoUndoIcons} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 20,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  button: { padding: 10 },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#0A84FF',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  headerButton: {
    padding: 10,
    flexDirection: 'row',
  },
  redoUndoIcons: {
    marginLeft: 10,
  },
});

