import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  PanResponder,
  Platform,
  Pressable,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@workspace/quick-mark-system/hooks/use-colors';
import {
  readWatermarkEnabled,
  writeSavedImage,
  writeWatermarkEnabled,
} from '@/lib/storage';

type Tool = 'point' | 'rectangle' | 'text' | 'draw';
type Point = { x: number; y: number };
type Annotation = {
  id: string;
  type: Exclude<Tool, 'draw'>;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  color: string;
};
type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
};

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pointsToPath(points: Point[], width: number, height: number) {
  if (!points.length || !width || !height) return '';
  return points
    .map((point, index) => {
      const command = index === 0 ? 'M' : 'L';
      return `${command} ${point.x * width} ${point.y * height}`;
    })
    .join(' ');
}

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const uri = typeof params.uri === 'string' ? params.uri : '';
  const [tool, setTool] = useState<Tool>('point');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [notePosition, setNotePosition] = useState<Point | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [renderedUri, setRenderedUri] = useState<string | null>(null);
  const [toolbarVisible, setToolbarVisible] = useState(true);
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const canvasRef = useRef<View>(null);
  const gestureStart = useRef<Point | null>(null);
  const activeStrokeId = useRef<string | null>(null);
  const [draftRectangle, setDraftRectangle] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  useEffect(() => {
    void readWatermarkEnabled().then(setWatermark);
  }, []);

  const styles = makeStyles(colors, insets.top, insets.bottom);
  const annotationColors = [colors.chart1, colors.chart2, colors.chart3];

  const normalizePoint = useCallback(
    (x: number, y: number): Point => ({
      x: canvasSize.width ? clamp(x / canvasSize.width, 0, 1) : 0.5,
      y: canvasSize.height ? clamp(y / canvasSize.height, 0, 1) : 0.5,
    }),
    [canvasSize],
  );

  const openNote = useCallback((position: Point, existing?: Annotation) => {
    setSelectedId(existing?.id ?? null);
    setNoteDraft(existing?.text ?? '');
    setNotePosition(position);
  }, []);

  const addPointOrText = useCallback(
    (x: number, y: number) => {
      const position = normalizePoint(x, y);
      if (tool === 'text') {
        openNote(position);
        return;
      }
      if (tool !== 'point') return;
      const id = makeId();
      setSelectedId(id);
      setAnnotations((current) => [
        ...current,
        {
          id,
          type: 'point',
          ...position,
          text: '',
          color: annotationColors[current.length % annotationColors.length],
        },
      ]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [annotationColors, normalizePoint, openNote, tool],
  );

  const finishRectangle = useCallback(
    (x: number, y: number) => {
      if (!gestureStart.current || tool !== 'rectangle') return;
      const start = gestureStart.current;
      const left = Math.min(start.x, x);
      const top = Math.min(start.y, y);
      const width = Math.abs(x - start.x);
      const height = Math.abs(y - start.y);
      gestureStart.current = null;
      setDraftRectangle(null);
      if (width < 18 || height < 18) return;
      const position = normalizePoint(left, top);
      const id = makeId();
      setSelectedId(id);
      setAnnotations((current) => [
        ...current,
        {
          id,
          type: 'rectangle',
          ...position,
          width: canvasSize.width ? width / canvasSize.width : 0.2,
          height: canvasSize.height ? height / canvasSize.height : 0.2,
          text: '',
          color: annotationColors[current.length % annotationColors.length],
        },
      ]);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [annotationColors, canvasSize, normalizePoint, tool],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () =>
          tool === 'rectangle' || tool === 'draw',
        onMoveShouldSetPanResponder: () =>
          tool === 'rectangle' || tool === 'draw',
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          const position = normalizePoint(locationX, locationY);
          gestureStart.current = { x: locationX, y: locationY };
          if (tool === 'rectangle') {
            setDraftRectangle({
              x: locationX,
              y: locationY,
              width: 0,
              height: 0,
            });
          } else if (tool === 'draw') {
            const id = makeId();
            activeStrokeId.current = id;
            setStrokes((current) => [
              ...current,
              {
                id,
                points: [position],
                color: colors.chart1,
                width: 5,
              },
            ]);
          }
        },
        onPanResponderMove: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          if (tool === 'rectangle' && gestureStart.current) {
            setDraftRectangle({
              x: Math.min(gestureStart.current.x, locationX),
              y: Math.min(gestureStart.current.y, locationY),
              width: Math.abs(locationX - gestureStart.current.x),
              height: Math.abs(locationY - gestureStart.current.y),
            });
          }
          if (tool === 'draw' && activeStrokeId.current) {
            const point = normalizePoint(locationX, locationY);
            setStrokes((current) =>
              current.map((stroke) =>
                stroke.id === activeStrokeId.current
                  ? { ...stroke, points: [...stroke.points, point] }
                  : stroke,
              ),
            );
          }
        },
        onPanResponderRelease: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          if (tool === 'rectangle') {
            finishRectangle(locationX, locationY);
          } else {
            gestureStart.current = null;
            activeStrokeId.current = null;
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }
        },
        onPanResponderTerminate: () => {
          gestureStart.current = null;
          activeStrokeId.current = null;
          setDraftRectangle(null);
        },
      }),
    [colors.chart1, finishRectangle, normalizePoint, tool],
  );

  const commitNote = useCallback(() => {
    if (!notePosition || !noteDraft.trim()) {
      if (selectedId) {
        setAnnotations((current) =>
          current.filter((item) => item.id !== selectedId),
        );
      }
      setNotePosition(null);
      setSelectedId(null);
      setNoteDraft('');
      return;
    }
    if (selectedId) {
      setAnnotations((current) =>
        current.map((item) =>
          item.id === selectedId ? { ...item, text: noteDraft.trim() } : item,
        ),
      );
    } else {
      const id = makeId();
      setAnnotations((current) => [
        ...current,
        {
          id,
          type: 'text',
          ...notePosition,
          text: noteDraft.trim(),
          color: annotationColors[current.length % annotationColors.length],
        },
      ]);
    }
    setNotePosition(null);
    setSelectedId(null);
    setNoteDraft('');
  }, [annotationColors, noteDraft, notePosition, selectedId]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setAnnotations((current) =>
      current.filter((item) => item.id !== selectedId),
    );
    setSelectedId(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedId]);

  const captureCanvas = useCallback(async () => {
    if (!canvasRef.current) throw new Error('Canvas is not ready');
    const outputUri = await captureRef(canvasRef, {
      format: 'jpg',
      quality: 0.92,
      result: 'tmpfile',
    });
    setRenderedUri(outputUri);
    return outputUri;
  }, []);

  const saveImage = useCallback(async () => {
    if (!uri || saving) return;
    setSaving(true);
    try {
      const outputUri = await captureCanvas();
      if (Platform.OS !== 'web' && (await MediaLibrary.isAvailableAsync())) {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (permission.granted) {
          await MediaLibrary.saveToLibraryAsync(outputUri);
        }
      }
      await writeSavedImage({
        id: makeId(),
        uri: outputUri,
        createdAt: new Date().toISOString(),
        annotationCount: annotations.length + strokes.length,
        notePreview:
          annotations.find((item) => item.text)?.text || 'Marked photo',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Saved',
        watermark
          ? 'Your marked photo and TikSnap watermark are saved.'
          : 'Your marked photo is saved locally.',
        [{ text: 'Done', onPress: () => router.replace('/') }],
      );
    } catch {
      Alert.alert(
        'Could not save photo',
        'TikSnap could not create the marked image. Please try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [annotations, captureCanvas, router, saving, strokes.length, uri, watermark]);

  const shareImage = useCallback(async () => {
    if (!uri) return;
    try {
      const outputUri = renderedUri || (await captureCanvas());
      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(outputUri, {
          dialogTitle: 'Share your TikSnap photo',
        });
      } else {
        await Share.share({ url: outputUri, message: 'Marked with TikSnap' });
      }
    } catch {
      // The user can dismiss the native share sheet without an error.
    }
  }, [captureCanvas, renderedUri, uri]);

  if (!uri) {
    return (
      <View style={styles.emptyScreen}>
        <Ionicons name="image-outline" size={38} color={colors.mutedForeground} />
        <Text style={styles.emptyTitle}>No photo selected</Text>
        <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Back to TikSnap</Text>
        </Pressable>
      </View>
    );
  }

  const toolRailWidth = toolbarVisible ? (toolbarExpanded ? 112 : 64) : 0;

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close editor"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.topIcon, pressed && styles.pressed]}
        >
          <Feather name="x" size={21} color={colors.foreground} />
        </Pressable>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topEyebrow}>TIKSNAP EDITOR</Text>
          <Text style={styles.topTitle}>Mark the detail</Text>
        </View>
        <Pressable
          accessibilityLabel="Save marked photo"
          testID="save-button"
          disabled={saving}
          onPress={() => void saveImage()}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          {saving ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <>
              <Text style={styles.saveButtonText}>Save</Text>
              <Feather name="check" size={16} color={colors.primaryForeground} />
            </>
          )}
        </Pressable>
      </View>

      <View
        ref={canvasRef}
        collapsable={false}
        style={[styles.canvas, { marginLeft: toolRailWidth + 10 }]}
        onLayout={(event) =>
          setCanvasSize({
            width: event.nativeEvent.layout.width,
            height: event.nativeEvent.layout.height,
          })
        }
        onTouchEnd={(event) => {
          if (tool === 'point' || tool === 'text') {
            addPointOrText(
              event.nativeEvent.locationX,
              event.nativeEvent.locationY,
            );
          }
        }}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri }} style={styles.photo} resizeMode="contain" />
        <Svg
          pointerEvents="none"
          width={canvasSize.width}
          height={canvasSize.height}
          style={StyleSheet.absoluteFillObject}
        >
          {strokes.map((stroke) => (
            <Path
              key={stroke.id}
              d={pointsToPath(stroke.points, canvasSize.width, canvasSize.height)}
              stroke={stroke.color}
              strokeWidth={stroke.width}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          ))}
        </Svg>
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {annotations.map((item, index) => {
            const left = item.x * canvasSize.width;
            const top = item.y * canvasSize.height;
            const selected = selectedId === item.id;
            if (item.type === 'point') {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.pointMarker,
                    {
                      left: left - 16,
                      top: top - 16,
                      backgroundColor: item.color,
                    },
                    selected && styles.selectedMarker,
                  ]}
                >
                  <Text style={styles.pointText}>{index + 1}</Text>
                </View>
              );
            }
            if (item.type === 'rectangle') {
              return (
                <View
                  key={item.id}
                  style={[
                    styles.rectangleMarker,
                    {
                      left,
                      top,
                      width: (item.width || 0.2) * canvasSize.width,
                      height: (item.height || 0.2) * canvasSize.height,
                      borderColor: item.color,
                    },
                    selected && styles.selectedRectangle,
                  ]}
                />
              );
            }
            return (
              <View
                key={item.id}
                style={[
                  styles.textMarker,
                  { left, top, borderColor: item.color },
                  selected && styles.selectedText,
                ]}
              >
                <Text style={styles.textMarkerText}>{item.text}</Text>
              </View>
            );
          })}
          {draftRectangle ? (
            <View style={[styles.rectangleMarker, styles.draftRectangle, draftRectangle]} />
          ) : null}
          {watermark ? (
            <View style={styles.watermark}>
              <Ionicons name="scan-outline" size={13} color={colors.primaryForeground} />
              <Text style={styles.watermarkText}>TIKSNAP</Text>
            </View>
          ) : null}
        </View>
        <View pointerEvents="none" style={styles.canvasHint}>
          <Text style={styles.canvasHintText}>
            {tool === 'draw'
              ? 'Draw directly on the photo'
              : tool === 'rectangle'
                ? 'Drag around an area'
                : tool === 'text'
                  ? 'Tap to place a note'
                  : 'Tap a point to mark it'}
          </Text>
        </View>
      </View>

      {toolbarVisible ? (
        <View style={[styles.toolRail, { width: toolbarExpanded ? 96 : 50 }]}>
          {toolbarExpanded ? (
            <>
              <Text style={styles.railLabel}>TOOLS</Text>
              <RailButton
                icon="radio-button-on"
                label="Point"
                active={tool === 'point'}
                onPress={() => setTool('point')}
                colors={colors}
              />
              <RailButton
                icon="crop"
                label="Area"
                active={tool === 'rectangle'}
                onPress={() => setTool('rectangle')}
                colors={colors}
              />
              <RailButton
                icon="type"
                label="Note"
                active={tool === 'text'}
                onPress={() => setTool('text')}
                colors={colors}
              />
              <RailButton
                icon="edit-3"
                label="Draw"
                active={tool === 'draw'}
                onPress={() => setTool('draw')}
                colors={colors}
              />
              <View style={styles.railDivider} />
              <Pressable
                accessibilityLabel="Toggle watermark"
                onPress={() => {
                  const next = !watermark;
                  setWatermark(next);
                  void writeWatermarkEnabled(next);
                }}
                style={({ pressed }) => [styles.railUtility, pressed && styles.pressed]}
              >
                <Feather name="award" size={17} color={watermark ? colors.primary : colors.mutedForeground} />
                <Text style={[styles.railUtilityText, !watermark && styles.railMuted]}>
                  Watermark
                </Text>
              </Pressable>
              {selectedId ? (
                <Pressable
                  accessibilityLabel="Delete selected annotation"
                  onPress={removeSelected}
                  style={({ pressed }) => [styles.railUtility, pressed && styles.pressed]}
                >
                  <Feather name="trash-2" size={17} color={colors.destructive} />
                  <Text style={[styles.railUtilityText, styles.deleteText]}>Delete</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityLabel="Share marked photo"
                testID="share-button"
                onPress={() => void shareImage()}
                style={({ pressed }) => [styles.railShare, pressed && styles.pressed]}
              >
                <Feather name="share-2" size={17} color={colors.primaryForeground} />
                <Text style={styles.railShareText}>Share</Text>
              </Pressable>
              <Pressable
                accessibilityLabel="Collapse editing toolbar"
                onPress={() => setToolbarExpanded(false)}
                style={({ pressed }) => [styles.collapseButton, pressed && styles.pressed]}
              >
                <Feather name="chevron-left" size={19} color={colors.mutedForeground} />
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityLabel="Expand editing toolbar"
              onPress={() => setToolbarExpanded(true)}
              style={({ pressed }) => [styles.expandButton, pressed && styles.pressed]}
            >
              <Feather name="chevron-right" size={20} color={colors.primary} />
            </Pressable>
          )}
        </View>
      ) : (
        <Pressable
          accessibilityLabel="Show editing toolbar"
          onPress={() => setToolbarVisible(true)}
          style={({ pressed }) => [styles.showToolbarButton, pressed && styles.pressed]}
        >
          <Feather name="sliders" size={19} color={colors.primaryForeground} />
        </Pressable>
      )}

      <Pressable
        accessibilityLabel={toolbarVisible ? 'Hide editing toolbar' : 'Show editing toolbar'}
        onPress={() => setToolbarVisible((value) => !value)}
        style={({ pressed }) => [
          styles.hideToolbarButton,
          { left: toolbarVisible ? (toolbarExpanded ? 102 : 56) : 12 },
          pressed && styles.pressed,
        ]}
      >
        <Feather
          name={toolbarVisible ? 'eye-off' : 'eye'}
          size={15}
          color={colors.mutedForeground}
        />
      </Pressable>

      {notePosition ? (
        <View style={styles.noteComposer}>
          <View style={styles.composerHandle} />
          <View style={styles.composerHeader}>
            <View>
              <Text style={styles.composerEyebrow}>NOTE</Text>
              <Text style={styles.composerTitle}>
                {selectedId ? 'Edit note' : 'Add a note'}
              </Text>
            </View>
            <Pressable
              accessibilityLabel="Close note composer"
              onPress={() => {
                setNotePosition(null);
                setNoteDraft('');
              }}
            >
              <Feather name="x" size={19} color={colors.mutedForeground} />
            </Pressable>
          </View>
          <TextInput
            autoFocus
            value={noteDraft}
            onChangeText={setNoteDraft}
            placeholder="e.g. Check this corner"
            placeholderTextColor={colors.mutedForeground}
            maxLength={80}
            style={styles.noteInput}
            returnKeyType="done"
            onSubmitEditing={commitNote}
          />
          <Pressable
            accessibilityLabel={selectedId ? 'Update note' : 'Add note'}
            onPress={commitNote}
            style={({ pressed }) => [styles.addNoteButton, pressed && styles.pressed]}
          >
            <Text style={styles.addNoteText}>{selectedId ? 'Update note' : 'Add note'}</Text>
            <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function RailButton({
  icon,
  label,
  active,
  onPress,
  colors,
}: {
  icon: keyof typeof Feather.glyphMap | keyof typeof Ionicons.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const iconNode =
    icon === 'radio-button-on' ? (
      <Ionicons name="radio-button-on" size={19} color={active ? colors.primary : colors.mutedForeground} />
    ) : (
      <Feather name={icon as keyof typeof Feather.glyphMap} size={19} color={active ? colors.primary : colors.mutedForeground} />
    );

  return (
    <Pressable
      accessibilityLabel={`Use ${label} tool`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          width: 78,
          minHeight: 54,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          backgroundColor: active ? colors.secondary : 'transparent',
          borderWidth: active ? 1 : 0,
          borderColor: active ? colors.primary : 'transparent',
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      {iconNode}
      <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 10 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(
  colors: ReturnType<typeof useColors>,
  top: number,
  bottom: number,
) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.editorBackground },
    emptyScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 14,
      backgroundColor: colors.background,
      padding: 24,
    },
    emptyTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 18,
    },
    primaryButton: {
      minHeight: 46,
      paddingHorizontal: 18,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    primaryButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    topBar: {
      paddingTop: top + 9,
      paddingHorizontal: 14,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.editorBackground,
    },
    topIcon: {
      width: 39,
      height: 39,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.editorSurface,
    },
    topTitleBlock: { flex: 1, paddingHorizontal: 12 },
    topEyebrow: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 9,
      letterSpacing: 1.6,
      marginBottom: 3,
    },
    topTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
    },
    saveButton: {
      minWidth: 72,
      height: 38,
      paddingHorizontal: 13,
      borderRadius: 15,
      flexDirection: 'row',
      gap: 7,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
    },
    canvas: {
      flex: 1,
      minHeight: 300,
      marginRight: 10,
      overflow: 'hidden',
      borderRadius: 22,
      backgroundColor: colors.editorSurface,
    },
    photo: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
    pointMarker: {
      position: 'absolute',
      width: 32,
      height: 32,
      borderRadius: 16,
      borderWidth: 3,
      borderColor: colors.primaryForeground,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: colors.editorBackground,
      shadowOpacity: 0.35,
      shadowRadius: 5,
      elevation: 4,
    },
    selectedMarker: { transform: [{ scale: 1.16 }] },
    pointText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
    },
    rectangleMarker: {
      position: 'absolute',
      borderWidth: 3,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    selectedRectangle: { borderWidth: 4 },
    draftRectangle: {
      borderColor: colors.primaryForeground,
      borderStyle: 'dashed',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    textMarker: {
      position: 'absolute',
      minWidth: 70,
      maxWidth: 180,
      borderWidth: 2,
      borderRadius: 10,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: colors.editorBackground,
    },
    selectedText: { borderWidth: 3 },
    textMarkerText: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
    },
    watermark: {
      position: 'absolute',
      right: 13,
      bottom: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      paddingHorizontal: 8,
      paddingVertical: 5,
      borderRadius: 8,
      backgroundColor: 'rgba(17,28,47,0.58)',
    },
    watermarkText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 8,
      letterSpacing: 1.1,
    },
    canvasHint: {
      position: 'absolute',
      top: 12,
      right: 12,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(17,28,47,0.62)',
    },
    canvasHintText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_500Medium',
      fontSize: 10,
    },
    toolRail: {
      position: 'absolute',
      left: 8,
      top: top + 70,
      bottom: bottom + 18,
      paddingVertical: 10,
      borderRadius: 20,
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      shadowColor: colors.editorBackground,
      shadowOpacity: 0.26,
      shadowRadius: 13,
      elevation: 9,
    },
    railLabel: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 8,
      letterSpacing: 1.2,
      marginBottom: 6,
    },
    railDivider: {
      width: 62,
      height: 1,
      backgroundColor: colors.border,
      marginVertical: 8,
    },
    railUtility: {
      width: 78,
      minHeight: 39,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    railUtilityText: {
      color: colors.primary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 9,
    },
    railMuted: { color: colors.mutedForeground },
    deleteText: { color: colors.destructive },
    railShare: {
      width: 78,
      minHeight: 40,
      marginTop: 7,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 5,
      backgroundColor: colors.primary,
    },
    railShareText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
    },
    collapseButton: {
      width: 34,
      height: 34,
      marginTop: 'auto',
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.muted,
    },
    expandButton: {
      width: 50,
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    showToolbarButton: {
      position: 'absolute',
      left: 10,
      bottom: bottom + 22,
      width: 44,
      height: 44,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
    },
    hideToolbarButton: {
      position: 'absolute',
      top: top + 75,
      width: 30,
      height: 30,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    noteComposer: {
      position: 'absolute',
      left: 10,
      right: 10,
      bottom: bottom + 10,
      paddingTop: 9,
      paddingHorizontal: 16,
      paddingBottom: 15,
      borderRadius: 22,
      backgroundColor: colors.card,
      shadowColor: colors.editorBackground,
      shadowOpacity: 0.35,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -7 },
      elevation: 12,
    },
    composerHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 13,
    },
    composerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 10,
    },
    composerEyebrow: {
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
      fontSize: 9,
      letterSpacing: 1.3,
      marginBottom: 3,
    },
    composerTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
    },
    noteInput: {
      minHeight: 48,
      color: colors.foreground,
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      paddingHorizontal: 13,
      borderRadius: 13,
      backgroundColor: colors.muted,
      borderWidth: 1,
      borderColor: colors.border,
    },
    addNoteButton: {
      minHeight: 44,
      marginTop: 10,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: colors.primary,
    },
    addNoteText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    pressed: { opacity: 0.74 },
  });
}