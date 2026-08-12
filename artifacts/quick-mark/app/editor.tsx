import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { readWatermarkEnabled, writeSavedImage } from '@/lib/storage';
import { IconButton } from '@workspace/quick-mark-system/components/native/icon-button';
import { useColors } from '@workspace/quick-mark-system/hooks/use-colors';

type Tool = 'adjust' | 'filter' | 'markup';
type MarkupTool = 'pen' | 'rectangle' | 'blur';
type Point = { x: number; y: number };
type Stroke = { id: string; points: Point[]; color: string; width: number };
type Box = { id: string; x: number; y: number; width: number; height: number; type: 'rectangle' | 'blur' };

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

export default function EditorScreen() {
  const colors = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { uri: rawUri } = useLocalSearchParams<{ uri?: string }>();
  const uri = typeof rawUri === 'string' ? rawUri : '';
  const canvasRef = useRef<View>(null);
  const strokeId = useRef<string | null>(null);
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
  const [sliderWidth, setSliderWidth] = useState(1);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [boxes, setBoxes] = useState<Box[]>([]);
  const [draft, setDraft] = useState<Box | null>(null);
  const [history, setHistory] = useState<{ strokes: Stroke[]; boxes: Box[] }[]>([]);
  const [redo, setRedo] = useState<{ strokes: Stroke[]; boxes: Box[] }[]>([]);

  useEffect(() => { void readWatermarkEnabled().then(setWatermarkEnabled); }, []);

  const frame = useMemo(() => {
    const { width: cw, height: ch } = canvasSize;
    if (!cw || !ch || !imageSize.width || !imageSize.height) return { x: 0, y: 0, width: cw, height: ch };
    const scale = Math.min(cw / imageSize.width, ch / imageSize.height);
    const width = imageSize.width * scale;
    const height = imageSize.height * scale;
    return { x: (cw - width) / 2, y: (ch - height) / 2, width, height };
  }, [canvasSize, imageSize]);

  const snapshot = () => {
    setHistory(current => [...current, { strokes, boxes }].slice(-30));
    setRedo([]);
  };

  const normalize = (x: number, y: number): Point => ({
    x: clamp((x - frame.x) / frame.width),
    y: clamp((y - frame.y) / frame.height),
  });

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'markup',
    onMoveShouldSetPanResponder: () => tool === 'markup',
    onPanResponderGrant: event => {
      if (tool !== 'markup') return;
      const { locationX, locationY } = event.nativeEvent;
      if (locationX < frame.x || locationX > frame.x + frame.width || locationY < frame.y || locationY > frame.y + frame.height) return;
      snapshot();
      gestureStart.current = { x: locationX, y: locationY };
      if (markupTool === 'pen') {
        const id = makeId();
        strokeId.current = id;
        setStrokes(current => [...current, { id, points: [normalize(locationX, locationY)], color, width: strokeWidth }]);
      }
    },
    onPanResponderMove: event => {
      const { locationX, locationY } = event.nativeEvent;
      if (markupTool === 'pen' && strokeId.current) {
        setStrokes(current => current.map(item => item.id === strokeId.current ? { ...item, points: [...item.points, normalize(locationX, locationY)] } : item));
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
        if (next.width > 0.01 && next.height > 0.01) setBoxes(current => [...current, next]);
      }
      strokeId.current = null;
      gestureStart.current = null;
      setDraft(null);
    },
    onPanResponderTerminate: () => { strokeId.current = null; gestureStart.current = null; setDraft(null); },
  }), [tool, markupTool, color, strokeWidth, frame, strokes, boxes]);

  const undo = () => {
    const previous = history.at(-1);
    if (!previous) return;
    setRedo(current => [...current, { strokes, boxes }]);
    setHistory(current => current.slice(0, -1));
    setStrokes(previous.strokes); setBoxes(previous.boxes);
  };
  const redoLast = () => {
    const next = redo.at(-1);
    if (!next) return;
    setHistory(current => [...current, { strokes, boxes }]);
    setRedo(current => current.slice(0, -1));
    setStrokes(next.strokes); setBoxes(next.boxes);
  };
  const eraseLastMark = () => {
    if (!strokes.length && !boxes.length) return;
    snapshot();
    if (strokes.length) setStrokes(current => current.slice(0, -1));
    else setBoxes(current => current.slice(0, -1));
  };
  const copyImage = async () => {
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
        annotationCount: strokes.length + boxes.length,
        notePreview: `${strokes.length + boxes.length || 'No'} mark${strokes.length + boxes.length === 1 ? '' : 's'}`,
      });
      await Clipboard.setImageAsync(output);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace('/');
    } catch {
      Alert.alert('Không thể lưu ảnh', 'Vui lòng thử lại.');
    } finally { setSaving(false); }
  };

  const sliderResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => tool === 'adjust',
    onMoveShouldSetPanResponder: () => tool === 'adjust',
    onPanResponderGrant: event => setValue(clamp(event.nativeEvent.locationX / sliderWidth)),
    onPanResponderMove: event => {
      setValue(clamp(event.nativeEvent.locationX / sliderWidth));
    },
  }), [tool, sliderWidth]);

  if (!uri) return <View style={styles.empty}><Text style={styles.emptyText}>Chưa chọn ảnh</Text><Pressable onPress={() => router.back()}><Text style={styles.link}>Quay lại</Text></Pressable></View>;

  const activeBox = (box: Box) => (
    <Rect key={box.id} x={frame.x + box.x * frame.width} y={frame.y + box.y * frame.height} width={box.width * frame.width} height={box.height * frame.height} rx={3}
      fill={box.type === 'blur' ? 'rgba(20,20,20,0.56)' : 'none'} stroke={box.type === 'blur' ? '#FFFFFF' : color} strokeWidth={box.type === 'blur' ? 1 : strokeWidth} strokeDasharray={box.type === 'blur' ? '5 4' : undefined} />
  );

  return (
    <View style={[styles.screen, { backgroundColor: colors.editorBackground, paddingTop: insets.top + 8, paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.firstRow}>
        <Pressable accessibilityLabel="Hủy chỉnh sửa" onPress={() => router.back()} style={styles.topPill}><Text style={styles.topPillText}>Hủy</Text></Pressable>
        <Pressable accessibilityLabel="Hoàn tất và lưu" onPress={finishEditing} disabled={saving} style={[styles.topPill, styles.donePill, saving && styles.disabled]}><Text style={[styles.topPillText, styles.doneText]}>{saving ? 'Đang lưu' : 'Xong'}</Text></Pressable>
      </View>
      <View style={styles.titleRow}>
        <View style={styles.historyPill}><IconButton accessibilityLabel="Hoàn tác" size="compact" variant="ghost" onPress={undo}><Ionicons name="arrow-undo" size={21} color={history.length ? colors.foreground : colors.mutedForeground} /></IconButton><IconButton accessibilityLabel="Làm lại" size="compact" variant="ghost" onPress={redoLast}><Ionicons name="arrow-redo" size={21} color={redo.length ? colors.foreground : colors.mutedForeground} /></IconButton></View>
        <Text style={styles.modeTitle}>{tool === 'markup' ? 'ĐÁNH DẤU' : tool === 'filter' ? 'BỘ LỌC' : 'ĐIỀU CHỈNH'}</Text>
        <View style={styles.actionPill}><IconButton accessibilityLabel="Đánh dấu" size="compact" variant="ghost" onPress={() => setTool('markup')}><Ionicons name="pencil-outline" size={21} color={colors.foreground} /></IconButton><IconButton accessibilityLabel="Sao chép ảnh" size="compact" variant="ghost" onPress={copyImage}><Ionicons name="copy-outline" size={20} color={colors.foreground} /></IconButton></View>
      </View>

      <View ref={canvasRef} collapsable={false} style={styles.photoArea} onLayout={event => setCanvasSize(event.nativeEvent.layout)} {...panResponder.panHandlers}>
        <Image
          source={{ uri }}
          resizeMode="contain"
          style={StyleSheet.absoluteFill}
          onLoad={event => {
            // Web's Image onLoad event has no `nativeEvent.source`; using it
            // unconditionally crashed the editor before the canvas rendered.
            const source = event.nativeEvent?.source;
            if (source?.width && source?.height) {
              setImageSize({ width: source.width, height: source.height });
            }
          }}
        />
        {filter !== 'original' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: FILTERS.find(item => item.id === filter)?.overlay }]} /> : null}
        {adjustment !== 'auto' ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: adjustment === 'exposure' ? (value >= .5 ? '#FFFFFF' : '#000000') : '#000000', opacity: Math.abs(value - .5) * (adjustment === 'exposure' ? .44 : .36) }]} /> : null}
        <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width={canvasSize.width} height={canvasSize.height}>
          {boxes.map(activeBox)}
          {draft ? activeBox(draft) : null}
          {strokes.map(stroke => <Path key={stroke.id} d={pathFor(stroke.points, frame)} fill="none" stroke={stroke.color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" />)}
        </Svg>
        {watermarkEnabled ? <View pointerEvents="none" style={styles.watermark}><Text style={styles.watermarkText}>TIKSNAP</Text></View> : null}
      </View>

      {tool === 'markup' ? <View style={styles.markupPanel}>
        <View style={styles.markupTools}>{(['pen', 'rectangle', 'blur'] as MarkupTool[]).map(item => <Pressable key={item} onPress={() => setMarkupTool(item)} style={[styles.markupButton, markupTool === item && styles.markupButtonActive]}><Ionicons name={item === 'pen' ? 'pencil' : item === 'rectangle' ? 'square-outline' : 'eye-off-outline'} size={18} color="#FFF" /></Pressable>)}<Pressable accessibilityLabel="Xóa nét cuối" onPress={eraseLastMark} style={styles.markupButton}><Ionicons name="trash-outline" size={18} color="#FFF" /></Pressable></View>
        <View style={styles.colors}>{COLORS.map(item => <Pressable key={item} onPress={() => setColor(item)} style={[styles.colorDot, { backgroundColor: item }, color === item && styles.colorSelected]} />)}</View>
        <View style={styles.widths}>{[3, 5, 8].map(item => <Pressable key={item} onPress={() => setStrokeWidth(item)} style={[styles.widthButton, strokeWidth === item && styles.widthActive]}><View style={{ width: item + 5, height: item + 5, borderRadius: 20, backgroundColor: '#FFF' }} /></Pressable>)}</View>
      </View> : tool === 'filter' ? <View style={styles.filterPanel}>{FILTERS.map(item => <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[styles.filterChip, filter === item.id && styles.filterChipActive]}><View style={[styles.filterPreview, { backgroundColor: item.overlay === 'transparent' ? '#76777A' : item.overlay }]} /><Text style={styles.filterText}>{item.label}</Text></Pressable>)}</View> : <>
        <View style={styles.adjustments}>{ADJUSTMENTS.map((item) => <Pressable key={item.id} onPress={() => setAdjustment(item.id)} style={styles.adjustment}><View style={[styles.adjustCircle, adjustment === item.id && styles.adjustCircleActive]}><Ionicons name={item.icon as any} size={28} color="#F5F5F5" /></View><Text style={styles.adjustText}>{item.label}</Text></Pressable>)}</View>
        <View style={styles.slider} onLayout={event => setSliderWidth(Math.max(event.nativeEvent.layout.width, 1))} {...sliderResponder.panHandlers}><View style={styles.sliderTrack}>{Array.from({ length: 31 }, (_, index) => <View key={index} style={[styles.tick, index === 15 && styles.centerTick, index % 5 === 0 && styles.majorTick]} />)}</View><View style={[styles.sliderKnob, { left: `${value * 100}%` }]} /></View>
      </>}
      <View style={styles.bottomDock}>{[
        ['adjust', 'radio-button-on-outline', 'Điều chỉnh'], ['filter', 'color-filter-outline', 'Bộ lọc'], ['markup', 'pencil-outline', 'Đánh dấu'],
      ].map(([id, icon, label]) => <Pressable key={id} onPress={() => setTool(id as Tool)} style={styles.dockItem}><Ionicons name={icon as any} size={30} color={tool === id ? '#FFF' : '#A7A7AA'} /><Text style={[styles.dockText, tool === id && styles.dockTextActive]}>{label}</Text>{tool === id && <View style={styles.selectionDot} />}</Pressable>)}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 16 }, empty: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', gap: 12 }, emptyText: { color: '#FFF', fontSize: 18 }, link: { color: '#0A84FF', fontSize: 17 },
  firstRow: { height: 44, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 6 }, topPill: { minWidth: 70, height: 34, borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, borderColor: '#363638', backgroundColor: '#151516', alignItems: 'center', justifyContent: 'center' }, topPillText: { color: '#FFF', fontSize: 15, fontWeight: '600' }, donePill: { backgroundColor: '#2A4EA0', borderColor: '#5E8CFA' }, doneText: { color: '#FFFFFF' }, disabled: { opacity: .55 },
  titleRow: { height: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, historyPill: { minWidth: 76, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#303033', backgroundColor: '#161617', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 2 }, modeTitle: { color: '#BEBEC2', fontWeight: '600', fontSize: 13, letterSpacing: .4 }, actionPill: { minWidth: 76, height: 36, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: '#303033', backgroundColor: '#161617', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 2 },
  photoArea: { flex: 1, minHeight: 240, marginHorizontal: 28, marginBottom: 10 }, watermark: { position: 'absolute', right: 10, bottom: 10, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 5, backgroundColor: 'rgba(0,0,0,.42)' }, watermarkText: { color: '#FFF', fontSize: 8, letterSpacing: 1.1, fontWeight: '800' }, adjustments: { height: 76, flexDirection: 'row', justifyContent: 'center', gap: 25, alignItems: 'center' }, adjustment: { alignItems: 'center', gap: 5 }, adjustCircle: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, borderColor: '#7B7B7D', alignItems: 'center', justifyContent: 'center' }, adjustCircleActive: { backgroundColor: '#3A3A3C', borderColor: '#6D91FA' }, adjustText: { color: '#C6C6C8', fontSize: 10, maxWidth: 58, textAlign: 'center' },
  slider: { height: 44, justifyContent: 'center', marginHorizontal: 30 }, sliderTrack: { height: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, tick: { width: 1, height: 13, backgroundColor: '#4B4B4D', borderRadius: 2 }, majorTick: { height: 18, backgroundColor: '#737376' }, centerTick: { height: 35, width: 2, backgroundColor: '#8B8B8D' }, sliderKnob: { position: 'absolute', width: 2, height: 34, backgroundColor: '#F4F4F4', borderRadius: 2, marginLeft: -1 },
  bottomDock: { alignSelf: 'center', minHeight: 58, borderRadius: 29, borderWidth: StyleSheet.hairlineWidth, borderColor: '#343436', backgroundColor: '#171718', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', paddingHorizontal: 8 }, dockItem: { minWidth: 60, height: 48, alignItems: 'center', justifyContent: 'center', gap: 1 }, dockText: { color: '#A7A7AA', fontSize: 10, fontWeight: '600' }, dockTextActive: { color: '#FFF' }, selectionDot: { position: 'absolute', top: 1, width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFD60A' },
  markupPanel: { minHeight: 100, marginHorizontal: 8, marginBottom: 5, borderRadius: 16, backgroundColor: '#1B1B1D', padding: 8, gap: 6 }, markupTools: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, markupButton: { width: 33, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, markupButtonActive: { backgroundColor: '#3A3A3C' }, colors: { flexDirection: 'row', justifyContent: 'center', gap: 10 }, colorDot: { width: 18, height: 18, borderRadius: 10 }, colorSelected: { borderWidth: 2, borderColor: '#8E8E93' }, widths: { flexDirection: 'row', justifyContent: 'center', gap: 8 }, widthButton: { width: 28, height: 20, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }, widthActive: { backgroundColor: '#3A3A3C' },
  filterPanel: { height: 100, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 14 }, filterChip: { alignItems: 'center', gap: 6 }, filterChipActive: { transform: [{ scale: 1.06 }] }, filterPreview: { width: 46, height: 46, borderRadius: 14, borderWidth: 2, borderColor: '#55555A' }, filterText: { color: '#D1D1D6', fontSize: 11 },
});
