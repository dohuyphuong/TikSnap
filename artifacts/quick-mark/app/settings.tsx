import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import {
  readWatermarkEnabled,
  writeWatermarkEnabled,
} from '@/lib/storage';

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void readWatermarkEnabled().then((value) => {
      setWatermarkEnabled(value);
      setLoading(false);
    });
  }, []);

  const styles = makeStyles(colors, insets.top, insets.bottom);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Feather name="arrow-left" size={21} color={colors.foreground} />
          </Pressable>
          <Text style={styles.headerTitle}>Settings</Text>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.intro}>
          <View style={styles.introIcon}>
            <Ionicons name="options-outline" size={23} color={colors.primary} />
          </View>
          <Text style={styles.title}>Your mark, your way.</Text>
          <Text style={styles.subtitle}>
            Keep the workflow light. Every photo and note stays on this device.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>EDITOR DEFAULTS</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingIcon}>
            <Feather name="award" size={19} color={colors.primary} />
          </View>
          <View style={styles.settingCopy}>
            <Text style={styles.settingTitle}>Add watermark</Text>
            <Text style={styles.settingDescription}>
              Add a subtle Quick Mark signature to saved images.
            </Text>
          </View>
          {loading ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <Switch
              accessibilityLabel="Toggle watermark"
              testID="watermark-switch"
              value={watermarkEnabled}
              onValueChange={(value) => {
                setWatermarkEnabled(value);
                void writeWatermarkEnabled(value);
              }}
              trackColor={{ false: colors.border, true: '#AFC1FF' }}
              thumbColor={watermarkEnabled ? colors.primary : '#FFFFFF'}
            />
          )}
        </View>

        <Text style={styles.sectionLabel}>ABOUT</Text>
        <View style={styles.aboutCard}>
          <View style={styles.mark}>
            <Ionicons name="scan-outline" size={24} color={colors.primaryForeground} />
          </View>
          <View style={styles.aboutCopy}>
            <Text style={styles.aboutTitle}>Quick Mark</Text>
            <Text style={styles.aboutBody}>A faster way to point things out.</Text>
          </View>
          <Text style={styles.version}>MVP 1.0</Text>
        </View>

        <View style={styles.privacyRow}>
          <Feather name="shield" size={16} color={colors.mutedForeground} />
          <Text style={styles.privacyText}>
            Photos are processed locally. Quick Mark does not upload your images.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>, top: number, bottom: number) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingTop: top + 14,
      paddingBottom: bottom + 28,
      paddingHorizontal: 20,
    },
    header: {
      height: 49,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 30,
    },
    backButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 17,
    },
    headerSpacer: { width: 42 },
    intro: { alignItems: 'center', marginBottom: 34 },
    introIcon: {
      width: 54,
      height: 54,
      borderRadius: 19,
      backgroundColor: colors.secondary,
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 17,
    },
    title: {
      color: colors.foreground,
      fontFamily: 'Inter_700Bold',
      fontSize: 26,
      letterSpacing: -0.6,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 20,
      maxWidth: 280,
      textAlign: 'center',
      marginTop: 8,
    },
    sectionLabel: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_700Bold',
      fontSize: 10,
      letterSpacing: 1.5,
      marginBottom: 10,
    },
    settingCard: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      borderRadius: 20,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: 31,
    },
    settingIcon: {
      width: 39,
      height: 39,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 12,
    },
    settingCopy: { flex: 1, paddingRight: 10 },
    settingTitle: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    settingDescription: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 16,
      marginTop: 3,
    },
    aboutCard: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 20,
      padding: 16,
      backgroundColor: '#15233C',
      marginBottom: 18,
    },
    mark: {
      width: 43,
      height: 43,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primary,
      marginRight: 12,
    },
    aboutCopy: { flex: 1 },
    aboutTitle: {
      color: '#FFFFFF',
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
    },
    aboutBody: {
      color: '#AAB8CC',
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      marginTop: 3,
    },
    version: {
      color: '#AAB8CC',
      fontFamily: 'Inter_500Medium',
      fontSize: 10,
    },
    privacyRow: {
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 3,
      alignItems: 'flex-start',
    },
    privacyText: {
      flex: 1,
      color: colors.mutedForeground,
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      lineHeight: 16,
    },
    pressed: { opacity: 0.72 },
  });
}