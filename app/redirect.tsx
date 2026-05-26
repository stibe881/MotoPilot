import { useEffect } from "react";
import { StyleSheet, Text, View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import { colors, layout } from "@/theme";

export default function RedirectScreen() {
  const router = useRouter();

  useEffect(() => {
    // Gracefully redirect back to the media player screen after a short loading animation
    const timer = setTimeout(() => {
      router.replace("/(tabs)/media");
    }, 1500);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.title}>Spotify Verbindung</Text>
      <Text style={styles.subtitle}>Verbindung wird hergestellt und autorisiert...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C0E14", // premium carbon black cockpit theme
    alignItems: "center",
    justifyContent: "center",
    gap: layout.spacing.md,
    padding: layout.spacing.lg,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "bold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
  },
});
