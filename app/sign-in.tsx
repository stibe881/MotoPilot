import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BigButton } from "@/components/ui/BigButton";
import { useAuth } from "@/lib/auth";
import { colors, layout } from "@/theme";

export default function SignInScreen() {
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.brand}>MotoPilot</Text>
          <Text style={styles.tagline}>Your single pane of glass on the bars.</Text>

          {mode === "signup" ? (
            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor={colors.textDisabled}
              autoCapitalize="words"
              value={displayName}
              onChangeText={setDisplayName}
            />
          ) : null}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textDisabled}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            value={email}
            onChangeText={setEmail}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textDisabled}
            secureTextEntry
            textContentType="password"
            value={password}
            onChangeText={setPassword}
          />

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <BigButton
            label={mode === "signin" ? "Sign in" : "Create account"}
            onPress={submit}
            loading={busy}
            disabled={!email || !password}
          />
          <BigButton
            label={mode === "signin" ? "Need an account? Sign up" : "Have an account? Sign in"}
            variant="neutral"
            onPress={() => {
              setError(null);
              setMode((m) => (m === "signin" ? "signup" : "signin"));
            }}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  flex: { flex: 1 },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: layout.spacing.lg,
    gap: layout.spacing.md,
  },
  brand: {
    color: colors.accent,
    fontSize: layout.font.hero,
    fontWeight: layout.fontWeight.heavy,
  },
  tagline: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
    marginBottom: layout.spacing.lg,
  },
  input: {
    minHeight: layout.touchTargetMin,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.body,
  },
  error: {
    color: colors.danger,
    fontSize: layout.font.label,
    fontWeight: layout.fontWeight.bold,
  },
});
