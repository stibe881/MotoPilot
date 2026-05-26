import { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTranslation } from "react-i18next";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { useAuth } from "@/lib/auth";
import { updateMyProfile } from "@/lib/profile";
import { setLanguage, SUPPORTED_LANGUAGES, LanguageCode } from "@/lib/i18n";
import i18n from "@/lib/i18n";
import { useProfileStore } from "@/store/useProfileStore";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";
import type { DistanceUnit } from "@/types/models";

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { user, signOut } = useAuth();
  const profile = useProfileStore((s) => s.profile);
  const setProfile = useProfileStore((s) => s.setProfile);

  const showTrackedPath = useRideStore((s) => s.showTrackedPath);
  const setShowTrackedPath = useRideStore((s) => s.setShowTrackedPath);

  const [displayName, setDisplayName] = useState("");
  const [bikeMake, setBikeMake] = useState("");
  const [bikeModel, setBikeModel] = useState("");
  const [units, setUnits] = useState<DistanceUnit>("metric");
  const [currentLang, setCurrentLang] = useState<LanguageCode>(
    (i18n.language as LanguageCode) ?? "de"
  );
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setDisplayName(profile.display_name ?? "");
    setBikeMake(profile.bike_make ?? "");
    setBikeModel(profile.bike_model ?? "");
    setUnits(profile.units);
  }, [profile]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateMyProfile({
        display_name: displayName.trim() || null,
        bike_make: bikeMake.trim() || null,
        bike_model: bikeModel.trim() || null,
        units,
      });
      setProfile(updated);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("profile.saveError"));
    } finally {
      setBusy(false);
    }
  };

  const handleLanguageChange = async (code: LanguageCode) => {
    await setLanguage(code);
    setCurrentLang(code);
  };

  return (
    <ScreenScaffold title={t("profile.title")} subtitle={user?.email ?? undefined} icon="person-circle">
      <TextInput
        style={styles.input}
        placeholder={t("profile.displayName")}
        placeholderTextColor={colors.textDisabled}
        value={displayName}
        onChangeText={setDisplayName}
      />
      <View style={styles.bikeRow}>
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder={t("profile.bikeMake")}
          placeholderTextColor={colors.textDisabled}
          value={bikeMake}
          onChangeText={setBikeMake}
        />
        <TextInput
          style={[styles.input, styles.flex]}
          placeholder={t("profile.model")}
          placeholderTextColor={colors.textDisabled}
          value={bikeModel}
          onChangeText={setBikeModel}
        />
      </View>

      <Text style={styles.label}>{t("profile.units")}</Text>
      <View style={styles.unitRow}>
        {(["metric", "imperial"] as DistanceUnit[]).map((u) => {
          const active = u === units;
          return (
            <Pressable
              key={u}
              onPress={() => setUnits(u)}
              style={[styles.unitChip, active && styles.unitChipActive]}
            >
              <Text style={[styles.unitText, active && styles.unitTextActive]}>
                {u === "metric" ? "km" : "mi"}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>{t("profile.language")}</Text>
      <View style={styles.unitRow}>
        {SUPPORTED_LANGUAGES.map((lang) => {
          const active = lang.code === currentLang;
          return (
            <Pressable
              key={lang.code}
              onPress={() => handleLanguageChange(lang.code)}
              style={[styles.unitChip, active && styles.unitChipActive]}
            >
              <Text style={styles.langFlag}>{lang.flag}</Text>
              <Text style={[styles.unitText, active && styles.unitTextActive]}>
                {lang.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.label}>Gefahrene Strecke</Text>
      <View style={styles.unitRow}>
        {([
          { key: true, label: "Anzeigen" },
          { key: false, label: "Ausblenden" },
        ] as const).map((opt) => {
          const active = opt.key === showTrackedPath;
          return (
            <Pressable
              key={opt.label}
              onPress={() => setShowTrackedPath(opt.key)}
              style={[styles.unitChip, active && styles.unitChipActive]}
            >
              <Text style={[styles.unitText, active && styles.unitTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}
      {saved ? <Text style={styles.saved}>{t("profile.saved")}</Text> : null}

      <BigButton label={t("profile.save")} icon="save" onPress={save} loading={busy} />
      <BigButton label={t("profile.signOut")} icon="log-out" variant="danger" onPress={() => signOut()} />
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: layout.touchTargetMin,
    backgroundColor: "rgba(20, 24, 36, 0.4)", // glass slate
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.body,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  bikeRow: { flexDirection: "row", gap: layout.spacing.sm },
  flex: { flex: 1 },
  label: { 
    color: colors.textSecondary, 
    fontSize: layout.font.label - 1, 
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: layout.spacing.xs,
  },
  unitRow: { flexDirection: "row", gap: layout.spacing.sm },
  unitChip: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    borderRadius: layout.radius.sm, // sporty chamfered styling
    backgroundColor: "rgba(12, 14, 20, 0.8)",
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: layout.spacing.sm,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  unitChipActive: { 
    backgroundColor: "rgba(255, 94, 0, 0.12)", // neon orange backing tint
    borderColor: colors.accent, // neon orange border
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  unitText: { 
    color: colors.textSecondary, 
    fontSize: layout.font.body, 
    fontWeight: layout.fontWeight.heavy,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  unitTextActive: { 
    color: colors.accent, 
  },
  langFlag: { fontSize: 22 },
  error: { 
    color: colors.danger, 
    fontSize: layout.font.label, 
    fontWeight: layout.fontWeight.bold,
    paddingLeft: layout.spacing.xs,
  },
  saved: { 
    color: colors.success, 
    fontSize: layout.font.label, 
    fontWeight: layout.fontWeight.bold,
    paddingLeft: layout.spacing.xs,
  },
});
