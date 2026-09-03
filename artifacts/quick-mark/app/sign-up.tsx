import React, { useEffect, useState } from 'react';
import { useAuth, useSignUp } from '@clerk/expo';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useColors } from '@workspace/quick-mark-system/hooks/use-colors';

export default function SignUpScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const { signUp, errors, fetchStatus } = useSignUp();
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [message, setMessage] = useState('');
  const busy = fetchStatus === 'fetching';
  const verifyMode =
    signUp.status === 'missing_requirements' &&
    signUp.unverifiedFields?.includes('email_address') === true &&
    signUp.missingFields?.length === 0;
  const styles = makeStyles(colors);

  useEffect(() => {
    if (isSignedIn) router.replace('/' as never);
  }, [isSignedIn, router]);

  const finish = async () => {
    await signUp.finalize({
      navigate: ({ session }) => {
        if (session?.currentTask) {
          setMessage('Your account needs one more step before it can be opened.');
          return;
        }
        router.replace('/' as never);
      },
    });
  };

  const handleCreate = async () => {
    setMessage('');
    const { error } = await signUp.password({
      emailAddress: emailAddress.trim(),
      password,
    });
    if (error) {
      setMessage(error.message || 'We could not create your account. Check your details and try again.');
      return;
    }
    await signUp.verifications.sendEmailCode();
  };

  const handleVerify = async () => {
    setMessage('');
    const { error } = await signUp.verifications.verifyEmailCode({ code: code.trim() });
    if (error) {
      setMessage(error.message || 'That code is not valid. Please try again.');
      return;
    }
    if (signUp.status === 'complete') await finish();
  };

  if (isSignedIn) return null;

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.brandMark}>
          <Ionicons name="scan-outline" size={27} color={colors.primaryForeground} />
        </View>
        <Text style={styles.eyebrow}>TIKSNAP</Text>
        <Text style={styles.title}>{verifyMode ? 'Check your inbox' : 'Make your mark'}</Text>
        <Text style={styles.subtitle}>
          {verifyMode
            ? 'Enter the verification code we sent to finish creating your account.'
            : 'Create an account to keep your TikSnap experience ready wherever you sign in.'}
        </Text>

        <View style={styles.card}>
          {verifyMode ? (
            <>
              <Text style={styles.label}>Verification code</Text>
              <TextInput
                autoFocus
                style={styles.input}
                value={code}
                onChangeText={setCode}
                placeholder="Enter your code"
                placeholderTextColor={colors.mutedForeground}
                keyboardType="number-pad"
              />
              <ErrorText message={message || errors.fields.code?.message} colors={colors} />
              <Pressable
                onPress={handleVerify}
                disabled={!code.trim() || busy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!code.trim() || busy) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryLabel}>Verify and continue</Text>}
              </Pressable>
              <Pressable onPress={() => signUp.verifications.sendEmailCode()} disabled={busy} style={styles.linkButton}>
                <Text style={styles.linkLabel}>Send a new code</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                style={styles.input}
                value={emailAddress}
                onChangeText={setEmailAddress}
                placeholder="you@example.com"
                placeholderTextColor={colors.mutedForeground}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="email-address"
                textContentType="emailAddress"
              />
              <ErrorText message={message || errors.fields.emailAddress?.message} colors={colors} />
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.mutedForeground}
                secureTextEntry
                textContentType="newPassword"
              />
              <ErrorText message={errors.fields.password?.message} colors={colors} />
              <Pressable
                onPress={handleCreate}
                disabled={!emailAddress.trim() || !password || busy}
                style={({ pressed }) => [
                  styles.primaryButton,
                  (!emailAddress.trim() || !password || busy) && styles.disabledButton,
                  pressed && styles.pressed,
                ]}
              >
                {busy ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryLabel}>Create account</Text>}
              </Pressable>
              <Text style={styles.terms}>Your photos remain local to this device.</Text>
            </>
          )}
        </View>

        {!verifyMode ? (
          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link href={'/sign-in' as never} asChild>
              <Pressable style={styles.linkButton}>
                <Text style={styles.linkLabel}>Sign in</Text>
              </Pressable>
            </Link>
          </View>
        ) : null}
        <View style={styles.localNote}>
          <Feather name="lock" size={13} color={colors.mutedForeground} />
          <Text style={styles.localNoteText}>Secure account. Local-first photos.</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ErrorText({
  message,
  colors,
}: {
  message?: string;
  colors: ReturnType<typeof useColors>;
}) {
  return message ? <Text style={{ color: colors.destructive, fontSize: 12 }}>{message}</Text> : null;
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: { flexGrow: 1, width: '100%', maxWidth: 520, alignSelf: 'center', justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 34 },
    brandMark: { width: 58, height: 58, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', alignSelf: 'center', marginBottom: 15 },
    eyebrow: { color: colors.primary, fontFamily: colors.fonts.bold, fontSize: 11, letterSpacing: 2.2, textAlign: 'center' },
    title: { color: colors.foreground, fontFamily: colors.fonts.bold, fontSize: 30, letterSpacing: -0.8, textAlign: 'center', marginTop: 8 },
    subtitle: { color: colors.mutedForeground, fontFamily: colors.fonts.regular, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 360, alignSelf: 'center', marginTop: 10, marginBottom: 24 },
    card: { backgroundColor: colors.card, borderColor: colors.border, borderWidth: StyleSheet.hairlineWidth, borderRadius: 24, padding: 20, gap: 10 },
    label: { color: colors.foreground, fontFamily: colors.fonts.semibold, fontSize: 12, marginTop: 3 },
    input: { height: 50, borderRadius: 15, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.background, color: colors.foreground, fontFamily: colors.fonts.regular, fontSize: 14, paddingHorizontal: 15 },
    primaryButton: { height: 50, borderRadius: 15, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
    primaryLabel: { color: colors.primaryForeground, fontFamily: colors.fonts.bold, fontSize: 14 },
    disabledButton: { opacity: 0.5 },
    linkButton: { alignItems: 'center', paddingVertical: 8 },
    linkLabel: { color: colors.primary, fontFamily: colors.fonts.semibold, fontSize: 13 },
    terms: { color: colors.mutedForeground, fontFamily: colors.fonts.regular, fontSize: 11, lineHeight: 16, textAlign: 'center', marginTop: 4 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 22 },
    footerText: { color: colors.mutedForeground, fontFamily: colors.fonts.regular, fontSize: 13 },
    localNote: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 26 },
    localNoteText: { color: colors.mutedForeground, fontFamily: colors.fonts.regular, fontSize: 11 },
    pressed: { opacity: 0.7 },
  });
}