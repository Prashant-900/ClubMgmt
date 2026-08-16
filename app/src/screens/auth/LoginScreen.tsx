import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BracketMark, Button, Screen } from '../../components';
import { useAuth } from '../../context/AuthContext';
import { colors, radius, spacing, typography } from '../../theme';

/**
 * Unauthenticated landing screen. A single "Continue with Google" action opens a
 * Chrome Custom Tab (via react-native-inappbrowser-reborn) and the AuthContext
 * seeds the session from the deep-link callback.
 */
export function LoginScreen() {
  const { loginWithGoogle, signingIn } = useAuth();
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    const result = await loginWithGoogle();
    if (result.type === 'error') {
      setError(result.message);
    }
    // 'cancelled' is silent; 'success' is handled by the AuthContext.
  }

  return (
    <Screen scroll={false} contentStyle={styles.content}>
      <View style={styles.hero}>
        <View style={styles.logo}>
          <BracketMark size={34} />
        </View>

        <Text style={styles.title}>Sign in to ClubMgmt</Text>
        <Text style={styles.subtitle}>
          Sign in with your Google account to track and manage contributions.
        </Text>

        <Button
          title="Continue with Google"
          onPress={handleSignIn}
          loading={signingIn}
          disabled={signingIn}
          style={styles.button}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Text style={styles.helper}>
          You'll be brought right back here once Google confirms your account.
        </Text>
      </View>

      <Text style={styles.footer}>ClubMgmt · Role-based domain management</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  hero: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: radius.lg,
    // Transparent box with a rounded outline — the four-color </> mark sits
    // inside it (mirrors the web header logo).
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  button: {
    alignSelf: 'stretch',
    marginHorizontal: spacing.sm,
  },
  error: {
    ...typography.small,
    color: colors.dangerEmphasis,
    textAlign: 'center',
    marginTop: spacing.md,
  },
  helper: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  footer: {
    ...typography.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    paddingBottom: spacing.md,
  },
});
