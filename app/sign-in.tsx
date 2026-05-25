import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BigButton } from "@/components/ui/BigButton";
import { useAuth } from "@/lib/auth";
import { setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/i18n";
import { colors, layout } from "@/theme";

export default function SignInScreen() {
  const { t } = useTranslation();
  const { signInWithPassword, signUpWithPassword } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [step, setStep] = useState<"form" | "language">("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    // For sign-up: first show language picker, then create account
    if (mode === "signup" && step === "form") {
      setStep("language");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signin") {
        await signInWithPassword(email.trim(), password);
      } else {
        await signUpWithPassword(email.trim(), password, displayName.trim() || undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.error"));
      setStep("form");
    } finally {
      setBusy(false);
    }
  };

  const handleLanguageSelect = async (code: LanguageCode) => {
    await setLanguage(code);
    // Now actually create the account
    setBusy(true);
    setError(null);
    try {
      await signUpWithPassword(email.trim(), password, displayName.trim() || undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("auth.error"));
      setStep("form");
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
          <Text style={styles.tagline}>{t("app.tagline")}</Text>

          {/* Language selection step (sign-up only) */}
          {mode === "signup" && step === "language" ? (
            <View style={styles.languageStep}>
              <Text style={styles.languageTitle}>{t("auth.chooseLanguage")}</Text>
              <Text style={styles.languageHint}>{t("auth.languageHint")}</Text>
              <View style={styles.languageRow}>
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <Pressable
                    key={lang.code}
                    style={styles.languageChip}
                    onPress={() => handleLanguageSelect(lang.code)}
                    disabled={busy}
                  >
                    <Text style={styles.languageFlag}>{lang.flag}</Text>
                    <Text style={styles.languageLabel}>{lang.label}</Text>
                  </Pressable>
                ))}
              </View>
              <BigButton
                label={t("auth.haveAccount")}
                variant="neutral"
                onPress={() => {
                  setStep("form");
                  setMode("signin");
                  setError(null);
                }}
              />
            </View>
          ) : (
            <>
              {mode === "signup" ? (
                <TextInput
                  style={styles.input}
                  placeholder={t("auth.displayName")}
                  placeholderTextColor={colors.textDisabled}
                  autoCapitalize="words"
                  value={displayName}
                  onChangeText={setDisplayName}
                />
              ) : null}

              <TextInput
                style={styles.input}
                placeholder={t("auth.email")}
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
                placeholder={t("auth.password")}
                placeholderTextColor={colors.textDisabled}
                secureTextEntry
                textContentType="password"
                value={password}
                onChangeText={setPassword}
              />

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <BigButton
                label={mode === "signin" ? t("auth.signIn") : t("auth.createAccount")}
                onPress={submit}
                loading={busy}
                disabled={!email || !password}
              />
              <BigButton
                label={mode === "signin" ? t("auth.needAccount") : t("auth.haveAccount")}
                variant="neutral"
                onPress={() => {
                  setError(null);
                  setStep("form");
                  setMode((m) => (m === "signin" ? "signup" : "signin"));
                }}
              />
            </>
          )}
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
  languageStep: {
    gap: layout.spacing.md,
  },
  languageTitle: {
    color: colors.textPrimary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.heavy,
    textAlign: "center",
  },
  languageHint: {
    color: colors.textSecondary,
    fontSize: layout.font.label,
    textAlign: "center",
    marginBottom: layout.spacing.sm,
  },
  languageRow: {
    flexDirection: "row",
    gap: layout.spacing.md,
    justifyContent: "center",
  },
  languageChip: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    paddingVertical: layout.spacing.lg,
    alignItems: "center",
    gap: layout.spacing.sm,
  },
  languageFlag: {
    fontSize: 40,
  },
  languageLabel: {
    color: colors.textPrimary,
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
});
