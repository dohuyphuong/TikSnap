// src/components/PhotoEditorCleanUpInterface.tsx
import React, { useState } from 'react';
import { Image, View, StyleSheet, TouchableOpacity, PanResponder } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const PhotoEditorCleanUpInterface: React.FC<{ imageUri: string }> = ({ imageUri }) => {
  const [strokeCoordinates, setStrokeCoordinates] = useState<number[][]>([]);
  const [brushSize, setBrushSize] = useState(20);
  const [isEraserMode, setIsEraserMode] = useState(false);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (event) => {
      const { locationX: x, locationY: y } = event.nativeEvent;
      setStrokeCoordinates(prevCoords => [...prevCoords, [x, y]]);
    },
    onPanResponderRelease: () => {
      // Handle mask coordinate export here
      console.log('Mask coordinates:', strokeCoordinates);
    },
  });

  return (
    <View style={styles.container}>
      <Image source={{ uri: imageUri }} style={styles.image} />
      <View style={styles.canvas} {...panResponder.panHandlers}>
        {strokeCoordinates.map((point, index) => (
          <View key={index} style={[styles.stroke, { left: point[0], top: point[1], width: brushSize, height: brushSize, opacity: isEraserMode ? 0 : 1 }]} />
        ))}
      </View>
      <TouchableOpacity
        style={styles.brushSizeButton}
        onPress={() => setIsEraserMode(!isEraserMode)}
      >
        <Ionicons name={isEraserMode ? 'close-circle-outline' : 'pencil-outline'} size={24} color="#FFFFFF" />
      </TouchableOpacity>
      <View style={styles.slider}><TouchableOpacity onPress={() => setBrushSize(size => Math.min(size + 5, 50))} style={styles.sizeButton}><Ionicons name="add" size={20} color="#FFF" /></TouchableOpacity><TouchableOpacity onPress={() => setBrushSize(size => Math.max(size - 5, 10))} style={styles.sizeButton}><Ionicons name="remove" size={20} color="#FFF" /></TouchableOpacity></View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  stroke: {
    borderRadius: 99,
    backgroundColor: '#FF0000',
  },
  brushSizeButton: {
    position: 'absolute',
    bottom: 50,
    right: 20,
    padding: 10,
  },
  slider: {
    position: 'absolute',
    bottom: 10,
    width: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sizeButton: { padding: 8 },
});

export default PhotoEditorCleanUpInterface;
