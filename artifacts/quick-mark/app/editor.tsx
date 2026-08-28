import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect, Text as SvgText } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { readWatermarkEnabled, writeSavedImage, readEditorDraft, writeEditorDraft, clearEditorDraft } from '@/lib/storage';
import { IconButton } from '@workspace/quick-mark-system/components/native/icon-button';
import { useColors } from '@workspace/quick-mark-system/hooks/use-colors';
import { useHistory } from '@/lib/historyManager';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { debounce } from 'lodash';
import { EditorCanvas } from '../features/editor/components/EditorCanvas';
import { LayerPanel } from '../features/editor/components/LayerPanel';
import { useLayers } from '../features/editor/hooks/useLayers';

const triggerSelection = () => Haptics.selectionAsync();
const triggerImpact = () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

type Tool = 'adjust' | 'filter' | 'markup' | 'sticker';
type MarkupTool = 'pen' | 'rectangle' | 'blur';
type Point = { x: number; y: number };
type Suggestion = { kind: 'text' | 'ticker' | 'emoji'; value: string };
type Stroke = { id: string; points: Point[]; color: string; width: number };
type Box = { id: string; x: number; y: number; width: number; height: number; type: 'rectangle' | 'blur' };

type LayerType = 'stroke' | 'box' | 'sticker';

interface Layer {
  id: string;
  type: LayerType;
  data: any;
  visible: boolean;
  zIndex: number;
}

const COLORS = ['#FFFFFF', '#FF453A', '#FF9F0A', '#FFD60A', '#30D158', '#0A84FF', '#BF5AF2'];
const ADJUSTMENTS = [
  { id: 'auto', icon: 'sparkles-outline', label: 'Tự động' },
  { id: 'exposure', icon: 'add-circle-outline', label: 'Phơi sáng' },
  { id: 'brilliance', icon: 'contrast-outline', label: 'Rực rỡ' },
];
const FILTERS = [
  { id: 'original', label: 'Gốc', overlay: 'transparent' },
  { id: 'cool', label: 'Mát', overlay: 'rgba(66, 133, 244, 0.16)' },
  { id: 'warm', label: 'Ấm', overlay: 'rgba(255, 149, 0, 0.15)' },
  { id: 'mono', label: 'Đơn sắc', overlay: 'rgba(0, 0, 0, 0.40)' },
];

const makeId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

function pathFor(points: Point[], frame: { x: number; y: number; width: number; height: number }) {
  return points.map((point, index) => `${index ? 'L' : 'M'} ${frame.x + point.x * frame.width} ${frame.y + point.y * frame.height}`).join(' ');
}

const MemoizedPath = React.memo(({ stroke, frame }: { stroke: Stroke; frame: any }) => (
  <Path d={pathFor(stroke.points, frame)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />
));

const MemoizedBox = React.memo(({ box, frame, color, strokeWidth }: { box: Box; frame: any; color: string; strokeWidth: number }) => (
  <Rect x={frame.x + box.x * frame.width} y={frame.y + box.y * frame.height} width={box.width * frame.width} height={box.height * frame.height} rx={3}
      fill={box.type === 'blur' ? 'rgba(20,20,20,0.56)' : 'none'} stroke={box.type === 'blur' ? '#FFFFFF' : color} strokeWidth={box.type === 'blur' ? 1 : strokeWidth} strokeDasharray={box.type === 'blur' ? '5 4' : undefined} />
));

const ToolPanel = ({ children }: { children: React.ReactNode }) => (
  <Animated.View entering={FadeInDown.duration(200)} exiting={FadeOutDown.duration(200)}>
    <BlurView intensity={40} tint="dark" style={styles.blurPanel}>
      {children}
    </BlurView>
  </Animated.View>
);

export default function EditorScreen() {
  const {
    layers,
    addLayer,
    undo,
    redo,
    canUndo,
    canRedo,
    deleteLayer,
    updateLayerData,
    selectLayer,
    selectedLayerId,
    restore,
  } = useLayers();
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uri: rawUri } = useLocalSearchParams<{ uri?: string }>();
  const uri = typeof rawUri === 'string' ? rawUri : '';
  const canvasRef = useRef<View>(null);
  const strokeId = useRef<string | null>(null);
  const strokePoints = useRef<Point[]>([]);
  const gestureStart = useRef<Point | null>(null);

  const [tool, setTool] = useState<Tool>('adjust');
  const [markupTool, setMarkupTool] = useState<MarkupTool>('pen');
  const [color, setColor] = useState('#FF453A');
  const [strokeWidth, setStrokeWidth] = useState(5);
  const [value, setValue] = useState(0.5);
  const [adjustment, setAdjustment] = useState('auto');
  const [filter, setFilter] = useState('original');
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [isComparing, setIsComparing] = useState(false);
  const [draft, setDraft] = useState<Box | null>(null);
  const [selectedPoint, setSelectedPoint] = useState<Point | null>(null);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [captionBusy, setCaptionBusy] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [canvasPan, setCanvasPan] = useState({ x: 0, y: 0 });
  const canvasPanStart = useRef({ x: 0, y: 0 });
  const [textValue, setTextValue] = useState('Ghi chú');
  const [textColor, setTextColor] = useState('#FFFFFF');
  const [textShadow, setTextShadow] = useState(true);
  const restoredDraft = useRef(false);

  useEffect(() => { void readWatermarkEnabled().then(setWatermarkEnabled); }, []);
  useEffect(() => {
    if (!uri) return;
    void readEditorDraft(uri).then((draft) => { if (draft) restore(draft); restoredDraft.current = true; });
  }, [uri, restore]);
  useEffect(() => {
    if (!uri || !restoredDraft.current) return;
    const timer = setTimeout(() => { void writeEditorDraft(uri, { layers, selectedLayerId }); }, 350);
    return () => clearTimeout(timer);
  }, [uri, layers, selectedLayerId]);

  const frame = useMemo(() => {
    const { width: cw, height: ch } = canvasSize;
    if (!cw || !ch || !imageSize.width || !imageSize.height) return { x: 0, y: 0, width: cw, height: ch };
    const scale = Math.min(cw / imageSize.width, ch / imageSize.height);
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    return { x: (cw - width) / 2, y: (ch - height) / 2, width, height };
  }, [canvasSize, imageSize]);

  // Touch coordinates are reported in the untransformed photo container,
  // while the image is rendered with scale/translation. Convert them back to
  // the original canvas before normalizing, otherwise strokes drift at 125%+.
  const normalize = (screenX: number, screenY: number): Point => {
    const centerX = canvasSize.width / 2;
    const centerY = canvasSize.height / 2;
    const x = centerX + (screenX - canvasPan.x - centerX) / zoom;
    const y = centerY + (screenY - canvasPan.y - centerY) / zoom;
    return { x: clamp((x - frame.x) / frame.width), y: clamp((y - frame.y) / frame.height) };
  };

  const suggestForPoint = (point: Point): Suggestion[] => {
    const zone = point.y < 0.33 ? 'Khoảnh khắc đáng nhớ' : point.y > 0.66 ? 'Một ngày thật tuyệt' : 'Điều làm mình mỉm cười';
    return [
      { kind: 'text', value: zone },
      { kind: 'ticker', value: '#TIKSNAP  #khoanhkhac' },
      { kind: 'emoji', value: point.x < 0.33 ? '✨' : point.x > 0.66 ? '🔥' : '💖' },
    ];
  };

  const selectImagePoint = (event: any) => {
    if (tool === 'markup' || !frame.width || !frame.height) return;
    const point = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
    if (point.x <= 0 || point.x >= 1 || point.y <= 0 || point.y >= 1) return;
    triggerSelection();
    setSelectedPoint(point);
    setSuggestions(suggestForPoint(point));
  };

  const applySuggestion = (suggestion: Suggestion) => {
    const point = selectedPoint ?? { x: 0.5, y: 0.5 };
    triggerImpact();
    if (suggestion.kind === 'emoji') {
      addLayer({ id: makeId(), type: 'sticker', data: { uri: suggestion.value, x: point.x, y: point.y }, visible: true, zIndex: layers.length });
    } else {
      void Clipboard.setStringAsync(suggestion.value);
      Alert.alert('Đã sao chép gợi ý', suggestion.value);
    }
  };
  const requestAiCaption = async () => {
    const base = process.env.EXPO_PUBLIC_API_URL || '';
    if (!base) { Alert.alert('AI caption', 'Hãy cấu hình EXPO_PUBLIC_API_URL để bật AI Vision.'); return; }
    setCaptionBusy(true);
    try {
      const response = await fetch(`${base.replace(/\/$/, '')}/api/caption`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ image: uri }) });
      const result = await response.json() as { text?: string; error?: string };
      if (!response.ok) throw new Error(result.error || 'AI request failed');
      if (result.text) { setSuggestions([{ kind: 'text', value: result.text }]); Alert.alert('Caption từ AI', result.text); }
    } catch (error) { Alert.alert('Không thể tạo caption', error instanceof Error ? error.message : 'Vui lòng thử lại.'); } finally { setCaptionBusy(false); }
  };

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'markup' || zoom > 1,
    onMoveShouldSetPanResponder: () => tool === 'markup' || zoom > 1,
    onPanResponderGrant: event => {
      if (isComparing) return;
      if (zoom > 1 && tool !== 'markup') { canvasPanStart.current = canvasPan; gestureStart.current = { x: event.nativeEvent.locationX, y: event.nativeEvent.locationY }; return; }
      if (tool !== 'markup') return;
      triggerSelection();
      const { locationX, locationY } = event.nativeEvent;
      const imagePoint = normalize(locationX, locationY);
      if (imagePoint.x <= 0 || imagePoint.x >= 1 || imagePoint.y <= 0 || imagePoint.y >= 1) return;
      gestureStart.current = { x: locationX, y: locationY };
      if (markupTool === 'pen') {
        const id = makeId();
        strokeId.current = id;
        strokePoints.current = [normalize(locationX, locationY)];
        addLayer({ id, type: 'stroke', data: { points: strokePoints.current, color, width: strokeWidth }, visible: true, zIndex: layers.length });
      }
    },
    onPanResponderMove: event => {
      const { locationX, locationY } = event.nativeEvent;
      if (tool !== 'markup' && zoom > 1) { setCanvasPan({ x: canvasPanStart.current.x + locationX - gestureStart.current?.x!, y: canvasPanStart.current.y + locationY - gestureStart.current?.y! }); return; }
      if (markupTool === 'pen' && strokeId.current) {
        const point = normalize(locationX, locationY);
        const previous = strokePoints.current[strokePoints.current.length - 1];
        if (!previous || Math.abs(point.x - previous.x) + Math.abs(point.y - previous.y) > 0.002) {
          strokePoints.current = [...strokePoints.current, point];
          updateLayerData(strokeId.current, { points: strokePoints.current });
        }
      } else if (gestureStart.current && (markupTool === 'rectangle' || markupTool === 'blur')) {
        const start = gestureStart.current;
        const a = normalize(start.x, start.y);
        const b = normalize(locationX, locationY);
        setDraft({ id: 'draft', type: markupTool, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) });
      }
    },
    onPanResponderRelease: event => {
      if (gestureStart.current && (markupTool === 'rectangle' || markupTool === 'blur')) {
        const a = normalize(gestureStart.current.x, gestureStart.current.y);
        const b = normalize(event.nativeEvent.locationX, event.nativeEvent.locationY);
        const next = { id: makeId(), type: markupTool, x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) } as Box;
        if (next.width > 0.01 && next.height > 0.01) addLayer({ id: next.id, type: 'box', data: next, visible: true, zIndex: layers.length });
      }
      strokeId.current = null;
      strokePoints.current = [];
      gestureStart.current = null;
      setDraft(null);
    },
    onPanResponderTerminate: () => { strokeId.current = null; strokePoints.current = []; gestureStart.current = null; setDraft(null); },
  }), [tool, markupTool, color, strokeWidth, frame, isComparing, layers.length, addLayer, updateLayerData, zoom, canvasPan, canvasSize]);

  const undoLast = () => { undo(); triggerImpact(); };
  const redoLast = () => { redo(); triggerImpact(); };
  const eraseLastMark = () => {
    if (!layers.length) return;
    triggerSelection();
    deleteLayer(layers[layers.length - 1].id);
  };

  const copyImage = async () => {
    triggerSelection();
    if (!canvasRef.current) return;
    try {
      const output = await captureRef(canvasRef, { format: 'png', quality: 1 });
      await Clipboard.setImageAsync(output);
      Alert.alert('Đã sao chép', 'Ảnh đã sẵn sàng để dán vào ứng dụng khác.');
    } catch { Alert.alert('Không thể sao chép ảnh', 'Vui lòng thử lại.'); }
  };

  const finishEditing = async () => {
    if (!canvasRef.current || saving) return;
    setSaving(true);
    try {
      const output = await captureRef(canvasRef, { format: 'png', quality: 1 });
      await writeSavedImage({
        id: makeId(), uri: output, createdAt: new Date().toISOString(),
        annotationCount: layers.length,
        notePreview: `${layers.length || 'No'} mark${layers.length === 1 ? '' : 's'}`,
      });
      await clearEditorDraft(uri);
      await Clipboard.setImageAsync(output);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch {
      Alert.alert('Không thể lưu ảnh', 'Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  if (!uri) return <View style={styles.empty}><Text style={styles.emptyText}>Chưa chọn ảnh</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Quay lại</Text></Pressable></View>;

  return (
    <View style={[styles.screen, { backgroundColor: colors.editorBackground, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.firstRow}>
        <Pressable accessibilityLabel="Hủy chỉnh sửa" onPress={() => { triggerSelection(); router.back(); }} style={styles.topPill}><Text style={styles.topPillText}>Hủy</Text></Pressable>
        <Pressable accessibilityLabel="Hoàn tất và lưu" onPress={() => { triggerImpact(); finishEditing(); }} disabled={saving} style={[styles.topPill, styles.donePill, saving && styles.disabled]}><Text style={[styles.topPillText, styles.doneText]}>{saving ? 'Đang lưu' : 'Xong'}</Text></Pressable>
      </View>
      <View style={styles.titleRow}>
        <View style={styles.historyPill}>
          <IconButton accessibilityLabel="Hoàn tác" size="compact" variant="ghost" onPress={undoLast}>
            <Ionicons name="arrow-undo" size={21} color={canUndo ? colors.foreground : colors.mutedForeground} />
          </IconButton>
          <IconButton accessibilityLabel="Làm lại" size="compact" variant="ghost" onPress={redoLast}>
            <Ionicons name="arrow-redo" size={21} color={canRedo ? colors.foreground : colors.mutedForeground} />
          </IconButton>
          <IconButton accessibilityLabel="Layers" size="compact" variant="ghost" onPress={() => setShowLayerPanel(!showLayerPanel)}>
            <Ionicons name="layers-outline" size={21} color={showLayerPanel ? '#FFD60A' : colors.foreground} />
          </IconButton>
        </View>
        <Text style={styles.modeTitle}>{tool === 'markup' ? 'ĐÁNH DẤU' : tool === 'filter' ? 'BỘ LỌC' : tool === 'sticker' ? 'NHÃN DÁN' : 'ĐIỀU CHỈNH'}</Text>
        <View style={styles.actionPill}><IconButton accessibilityLabel="Đánh dấu" size="compact" variant="ghost" onPress={() => { triggerSelection(); setTool('markup'); }}><Ionicons name="pencil-outline" size={21} color={colors.foreground} /></IconButton><IconButton accessibilityLabel="Sao chép ảnh" size="compact" variant="ghost" onPress={copyImage}><Ionicons name="copy-outline" size={20} color={colors.foreground} /></IconButton></View>
      </View>

      <View ref={canvasRef} collapsable={false} style={styles.photoArea} onLayout={e => setCanvasSize(e.nativeEvent.layout)} {...panResponder.panHandlers}>
        <View style={styles.zoomControls}>
          <Pressable accessibilityLabel="Thu nhỏ" style={styles.zoomButton} onPress={() => { triggerSelection(); setZoom(value => Math.max(1, Number((value - 0.25).toFixed(2)))); }}><Ionicons name="remove" size={20} color="#FFF" /></Pressable>
          <Pressable accessibilityLabel="Đặt lại zoom" style={styles.zoomValue} onPress={() => setZoom(1)}><Text style={styles.zoomText}>{Math.round(zoom * 100)}%</Text></Pressable>
          <Pressable accessibilityLabel="Phóng to" style={styles.zoomButton} onPress={() => { triggerSelection(); setZoom(value => Math.min(3, Number((value + 0.25).toFixed(2)))); }}><Ionicons name="add" size={20} color="#FFF" /></Pressable>
        </View>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPressIn={() => setIsComparing(true)}
          onPressOut={() => setIsComparing(false)}
          onPress={selectImagePoint}
        >
          <Image
            source={{ uri }}
            resizeMode="contain"
            style={[StyleSheet.absoluteFill, { transform: [{ translateX: canvasPan.x }, { translateY: canvasPan.y }, { scale: zoom }] }]}
            onLoad={event => {
              const source = event.nativeEvent?.source;
              if (source?.width && source?.height) {
                setImageSize({ width: source.width, height: source.height });
              }
            }}
          />
          {!isComparing && (
            <>
        {filter !== 'original' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FILTERS.find(item => item.id === filter)?.overlay }]} /> : null}
        {adjustment !== 'auto' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: adjustment === 'exposure' ? (value >= .5 ? '#FFFFFF' : '#000000') : '#000000', opacity: Math.abs(value - .5) * (adjustment === 'exposure' ? .44 : .36) }]} /> : null}
            </>
      )}
        </Pressable>
        {!isComparing && <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { transform: [{ translateX: canvasPan.x }, { translateY: canvasPan.y }, { scale: zoom }] }]}><EditorCanvas frame={frame} canvasSize={canvasSize} layers={layers} updateLayerData={updateLayerData} selectLayer={selectLayer} selectedLayerId={selectedLayerId} deleteLayer={deleteLayer} /></View>}
        {selectedPoint && !isComparing && tool !== 'markup' ? (
          <View pointerEvents="none" style={[styles.selectionMarker, { left: frame.x + selectedPoint.x * frame.width - 13, top: frame.y + selectedPoint.y * frame.height - 13 }]}><Ionicons name="sparkles" size={22} color="#FFD60A" /></View>
        ) : null}
        {watermarkEnabled ? <View pointerEvents="none" style={styles.watermark}><Text style={styles.watermarkText}>TIKSNAP</Text></View> : null}
      </View>

      {showLayerPanel && <LayerPanel onClose={() => setShowLayerPanel(false)} />}

      {suggestions.length > 0 && tool !== 'markup' ? (
        <ToolPanel>
          <View style={styles.suggestionPanel}>
            <View style={styles.suggestionTitle}><Ionicons name="sparkles" size={16} color="#FFD60A" /><Text style={styles.suggestionTitleText}>Gợi ý cho vùng đã chọn</Text><Pressable onPress={requestAiCaption} disabled={captionBusy}><Text style={styles.aiButton}>{captionBusy ? '...' : 'AI'}</Text></Pressable><Pressable onPress={() => setSuggestions([])}><Ionicons name="close" size={18} color="#A7A7AA" /></Pressable></View>
            <View style={styles.suggestionRow}>{suggestions.map((item) => <Pressable key={`${item.kind}-${item.value}`} onPress={() => applySuggestion(item)} style={styles.suggestionChip}><Text style={styles.suggestionKind}>{item.kind === 'text' ? 'TEXT' : item.kind === 'ticker' ? 'TICKER' : 'EMOJI'}</Text><Text style={styles.suggestionValue}>{item.value}</Text></Pressable>)}</View>
          </View>
        </ToolPanel>
      ) : null}

      {tool === 'markup' ? (
        <ToolPanel>
          <View style={styles.markupPanel}>
            <View style={styles.markupTools}>{(['pen', 'rectangle', 'blur'] as MarkupTool[]).map(item => <Pressable key={item} onPress={() => setMarkupTool(item)} style={[styles.markupButton, markupTool === item && styles.markupButtonActive]}><Ionicons name={item === 'pen' ? 'pencil' : item === 'rectangle' ? 'square-outline' : 'eye-off-outline'} size={18} color="#FFF" /></Pressable>)}<Pressable accessibilityLabel="Xóa nét cuối" onPress={eraseLastMark} style={styles.markupButton}><Ionicons name="trash-outline" size={18} color="#FFF" /></Pressable></View>
            <View style={styles.colors}>{COLORS.map(item => <Pressable key={item} onPress={() => setColor(item)} style={[styles.colorDot, { backgroundColor: item }, color === item && styles.colorSelected]} />)}</View>
            <View style={styles.widths}>{[3, 5, 8].map(item => <Pressable key={item} onPress={() => setStrokeWidth(item)} style={[styles.widthButton, strokeWidth === item && styles.widthActive]}><View style={{ width: item + 5, height: item + 5, borderRadius: 20, backgroundColor: '#FFF' }} /></Pressable>)}</View>
          </View>
        </ToolPanel>
      ) : tool === 'sticker' ? (
        <ToolPanel>
          <View style={styles.stickerPanel}>
             {['✨', '🔥', '🚀', '✅', '💡'].map(s => (
               <Pressable key={s} onPress={() => addLayer({ id: makeId(), type: 'sticker', data: { uri: s, x: 0.5, y: 0.5 }, visible: true, zIndex: layers.length })}>
                 <Text style={{ fontSize: 30 }}>{s}</Text>
               </Pressable>
             ))}
          </View>
          <View style={styles.textEditorRow}><TextInput value={textValue} onChangeText={setTextValue} placeholder="Nhập chữ trên ảnh" placeholderTextColor="#888" style={styles.textInput} /><Pressable onPress={() => { if (!textValue.trim()) return; addLayer({ id: makeId(), type: 'text', data: { text: textValue.trim(), x: 0.5, y: 0.5, color: textColor, fontSize: 24, shadow: textShadow }, visible: true, zIndex: layers.length }); }} style={styles.addTextButton}><Text style={styles.addTextLabel}>Thêm chữ</Text></Pressable></View>
          <View style={styles.textOptions}><Text style={styles.optionLabel}>Màu</Text>{COLORS.slice(0, 5).map(item => <Pressable key={item} onPress={() => setTextColor(item)} style={[styles.colorDot, { backgroundColor: item }, textColor === item && styles.colorSelected]} />)}<Pressable onPress={() => setTextShadow(value => !value)}><Text style={styles.shadowToggle}>{textShadow ? 'Bóng: bật' : 'Bóng: tắt'}</Text></Pressable></View>
        </ToolPanel>
      ) : tool === 'filter' ? (
        <ToolPanel>
          <View style={styles.filterPanel}>
            {FILTERS.map(item => <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[styles.filterButton, filter === item.id && styles.filterButtonActive]}><View style={[styles.filterSwatch, { backgroundColor: item.overlay === 'transparent' ? '#777' : item.overlay }]} /><Text style={styles.filterLabel}>{item.label}</Text></Pressable>)}
          </View>
        </ToolPanel>
      ) : (
        <ToolPanel>
          <View style={styles.adjustments}>
            {ADJUSTMENTS.map(item => <Pressable key={item.id} onPress={() => { setAdjustment(item.id); setValue(item.id === 'auto' ? .5 : value); }} style={[styles.adjustButton, adjustment === item.id && styles.adjustButtonActive]}><Ionicons name={item.icon as any} size={20} color="#FFF" /><Text style={styles.adjustLabel}>{item.label}</Text></Pressable>)}
          </View>
        </ToolPanel>
      )}

      <View style={styles.bottomDock}>{[
        ['adjust', 'radio-button-on-outline', 'Điều chỉnh'], ['filter', 'color-filter-outline', 'Bộ lọc'], ['markup', 'pencil-outline', 'Đánh dấu'], ['sticker', 'happy-outline', 'Nhãn dán'],
      ].map(([id, icon, label]) => <Pressable key={id} onPress={() => setTool(id as Tool)} style={styles.dockItem}><Ionicons name={icon as any} size={30} color={tool === id ? '#FFF' : '#A7A7AA'} /><Text style={[styles.dockText, tool === id && styles.dockTextActive]}>{label}</Text>{tool === id && <View style={styles.selectionDot} />}</Pressable>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 }, empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyText: { color: '#FFF', fontSize: 18 }, link: { color: '#0A84FF', fontSize: 17 },
  firstRow: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 }, topPill: { minWidth: 70, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, borderColor: '#363638', backgroundColor: '#151516', alignItems: 'center', justifyContent: 'center' }, topPillText: { color: '#FFF', fontSize: 15, fontWeight: '600' }, donePill: { backgroundColor: '#2A4EA0', borderColor: '#5E8CFA' }, doneText: { color: '#FFFFFF' }, disabled: { opacity: .55 },
  titleRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, historyPill: { minWidth: 76, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#303033', backgroundColor: '#161617', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 2 }, modeTitle: { color: '#BEBEC2', fontWeight: '600', fontSize: 13, letterSpacing: .4 }, actionPill: { minWidth: 76, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#303033', backgroundColor: '#161617', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 2 },
  photoArea: { flex: 1, minHeight: 240, marginHorizontal: 28, marginBottom: 10 }, watermark: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: 'rgba(0,0,0,.42)' }, watermarkText: { color: '#FFF', fontSize: 8, letterSpacing: 1.1, fontWeight: '800' }, adjustments: { height: 76, flexDirection: 'row', justifyContent: 'center', gap: 25, alignItems: 'center' },
  bottomDock: { alignSelf: 'center', minHeight: 58, borderRadius: 29, borderWidth: StyleSheet.hairlineWidth, borderColor: '#343436', backgroundColor: '#171718', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }, dockItem: { minWidth: 60, height: 48, alignItems: 'center', justifyContent: 'center', gap: 1 }, dockText: { color: '#A7A7AA', fontSize: 10, fontWeight: '600' }, dockTextActive: { color: '#FFF' }, selectionDot: { position: 'absolute', top: 1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD60A' },
  markupPanel: { gap: 6 }, markupTools: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, markupButton: { width: 33, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, markupButtonActive: { backgroundColor: '#3A3A3C' }, colors: { flexDirection: 'row', justifyContent: 'center', gap: 10 }, colorDot: { width: 18, height: 18, borderRadius: 10 }, colorSelected: { borderWidth: 2, borderColor: '#8E8E93' }, widths: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, widthButton: { width: 28, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, widthActive: { backgroundColor: '#3A3A3C' },
  filterPanel: { height: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 10 }, filterButton: { alignItems: 'center', gap: 5, padding: 5, borderRadius: 10 }, filterButtonActive: { backgroundColor: '#3A3A3C' }, filterSwatch: { width: 38, height: 38, borderRadius: 10 }, filterLabel: { color: '#FFF', fontSize: 10 },
  stickerPanel: { height: 60, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20 },
  textEditorRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }, textInput: { flex: 1, height: 38, borderRadius: 10, backgroundColor: '#29292C', color: '#FFF', paddingHorizontal: 10 }, addTextButton: { height: 38, borderRadius: 10, backgroundColor: '#2A4EA0', paddingHorizontal: 12, justifyContent: 'center' }, addTextLabel: { color: '#FFF', fontWeight: '700', fontSize: 12 }, textOptions: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }, optionLabel: { color: '#AAA', fontSize: 11 }, shadowToggle: { color: '#FFD60A', fontSize: 11, marginLeft: 5 },
  adjustButton: { alignItems: 'center', gap: 4, padding: 7, borderRadius: 10 }, adjustButtonActive: { backgroundColor: '#3A3A3C' }, adjustLabel: { color: '#FFF', fontSize: 10 },
  blurPanel: { marginHorizontal: 8, marginBottom: 5, borderRadius: 20, overflow: 'hidden', padding: 10 },
  selectionMarker: { position: 'absolute', width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,.58)' },
  suggestionPanel: { gap: 9 }, suggestionTitle: { flexDirection: 'row', alignItems: 'center', gap: 7 }, suggestionTitleText: { flex: 1, color: '#FFF', fontWeight: '700', fontSize: 13 }, suggestionRow: { flexDirection: 'row', gap: 7 }, suggestionChip: { flex: 1, minHeight: 46, borderRadius: 12, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#29292C' }, suggestionKind: { color: '#FFD60A', fontSize: 9, fontWeight: '800', letterSpacing: .5 }, suggestionValue: { color: '#FFF', fontSize: 12, marginTop: 3 },
  aiButton: { color: '#FFD60A', fontWeight: '800', fontSize: 11, paddingHorizontal: 5 },
  zoomControls: { position: 'absolute', zIndex: 20, top: 12, right: 8, height: 34, borderRadius: 17, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(20,20,22,.82)', borderWidth: StyleSheet.hairlineWidth, borderColor: '#555' }, zoomButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center' }, zoomValue: { minWidth: 48, alignItems: 'center' }, zoomText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
});
