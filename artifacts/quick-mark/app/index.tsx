import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageSourcePropType,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { useColors } from '@/hooks/useColors';
import {
  deleteSavedImage,
  readSavedImages,
  type SavedImage,
} from '@/lib/storage';

const sampleImages: Array<{
  id: string;
  source: ImageSourcePropType;
  label: string;
}> = [
  {
    id: 'sample-sneaker',
    source: require('@/assets/images/sample-sneaker.jpg'),
    label: 'Product check',
  },
  {
    id: 'sample-desk',
    source: require('@/assets/images/sample-desk.jpg'),
    label: 'Workspace note',
  },
];

function formatDate(value: string): string {
  const date = new Date(value);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);
  const [busy, setBusy] = useState<'camera' | 'gallery' | null>(null);

  const loadHistory = useCallback(async () => {
    setSavedImages(await readSavedImages());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadHistory();
    }, [loadHistory]),
  );

  const openEditor = useCallback(
    (uri: string) => {
      router.push({ pathname: '/editor', params: { uri } });
    },
    [router],
  );

  const chooseImage = useCallback(
    async (mode: 'camera' | 'gallery') => {
      setBusy(mode);
      try {
        const result =
          mode === 'camera'
            ? await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'],
                quality: 0.88,
                allowsEditing: false,
              })
            : await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                quality: 0.88,
                allowsEditing: false,
              });
        if (!result.canceled && result.assets[0]?.uri) {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          openEditor(result.assets[0].uri);
        }
      } catch {
        Alert.alert(
          mode === 'camera' ? 'Camera unavailable' : 'Library unavailable',
          'Quick Mark could not access that source. Please check your device permissions and try again.',
        );
      } finally {
        setBusy(null);
      }
    },
    [openEditor],
  );

  const recentItems = useMemo(
    () =>
      savedImages.length > 0
        ? savedImages.map((item) => ({
            id: item.id,
            uri: item.uri,
            label: item.notePreview || 'Annotated photo',
            date: formatDate(item.createdAt),
            saved: true,
          }))
        : sampleImages.map((item) => ({
            id: item.id,
            source: item.source,
            label: item.label,
            date: 'Example',
            saved: false,
          })),
    [savedImages],
  );

  const styles = makeStyles(colors, insets.top, insets.bottom);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        scrollEnabled={recentItems.length > 2}
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>QUICK MARK</Text>
            <Text style={styles.title}>Make the detail clear.</Text>
          </View>
          <Pressable
            accessibilityLabel="Open settings"
            testID="settings-button"
            onPress={() => router.push('/settings')}
            style={({ pressed }) => [
              styles.iconButton,
              pressed && styles.pressed,
            ]}
          >
            <Feather name="sliders" size={20} color={colors.foreground} />
          </Pressable>
        </View>

        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroCopy}>
            <View style={styles.heroIcon}>
              <Ionicons name="scan-outline" size={23} color={colors.primary} />
            </View>
            <Text style={styles.heroTitle}>Point it out.</Text>
            <Text style={styles.heroBody}>
              Capture a moment, mark what matters, and send it in seconds.
            </Text>
          </View>
          <View style={styles.heroMeta}>
            <View style={styles.metaItem}>
              <Feather name="zap" size={14} color={colors.primary} />
              <Text style={styles.metaText}>Fast by design</Text>
            </View>
            <View style={styles.metaItem}>
              <Feather name="lock" size={14} color={colors.primary} />
              <Text style={styles.metaText}>Stays on device</Text>
            </View>
          </View>
        </View>

        <View style={styles.actionRow}>
          <Pressable
            accessibilityLabel="Capture a photo"
            testID="capture-button"
            onPress={() => void chooseImage('camera')}
            style={({ pressed }) => [
              styles.captureAction,
              pressed && styles.pressed,
            ]}
          >
            {busy === 'camera' ? (
              <ActivityIndicator color={colors.primaryForeground} />
            ) : (
              <Ionicons name="camera-outline" size={25} color={colors.primaryForeground} />
            )}
            <Text style={styles.captureLabel}>Capture</Text>
            <Text style={styles.captureHint}>Use camera</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Choose a photo from your library"
            testID="gallery-button"
            onPress={() => void chooseImage('gallery')}
            style={({ pressed }) => [
              styles.galleryAction,
              pressed && styles.pressed,
            ]}
          >
            {busy === 'gallery' ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <Ionicons name="images-outline" size={25} color={colors.foreground} />
            )}
            <Text style={styles.galleryLabel}>Choose</Text>
            <Text style={styles.galleryHint}>From library</Text>
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recent work</Text>
            <Text style={styles.sectionSubtitle}>
              {savedImages.length ? `${savedImages.length} saved locally` : 'A couple of quick examples'}
            </Text>
          </View>
          {savedImages.length > 0 ? (
            <Text style={styles.localBadge}>ON DEVICE</Text>
          ) : null}
        </View>

        <View style={styles.recentGrid}>
          {recentItems.map((item) => (
            <Pressable
              key={item.id}
              testID={`recent-${item.id}`}
              onPress={() =>
                openEditor(
                  'uri' in item
                    ? item.uri
                    : Image.resolveAssetSource(item.source).uri,
                )
              }
              onLongPress={() => {
                if ('saved' in item && item.saved) {
                  Alert.alert('Remove from Quick Mark', 'This removes the item from local history.', [
                    { text: 'Cancel', style: 'cancel' },
                    {
                      text: 'Remove',
                      style: 'destructive',
                      onPress: async () => {
                        await deleteSavedImage(item.id);
                        await loadHistory();
                      },
                    },
                  ]);
                }
              }}
              style={({ pressed }) => [styles.recentCard, pressed && styles.cardPressed]}
            >
              <Image
                source={'uri' in item ? { uri: item.uri } : item.source}
                style={styles.recentImage}
              />
              <View style={styles.recentOverlay} />
              <View style={styles.recentInfo}>
                <Text style={styles.recentLabel}>{item.label}</Text>
                <Text style={styles.recentDate}>{item.date}</Text>
              </View>
              <View style={styles.arrowBadge}>
                <Feather name="arrow-up-right" size={15} color={colors.foreground} />
              </View>
            </Pressable>
          ))}
        </View>

        {savedImages.length === 0 ? (
          <View style={styles.tipRow}>
            <Ionicons name="sparkles-outline" size={18} color={colors.accentForeground} />
            <Text style={styles.tipText}>
              Your saved photos will appear here after your first mark.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, top: number, bottom: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: top + (Platform.OS === 'web' ? 67 : 22),
      paddingBottom: bottom + (Platform.OS === 'web' ? 34 : 28),
      paddingHorizontal: 20,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 24,
    },
    eyebrow: {
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      letterSpacing: 2.3,
      marginBottom: 8,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 29,
      letterSpacing: -0.8,
    },
    iconButton: {
      width: 45,
      height: 45,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    heroCard: {
      overflow: 'hidden',
      borderRadius: 26,
      backgroundColor: '#E8EEFF',
      padding: 22,
      marginBottom: 15,
    },
    heroGlow: {
      position: 'absolute',
      width: 180,
      height: 180,
      borderRadius: 90,
      backgroundColor: '#D2DDFF',
      right: -74,
      top: -64,
    },
    heroCopy: { position: 'relative' },
    heroIcon: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      marginBottom: 18,
    },
    heroTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 24,
      letterSpacing: -0.6,
      marginBottom: 7,
    },
    heroBody: {
      color: '#4D6080',
      fontFamily: 'Inter_400Regular',
      fontSize: 14,
      lineHeight: 21,
      maxWidth: 260,
    },
    heroMeta: {
      flexDirection: 'row',
      gap: 15,
      marginTop: 24,
    },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: {
      color: '#38517A',
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
    },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 31 },
    captureAction: {
      flex: 1,
      minHeight: 110,
      borderRadius: 21,
      padding: 17,
      justifyContent: 'space-between',
      backgroundColor: colors.primary,
      shadowColor: colors.primary,
      shadowOpacity: 0.22,
      shadowRadius: 14,
      shadowOffset: { width: 0, height: 7 },
      elevation: 5,
    },
    galleryAction: {
      flex: 1,
      minHeight: 110,
      borderRadius: 21,
      padding: 17,
      justifyContent: 'space-between',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    captureLabel: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
      marginTop: 12,
    },
    captureHint: {
      color: '#C9D6FF',
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      marginTop: -1,
    },
    galleryLabel: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
      marginTop: 12,
    },
    galleryHint: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      marginTop: -1,
    },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      marginBottom: 14,
    },
    sectionTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 19,
      letterSpacing: -0.3,
    },
    sectionSubtitle: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      marginTop: 5,
    },
    localBadge: {
      color: colors.primary,
      fontFamily: 'Inter_700Bold',
      fontSize: 9,
      letterSpacing: 1.2,
      marginBottom: 4,
    },
    recentGrid: { flexDirection: 'row', gap: 12 },
    recentCard: {
      flex: 1,
      height: 188,
      overflow: 'hidden',
      borderRadius: 20,
      backgroundColor: colors.muted,
    },
    cardPressed: { opacity: 0.84, transform: [{ scale: 0.98 }] },
    recentImage: { ...StyleSheet.absoluteFillObject, width: undefined, height: undefined },
    recentOverlay: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(12, 24, 44, 0.25)',
    },
    recentInfo: { position: 'absolute', left: 14, bottom: 14 },
    recentLabel: {
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
    recentDate: {
      color: 'rgba(255,255,255,0.78)',
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      marginTop: 3,
    },
    arrowBadge: {
      position: 'absolute',
      top: 11,
      right: 11,
      width: 29,
      height: 29,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.82)',
    },
    tipRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      backgroundColor: colors.accent,
      padding: 14,
      borderRadius: 16,
      marginTop: 17,
    },
    tipText: {
      flex: 1,
      color: colors.accentForeground,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      lineHeight: 18,
    },
    pressed: { opacity: 0.76 },
  });
}