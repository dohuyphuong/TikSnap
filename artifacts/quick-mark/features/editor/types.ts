export type LayerType = 'stroke' | 'box' | 'sticker' | 'text';

export interface BaseLayerData {
  x: number;
  y: number;
  scale?: number;
  rotation?: number;
}

export interface StrokeData {
  points: { x: number; y: number }[];
  color: string;
  width: number;
}

export interface BoxData extends BaseLayerData {
  width: number;
  height: number;
  type: 'rectangle' | 'blur';
  color?: string;
  strokeWidth?: number;
}

export interface StickerData extends BaseLayerData {
  uri: string;
}

export interface TextData extends BaseLayerData {
  text: string;
  color?: string;
  fontSize?: number;
  fontFamily?: string;
  shadow?: boolean;
}

export interface Layer {
  id: string;
  type: LayerType;
  data: any;
  visible: boolean;
  zIndex: number;
}

export interface EditorState {
  layers: Layer[];
  selectedLayerId: string | null;
}
