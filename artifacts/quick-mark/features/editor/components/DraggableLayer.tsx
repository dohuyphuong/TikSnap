import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, runOnJS, withSpring } from 'react-native-reanimated';
import { Layer } from '../types';

interface Props { 
  layer: Layer; 
  onDragEnd: (id: string, x: number, y: number, scale?: number, rotation?: number) => void; 
  canvasSize: { width: number; height: number }; 
  onSelect?: (id: string) => void; 
  children: React.ReactNode; 
}

export const DraggableLayer: React.FC<Props> = ({ layer, onDragEnd, canvasSize, onSelect, children }) => {
  const position = layer.data as { x: number; y: number };
  
  // Shared values for high performance
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const scale = useSharedValue((position as any).scale ?? 1);
  const rotation = useSharedValue((position as any).rotation ?? 0);
  const startScale = useSharedValue(scale.value);
  const startRotation = useSharedValue(rotation.value);

  const panGesture = useMemo(() => Gesture.Pan()
      .onStart(() => {
        startX.value = translateX.value;
        startY.value = translateY.value;
        if (onSelect) runOnJS(onSelect)(layer.id);
      })
      .onUpdate((event) => {
        translateX.value = startX.value + event.translationX;
        translateY.value = startY.value + event.translationY;
      })
      .onEnd(() => {
        // Calculate new normalized position
        const finalX = Math.max(0, Math.min(1, position.x + translateX.value / Math.max(canvasSize.width, 1)));
        const finalY = Math.max(0, Math.min(1, position.y + translateY.value / Math.max(canvasSize.height, 1)));
        
        runOnJS(onDragEnd)(layer.id, finalX, finalY);
        
        // Reset translation for next gesture session
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      }), [canvasSize.width, canvasSize.height, layer.id, onDragEnd, onSelect, position.x, position.y]);
  const pinchGesture = useMemo(() => Gesture.Pinch().onStart(() => { startScale.value = scale.value; }).onUpdate((e) => { scale.value = Math.max(0.35, Math.min(4, startScale.value * e.scale)); }).onEnd(() => { runOnJS(onDragEnd)(layer.id, position.x, position.y, scale.value, rotation.value); }), [layer.id, onDragEnd, position.x, position.y]);
  const rotationGesture = useMemo(() => Gesture.Rotation().onStart(() => { startRotation.value = rotation.value; }).onUpdate((e) => { rotation.value = startRotation.value + e.rotation * 180 / Math.PI; }).onEnd(() => { runOnJS(onDragEnd)(layer.id, position.x, position.y, scale.value, rotation.value); }), [layer.id, onDragEnd, position.x, position.y]);
  const composed = Gesture.Simultaneous(panGesture, pinchGesture, rotationGesture);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value }
      , { scale: scale.value }, { rotate: `${rotation.value}deg` }
    ],
  }));

  return (
    <GestureDetector gesture={composed}>
      <Animated.View style={animatedStyle}>
        {children}
      </Animated.View>
    </GestureDetector>
  );
};
