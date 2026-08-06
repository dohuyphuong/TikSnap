import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  PanResponder,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  readWatermarkEnabled,
  writeSavedImage,
  writeWatermarkEnabled,
} from '@/lib/storage';

type Tool = 'point' | 'rectangle' | 'text';
type Annotation = {
  id: string;
  type: Tool;
  x: number;
  y: number;
  width?: number;
  height?: number;
  text: string;
  color: string;
};

const annotationColors = ['#FF5C5C', '#FFD166', '#49D6B2'];

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function EditorScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ uri?: string }>();
  const uri = typeof params.uri === 'string' ? params.uri : '';
  const [tool, setTool] = useState<Tool>('point');
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [watermark, setWatermark] = useState(true);
  const [noteDraft, setNoteDraft] = useState('');
  const [notePosition, setNotePosition] = useState<{ x: number; y: number } | null>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [saving, setSaving] = useState(false);
  const [renderedUri, setRenderedUri] = useState<string | null>(null);
  const canvasRef = useRef<View>(null);
  const dragStart = useRef<{ x: number; y: number } | null>(null);
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

  const normalizedPoint = useCallback(
    (x: number, y: number) => ({
      x: canvasSize.width ? Math.max(0, Math.min(1, x / canvasSize.width)) : 0.5,
      y: canvasSize.height ? Math.max(0, Math.min(1, y / canvasSize.height)) : 0.5,
    }),
    [canvasSize],
  );

  const openNote = useCallback((x: number, y: number, existing?: Annotation) => {
    setSelectedId(existing?.id ?? null);
    setNoteDraft(existing?.text ?? '');
    setNotePosition({ x, y });
  }, []);

  const addPointOrText = useCallback(
    (x: number, y: number) => {
      const point = normalizedPoint(x, y);
      if (tool === 'point' || tool === 'text') {
        openNote(x, y);
        if (tool === 'point') {
          const id = makeId();
          setSelectedId(id);
          setAnnotations((current) => [
            ...current,
            { id, type: 'point', ...point, text: '', color: annotationColors[current.length % annotationColors.length] },
          ]);
        }
      }
    },
    [normalizedPoint, openNote, tool],
  );

  const finishRectangle = useCallback(
    (x: number, y: number) => {
      if (!dragStart.current || tool !== 'rectangle') return;
      const start = dragStart.current;
      const left = Math.min(start.x, x);
      const top = Math.min(start.y, y);
      const width = Math.abs(x - start.x);
      const height = Math.abs(y - start.y);
      dragStart.current = null;
      setDraftRectangle(null);
      if (width < 18 || height < 18) return;
      const position = normalizedPoint(left, top);
      const size = {
        width: canvasSize.width ? width / canvasSize.width : 0.2,
        height: canvasSize.height ? height / canvasSize.height : 0.2,
      };
      const id = makeId();
      setSelectedId(id);
      setAnnotations((current) => [
        ...current,
        {
          id,
          type: 'rectangle',
          ...position,
          ...size,
          text: '',
          color: annotationColors[current.length % annotationColors.length],
        },
      ]);
      setNoteDraft('');
      setNotePosition({ x: left, y: top });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
    [canvasSize, normalizedPoint, openNote, tool],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => tool === 'rectangle',
        onMoveShouldSetPanResponder: () => tool === 'rectangle',
        onPanResponderGrant: (event) => {
          const { locationX, locationY } = event.nativeEvent;
          dragStart.current = { x: locationX, y: locationY };
          setDraftRectangle({ x: locationX, y: locationY, width: 0, height: 0 });
        },
        onPanResponderMove: (event) => {
          const start = dragStart.current;
          if (!start) return;
          const { locationX, locationY } = event.nativeEvent;
          setDraftRectangle({
            x: Math.min(start.x, locationX),
            y: Math.min(start.y, locationY),
            width: Math.abs(locationX - start.x),
            height: Math.abs(locationY - start.y),
          });
        },
        onPanResponderRelease: (event) => {
          finishRectangle(event.nativeEvent.locationX, event.nativeEvent.locationY);
        },
        onPanResponderTerminate: () => {
          dragStart.current = null;
          setDraftRectangle(null);
        },
      }),
    [finishRectangle, tool],
  );

  const updateSelectedText = useCallback(() => {
    if (!notePosition || !noteDraft.trim()) {
      if (selectedId) {
        setAnnotations((current) => current.filter((item) => item.id !== selectedId));
      }
      setNotePosition(null);
      setSelectedId(null);
      return;
    }
    if (selectedId) {
      setAnnotations((current) =>
        current.map((item) => (item.id === selectedId ? { ...item, text: noteDraft.trim() } : item)),
      );
    } else {
      const point = normalizedPoint(notePosition.x, notePosition.y);
      const id = makeId();
      setAnnotations((current) => [
        ...current,
        {
          id,
          type: 'text',
          ...point,
          text: noteDraft.trim(),
          color: annotationColors[current.length % annotationColors.length],
        },
      ]);
    }
    setNotePosition(null);
    setNoteDraft('');
    setSelectedId(null);
  }, [noteDraft, notePosition, normalizedPoint, selectedId]);

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    setAnnotations((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
    setNotePosition(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [selectedId]);

  const saveImage = useCallback(async () => {
    if (!uri || saving) return;
    setSaving(true);
    try {
      const outputUri = await captureRef(canvasRef, {
        format: 'jpg',
        quality: 0.92,
        result: 'tmpfile',
      });
      setRenderedUri(outputUri);
      if (MediaLibrary.isAvailableAsync && (await MediaLibrary.isAvailableAsync())) {
        await MediaLibrary.saveToLibraryAsync(outputUri);
      }
      await writeSavedImage({
        id: makeId(),
        uri: outputUri,
        createdAt: new Date().toISOString(),
        annotationCount: annotations.length,
        notePreview: annotations.find((item) => item.text)?.text || 'Annotated photo',
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Saved to your library',
        watermark ? 'Your marked photo and watermark are saved.' : 'Your marked photo is saved locally.',
        [{ text: 'Done', onPress: () => router.replace('/') }],
      );
    } catch {
      Alert.alert(
        'Could not save photo',
        'Please allow photo access in your device settings and try again.',
      );
    } finally {
      setSaving(false);
    }
  }, [annotations, router, saving, uri, watermark]);

  const shareImage = useCallback(async () => {
    if (!uri) return;
    try {
      const outputUri =
        renderedUri ||
        (await captureRef(canvasRef, {
          format: 'jpg',
          quality: 0.92,
          result: 'tmpfile',
        }));
      setRenderedUri(outputUri);
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(outputUri, { dialogTitle: 'Share your marked photo' });
      } else {
        await Share.share({ url: outputUri, message: 'Marked with Quick Mark' });
      }
    } catch {
      // The user may dismiss the share sheet; no error state is needed.
    }
  }, [renderedUri, uri]);

  if (!uri) {
    return (
      <View style={styles.screen}>
        <View style={styles.invalidState}>
          <Ionicons name="image-outline" size={36} color={colors.mutedForeground} />
          <Text style={styles.invalidTitle}>No photo selected</Text>
          <Pressable onPress={() => router.replace('/')} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Back to home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityLabel="Close editor"
          onPress={() => router.back()}
          style={({ pressed }) => [styles.topIcon, pressed && styles.pressed]}
        >
          <Feather name="x" size={22} color="#FFFFFF" />
        </Pressable>
        <View style={styles.topTitleBlock}>
          <Text style={styles.topEyebrow}>EDITOR</Text>
          <Text style={styles.topTitle}>Mark the detail</Text>
        </View>
        <Pressable
          accessibilityLabel="Save marked photo"
          testID="save-button"
          disabled={saving}
          onPress={() => void saveImage()}
          style={({ pressed }) => [styles.saveButton, pressed && styles.pressed]}
        >
          <Text style={styles.saveButtonText}>{saving ? 'Saving' : 'Save'}</Text>
          <Feather name="check" size={16} color={colors.primaryForeground} />
        </Pressable>
      </View>

      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={(event) => setCanvasSize({
          width: event.nativeEvent.layout.width,
          height: event.nativeEvent.layout.height,
        })}
        onTouchEnd={(event) => {
          if (tool !== 'rectangle') {
            addPointOrText(event.nativeEvent.locationX, event.nativeEvent.locationY);
          }
        }}
        {...panResponder.panHandlers}
      >
        <Image source={{ uri }} style={styles.photo} resizeMode="contain" />
        <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>
          {annotations.map((item) => {
            const left = item.x * canvasSize.width;
            const top = item.y * canvasSize.height;
            const selected = selectedId === item.id;
            if (item.type === 'point') {
              return (
                <View key={item.id} style={[styles.pointMarker, { left: left - 15, top: top - 15, backgroundColor: item.color }, selected && styles.selectedMarker]}>
                  <Text style={styles.pointText}>{annotations.indexOf(item) + 1}</Text>
                </View>
              );
            }
            if (item.type === 'rectangle') {
              return (
                <View key={item.id} style={[
                  styles.rectangleMarker,
                  {
                    left,
                    top,
                    width: (item.width || 0.2) * canvasSize.width,
                    height: (item.height || 0.2) * canvasSize.height,
                    borderColor: item.color,
                  },
                  selected && styles.selectedRectangle,
                ]}>
                  {item.text ? <Text style={[styles.annotationLabel, { backgroundColor: item.color }]}>{item.text}</Text> : null}
                </View>
              );
            }
            return (
              <View key={item.id} style={[styles.textMarker, { left, top, borderColor: item.color }, selected && styles.selectedText]}>
                <Text style={styles.textMarkerText}>{item.text || 'Add note'}</Text>
              </View>
            );
          })}
          {draftRectangle ? (
            <View style={[styles.rectangleMarker, styles.draftRectangle, draftRectangle]} />
          ) : null}
          {watermark ? (
            <View style={styles.watermark}>
              <Ionicons name="scan-outline" size={13} color="rgba(255,255,255,0.78)" />
              <Text style={styles.watermarkText}>QUICK MARK</Text>
            </View>
          ) : null}
        </View>
        <View pointerEvents="none" style={styles.canvasHint}>
          <Text style={styles.canvasHintText}>
            {tool === 'rectangle' ? 'Drag around an area' : tool === 'text' ? 'Tap to place a note' : 'Tap a point to mark it'}
          </Text>
        </View>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.toolHeader}>
          <View>
            <Text style={styles.toolTitle}>Marking tools</Text>
            <Text style={styles.toolSubtitle}>
              {annotations.length ? `${annotations.length} mark${annotations.length === 1 ? '' : 's'} on this photo` : 'Choose how you want to point it out'}
            </Text>
          </View>
          {selectedId ? (
            <Pressable
              accessibilityLabel="Delete selected annotation"
              onPress={removeSelected}
              style={({ pressed }) => [styles.deleteButton, pressed && styles.pressed]}
            >
              <Feather name="trash-2" size={16} color={colors.destructive} />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.toolRow}>
          <ToolButton icon="radio-button-on" label="Point" active={tool === 'point'} onPress={() => setTool('point')} colors={colors} />
          <ToolButton icon="crop" label="Area" active={tool === 'rectangle'} onPress={() => setTool('rectangle')} colors={colors} />
          <ToolButton icon="type" label="Note" active={tool === 'text'} onPress={() => setTool('text')} colors={colors} />
        </View>
        <View style={styles.footerActions}>
          <Pressable
            accessibilityLabel="Toggle watermark"
            onPress={() => setWatermark((value) => {
              const next = !value;
              void writeWatermarkEnabled(next);
              return next;
            })}
            style={({ pressed }) => [styles.watermarkToggle, pressed && styles.pressed]}
          >
            <Feather name="award" size={16} color={watermark ? colors.primary : colors.mutedForeground} />
            <Text style={[styles.watermarkToggleText, !watermark && styles.mutedToggleText]}>
              {watermark ? 'Watermark on' : 'Watermark off'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Share marked photo"
            testID="share-button"
            onPress={() => void shareImage()}
            style={({ pressed }) => [styles.shareButton, pressed && styles.pressed]}
          >
            <Feather name="share-2" size={17} color={colors.foreground} />
            <Text style={styles.shareButtonText}>Share</Text>
          </Pressable>
        </View>
      </View>

      {notePosition ? (
        <View style={styles.noteComposer}>
          <View style={styles.composerHandle} />
          <View style={styles.composerHeader}>
            <Text style={styles.composerTitle}>{selectedId ? 'Edit note' : 'Add a note'}</Text>
            <Pressable onPress={() => {
              if (selectedId && !noteDraft.trim()) removeSelected();
              else {
                setNotePosition(null);
                setNoteDraft('');
              }
            }}>
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
            onSubmitEditing={updateSelectedText}
          />
          <Pressable onPress={updateSelectedText} style={({ pressed }) => [styles.addNoteButton, pressed && styles.pressed]}>
            <Text style={styles.addNoteText}>{selectedId ? 'Update note' : 'Add note'}</Text>
            <Feather name="arrow-right" size={17} color={colors.primaryForeground} />
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function ToolButton({
  icon,
  label,
  active,
  onPress,
  colors,
}: {
  icon: keyof typeof Ionicons.glyphMap | keyof typeof Feather.glyphMap;
  label: string;
  active: boolean;
  onPress: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const iconNode =
    icon === 'type' ? (
      <Feather name="type" size={20} color={active ? colors.primary : colors.mutedForeground} />
    ) : icon === 'crop' ? (
      <Feather name="crop" size={20} color={active ? colors.primary : colors.mutedForeground} />
    ) : (
      <Ionicons name="radio-button-on" size={20} color={active ? colors.primary : colors.mutedForeground} />
    );
  return (
    <Pressable
      accessibilityLabel={`Use ${label} tool`}
      onPress={onPress}
      style={({ pressed }) => [
        {
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          gap: 6,
          minHeight: 58,
          borderRadius: 16,
          backgroundColor: active ? colors.secondary : 'transparent',
          borderWidth: active ? 1 : 0,
          borderColor: active ? '#C8D5FF' : 'transparent',
        },
        pressed && { opacity: 0.72 },
      ]}
    >
      {iconNode}
      <Text style={{ color: active ? colors.primary : colors.mutedForeground, fontFamily: 'Inter_600SemiBold', fontSize: 11 }}>
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, top: number, bottom: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: '#111C2F' },
    topBar: {
      paddingTop: top + 10,
      paddingHorizontal: 17,
      paddingBottom: 13,
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: '#111C2F',
    },
    topIcon: {
      width: 39,
      height: 39,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.12)',
    },
    topTitleBlock: { flex: 1, paddingHorizontal: 12 },
    topEyebrow: {
      color: '#9EABC1',
      fontFamily: 'Inter_700Bold',
      fontSize: 9,
      letterSpacing: 1.6,
      marginBottom: 3,
    },
    topTitle: {
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
    },
    saveButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      backgroundColor: colors.primary,
      borderRadius: 17,
      paddingHorizontal: 14,
      height: 38,
    },
    saveButtonText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
    },
    canvas: {
      flex: 1,
      minHeight: 330,
      marginHorizontal: 12,
      overflow: 'hidden',
      borderRadius: 22,
      backgroundColor: '#25334A',
    },
    photo: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
    pointMarker: {
      position: 'absolute',
      width: 30,
      height: 30,
      borderRadius: 15,
      borderWidth: 3,
      borderColor: 'rgba(255,255,255,0.9)',
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    selectedMarker: { transform: [{ scale: 1.16 }] },
    pointText: {
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
    },
    rectangleMarker: {
      position: 'absolute',
      borderWidth: 3,
      backgroundColor: 'rgba(255, 92, 92, 0.12)',
    },
    selectedRectangle: { borderWidth: 4 },
    draftRectangle: {
      borderColor: '#FFFFFF',
      borderStyle: 'dashed',
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    annotationLabel: {
      position: 'absolute',
      left: -3,
      top: -27,
      maxWidth: 150,
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10,
      paddingHorizontal: 7,
      paddingVertical: 5,
      borderRadius: 7,
      overflow: 'hidden',
    },
    textMarker: {
      position: 'absolute',
      minWidth: 70,
      maxWidth: 170,
      borderWidth: 2,
      borderRadius: 9,
      paddingHorizontal: 8,
      paddingVertical: 6,
      backgroundColor: 'rgba(17, 28, 47, 0.88)',
    },
    selectedText: { borderWidth: 3 },
    textMarkerText: {
      color: '#FFFFFF',
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
      backgroundColor: 'rgba(10, 18, 32, 0.42)',
    },
    watermarkText: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: 'Inter_700Bold',
      fontSize: 8,
      letterSpacing: 1.1,
    },
    canvasHint: {
      position: 'absolute',
      top: 13,
      left: 13,
      paddingHorizontal: 9,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: 'rgba(10, 18, 32, 0.44)',
    },
    canvasHintText: {
      color: 'rgba(255,255,255,0.8)',
      fontFamily: 'Inter_500Medium',
      fontSize: 10,
    },
    bottomPanel: {
      backgroundColor: colors.background,
      marginTop: 12,
      borderTopLeftRadius: 27,
      borderTopRightRadius: 27,
      paddingTop: 20,
      paddingHorizontal: 19,
      paddingBottom: bottom + (bottom ? 12 : 19),
    },
    toolHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 13,
    },
    toolTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 16,
    },
    toolSubtitle: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      marginTop: 4,
    },
    deleteButton: {
      width: 35,
      height: 35,
      borderRadius: 12,
      backgroundColor: '#FFF0F0',
      alignItems: 'center',
      justifyContent: 'center',
    },
    toolRow: { flexDirection: 'row', gap: 8, marginBottom: 13 },
    footerActions: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    watermarkToggle: { flexDirection: 'row', alignItems: 'center', gap: 7, padding: 8 },
    watermarkToggleText: {
      color: colors.primary,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
    },
    mutedToggleText: { color: colors.mutedForeground },
    shareButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    shareButtonText: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },
    noteComposer: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 0,
      paddingTop: 9,
      paddingHorizontal: 19,
      paddingBottom: bottom + 16,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      backgroundColor: colors.card,
      shadowColor: '#061024',
      shadowOpacity: 0.2,
      shadowRadius: 18,
      shadowOffset: { width: 0, height: -7 },
      elevation: 9,
    },
    composerHandle: {
      width: 38,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: 'center',
      marginBottom: 16,
    },
    composerHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 12,
    },
    composerTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
    },
    noteInput: {
      color: colors.foreground,
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      minHeight: 48,
      borderRadius: 14,
      paddingHorizontal: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    addNoteButton: {
      height: 48,
      borderRadius: 15,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      marginTop: 11,
    },
    addNoteText: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    invalidState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14 },
    invalidTitle: { color: '#FFFFFF', fontFamily: 'Inter_700Bold', fontSize: 18 },
    primaryButton: {
      marginTop: 6,
      paddingHorizontal: 18,
      paddingVertical: 12,
      borderRadius: 14,
      backgroundColor: colors.primary,
    },
    primaryButtonText: { color: colors.primaryForeground, fontFamily: 'Inter_700Bold', fontSize: 13 },
    pressed: { opacity: 0.72 },
  });
}