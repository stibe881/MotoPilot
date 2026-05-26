import { Ionicons } from "@expo/vector-icons";
import type { ReactNode } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, layout } from "@/theme";

type Props = {
  title: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  children?: ReactNode;
};

/** Shared dark, high-contrast screen shell for the non-map tabs. */
export function ScreenScaffold({ title, subtitle, icon, children }: Props) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.headerContainer}>
          <View style={styles.accentBar} />
          <View style={styles.headerContent}>
            <View style={styles.header}>
              <Ionicons name={icon} size={34} color={colors.accent} style={styles.iconGlow} />
              <Text style={styles.title}>{title}</Text>
            </View>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        </View>
        <View style={styles.body}>{children}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: layout.spacing.lg,
    gap: layout.spacing.lg,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: layout.spacing.md,
    marginBottom: layout.spacing.xs,
  },
  accentBar: {
    width: 4,
    backgroundColor: colors.accent,
    borderRadius: layout.radius.pill,
    shadowColor: colors.accent,
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
  },
  headerContent: {
    flex: 1,
    gap: 4,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.md,
  },
  iconGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  title: {
    color: colors.textPrimary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.heavy,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
    paddingLeft: 2,
  },
  body: {
    gap: layout.spacing.md,
  },
});
