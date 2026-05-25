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
        <View style={styles.header}>
          <Ionicons name={icon} size={36} color={colors.accent} />
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.heavy,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
  },
  body: {
    gap: layout.spacing.md,
  },
});
