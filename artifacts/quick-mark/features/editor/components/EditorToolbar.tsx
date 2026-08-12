import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EditorToolbarProps {
  onToolSelect: (tool: string) => void;
  activeTool: string;
}

export const EditorToolbar = ({ onToolSelect, activeTool }: EditorToolbarProps) => {
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
});
