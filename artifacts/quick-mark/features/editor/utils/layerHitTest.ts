import { Layer } from '../types';

export const isHit = (layer: Layer, x: number, y: number, frame: any): boolean => {
  if (layer.type === 'stroke') return false;
  const data = layer.data as { x: number; y: number };
  const layerX = frame.x + data.x * frame.width;
  const layerY = frame.y + data.y * frame.height;
  
  const distance = Math.sqrt(Math.pow(x - layerX, 2) + Math.pow(y - layerY, 2));
  return distance < 40; // 40px threshold
};
