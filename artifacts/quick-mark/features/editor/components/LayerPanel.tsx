import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useLayers } from '../hooks/useLayers';
import { Layer } from '../types';

interface LayerPanelProps {
  onClose: () => void;
}

export const LayerPanel: React.FC<LayerPanelProps> = ({ onClose }) => {
  const { layers, selectedLayerId, toggleVisibility, deleteLayer, selectLayer } = useLayers();

  const getIcon = (type: string) => {
    switch (type) {
      case 'stroke': return 'pencil';
      case 'box': return 'square-outline';
      case 'sticker': return 'happy-outline';
      case 'text': return 'text-outline';
      default: return 'layers-outline';
    }
  };

  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutDown} style={styles.container}>
      <BlurView intensity={80} tint="dark" style={styles.blur}>
        <View style={styles.header}>
          <Text style={styles.title}>Layers</Text>
          <Pressable onPress={onClose}><Ionicons name="close" size={20} color="#FFF" /></Pressable>
        </View>
        {layers.length === 0 ? (
          <Text style={styles.empty}>No layers yet</Text>
        ) : (
          layers.map((layer) => (
            <Pressable
              key={layer.id}
              style={[styles.row, selectedLayerId === layer.id && styles.selectedRow]}
              onPress={() => selectLayer(layer.id)}
            >
              <Ionicons name={getIcon(layer.type) as any} size={20} color="#FFF" />
              <Text style={styles.label}>{layer.type} #{layer.id.slice(-3)}</Text>
              <Pressable onPress={() => toggleVisibility(layer.id)}>
                <Ionicons name={layer.visible ? 'eye' : 'eye-off'} size={20} color="#AAA" />
              </Pressable>
              <Pressable onPress={() => deleteLayer(layer.id)}>
                <Ionicons name="trash" size={20} color="#FF453A" />
              </Pressable>
            </Pressable>
          ))
        )}
      </BlurView>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: { position: 'absolute', bottom: 80, left: 16, right: 16, borderRadius: 20, overflow: 'hidden' },
  blur: { padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  title: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 12, borderRadius: 8 },
  selectedRow: { backgroundColor: 'rgba(255,255,255,0.1)' },
  label: { color: '#FFF', flex: 1 },
  empty: { color: '#AAA', textAlign: 'center', padding: 20 },
});
