import React from 'react';
import { Path, Rect, Text as SvgText } from 'react-native-svg';
import { Layer, StrokeData, BoxData, StickerData, TextData } from '../types';

interface LayerRendererProps {
  layer: Layer;
  frame: { x: number; y: number; width: number; height: number };
}

export const LayerRenderer: React.FC<LayerRendererProps> = ({ layer, frame }) => {
  if (!layer.visible) return null;

  switch (layer.type) {
    case 'stroke': {
      const data = layer.data as StrokeData;
      const d = data.points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${frame.x + p.x * frame.width} ${frame.y + p.y * frame.height}`)
        .join(' ');
      return (
        <Path
          d={d}
          fill="none"
          stroke={data.color}
          strokeWidth={data.width}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      );
    }
    case 'box': {
      const data = layer.data as BoxData;
      return (
        <Rect
          x={frame.x + data.x * frame.width}
          y={frame.y + data.y * frame.height}
          width={data.width * frame.width}
          height={data.height * frame.height}
          rx={3}
          fill={data.type === 'blur' ? 'rgba(20,20,20,0.56)' : 'none'}
          stroke={data.type === 'blur' ? '#FFFFFF' : (data.color ?? '#FF453A')}
          strokeWidth={data.type === 'blur' ? 1 : (data.strokeWidth ?? 5)}
          strokeDasharray={data.type === 'blur' ? '5 4' : undefined}
          transform={`rotate(${data.rotation ?? 0} ${frame.x + data.x * frame.width} ${frame.y + data.y * frame.height})`}
        />
      );
    }
    case 'sticker': {
      const data = layer.data as StickerData;
      return (
        <SvgText
          x={frame.x + data.x * frame.width}
          y={frame.y + data.y * frame.height}
          fontSize={40 * (data.scale ?? 1)}
          textAnchor="middle"
          alignmentBaseline="middle"
          transform={`rotate(${data.rotation ?? 0} ${frame.x + data.x * frame.width} ${frame.y + data.y * frame.height})`}
        >
          {data.uri}
        </SvgText>
      );
    }
    case 'text': {
      const data = layer.data as TextData;
      return <SvgText x={frame.x + data.x * frame.width} y={frame.y + data.y * frame.height} fill={data.color ?? '#FFFFFF'} fontSize={data.fontSize ?? 24} fontWeight="700" textAnchor="middle" alignmentBaseline="middle" stroke={data.shadow ? '#000000' : 'none'} strokeWidth={data.shadow ? 3 : 0} transform={`rotate(${data.rotation ?? 0} ${frame.x + data.x * frame.width} ${frame.y + data.y * frame.height})`}>{data.text}</SvgText>;
    }
    default:
      return null;
  }
};
