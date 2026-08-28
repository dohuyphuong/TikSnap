import React from 'react';
import { View, StyleSheet, Pressable, Text, PanResponder } from 'react-native';
import Svg from 'react-native-svg';
import { LayerRenderer } from './LayerRenderer';
import { DraggableLayer } from './DraggableLayer';
import { Layer } from '../types';

interface EditorCanvasProps {
  frame: { x: number; y: number; width: number; height: number };
  canvasSize?: { width: number; height: number };
  layers?: Layer[];
  updateLayerData?: (id: string, data: Record<string, any>) => void;
  selectLayer?: (id: string | null) => void;
  selectedLayerId?: string | null;
  deleteLayer?: (id: string) => void;
}

const ResizeHandle = ({ corner, onResize }: { corner: string; onResize: (dx: number, dy: number) => void }) => {
  const responder = React.useMemo(() => PanResponder.create({ onStartShouldSetPanResponder: () => true, onMoveShouldSetPanResponder: () => true, onPanResponderRelease: (_, g) => onResize(g.dx, g.dy) }), [onResize]);
  return <View {...responder.panHandlers} style={[styles.handle, corner === 'nw' ? styles.handleNW : corner === 'ne' ? styles.handleNE : corner === 'sw' ? styles.handleSW : styles.handleSE]} />;
};

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ frame, canvasSize = { width: 0, height: 0 }, layers = [], updateLayerData = () => {}, selectLayer = () => {}, selectedLayerId = null, deleteLayer = () => {} }) => {

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      <Svg style={StyleSheet.absoluteFill} width={canvasSize.width} height={canvasSize.height} pointerEvents="none">
        {layers.map((layer) => (
          <LayerRenderer key={layer.id} layer={layer} frame={frame} />
        ))}
      </Svg>
      
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {layers.filter(l => l.type === 'stroke').map((layer) => {
          const points = layer.data as { points: { x: number; y: number }[] };
          const anchor = points.points[Math.floor(points.points.length / 2)] ?? { x: 0.5, y: 0.5 };
          const dragLayer = { ...layer, data: { x: anchor.x, y: anchor.y } } as Layer;
          return <DraggableLayer key={`select-${layer.id}`} layer={dragLayer} canvasSize={canvasSize} onSelect={selectLayer} onDragEnd={(id, x, y) => { const dx = x - anchor.x; const dy = y - anchor.y; updateLayerData(id, { points: points.points.map(point => ({ x: Math.max(0, Math.min(1, point.x + dx)), y: Math.max(0, Math.min(1, point.y + dy)) })) }); }}><View pointerEvents="none" style={[styles.strokeTarget, { left: frame.x + anchor.x * frame.width - 24, top: frame.y + anchor.y * frame.height - 24, borderColor: selectedLayerId === layer.id ? '#FFD60A' : 'transparent' }]} />{selectedLayerId === layer.id ? <Pressable accessibilityLabel="Xóa nét vẽ" onPress={() => deleteLayer(layer.id)} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable> : null}</DraggableLayer>;
        })}
        {layers.filter(l => l.type === 'sticker' || l.type === 'box' || l.type === 'text').map((layer) => (
          <DraggableLayer
            key={`drag-${layer.id}`}
            layer={layer}
            canvasSize={canvasSize}
            onSelect={selectLayer}
            onDragEnd={(id, x, y, scale, rotation) => updateLayerData(id, { x, y, ...(scale === undefined ? {} : { scale }), ...(rotation === undefined ? {} : { rotation }) })}
          >
            <View 
              style={[
                styles.touchTarget,
                { 
                  position: 'absolute',
                  left: frame.x + (layer.data as { x: number }).x * frame.width - 25,
                  top: frame.y + (layer.data as { y: number }).y * frame.height - 25,
                  borderColor: selectedLayerId === layer.id ? '#FFD60A' : 'transparent',
                  borderWidth: selectedLayerId === layer.id ? 2 : 0,
                }
              ]}
            />
            {selectedLayerId === layer.id ? <Pressable accessibilityLabel="Xóa đối tượng" onPress={() => deleteLayer(layer.id)} style={styles.deleteButton}><Text style={styles.deleteText}>×</Text></Pressable> : null}
            {selectedLayerId === layer.id && layer.type === 'box' ? <View style={styles.selectionFrame}>{['nw', 'ne', 'sw', 'se'].map(corner => <ResizeHandle key={corner} corner={corner} onResize={(dx, dy) => { const data = layer.data as any; const dw = dx / Math.max(frame.width, 1); const dh = dy / Math.max(frame.height, 1); const left = corner.includes('w'); const top = corner.includes('n'); const width = Math.max(0.04, data.width + (left ? -dw : dw)); const height = Math.max(0.04, data.height + (top ? -dh : dh)); const x = left ? data.x + data.width - width : data.x; const y = top ? data.y + data.height - height : data.y; updateLayerData(layer.id, { x: Math.max(0, x), y: Math.max(0, y), width, height }); }} />)}</View> : null}
          </DraggableLayer>
        ))}
      </View>
    </View>
  );
};

export default EditorCanvas;

const styles = StyleSheet.create({
  touchTarget: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderStyle: 'dashed',
  },
  strokeTarget: { position: 'absolute', width: 48, height: 48, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed' },
  deleteButton: { position: 'absolute', right: -10, top: -10, width: 24, height: 24, borderRadius: 12, backgroundColor: '#FF453A', alignItems: 'center', justifyContent: 'center', zIndex: 10 }, deleteText: { color: '#FFF', fontSize: 20, lineHeight: 22, fontWeight: '700' }
  ,selectionFrame: { position: 'absolute', left: -4, top: -4, width: 58, height: 58, borderWidth: 1, borderColor: '#FFD60A' }, handle: { position: 'absolute', width: 8, height: 8, borderRadius: 2, backgroundColor: '#FFD60A' }, handleNW: { left: -4, top: -4 }, handleNE: { right: -4, top: -4 }, handleSW: { left: -4, bottom: -4 }, handleSE: { right: -4, bottom: -4 }
});
