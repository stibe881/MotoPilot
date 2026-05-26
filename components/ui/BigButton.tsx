import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, layout } from "@/theme";

type Variant = "primary" | "neutral" | "success" | "danger";

type Props = {
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  /** Render a square icon-only button (e.g. media transport controls). */
  iconOnly?: boolean;
  style?: StyleProp<ViewStyle>;
};

const VARIANT_BG: Record<Variant, string> = {
  primary: colors.accent,
  neutral: "rgba(20, 24, 36, 0.4)", // transparent graphite for glassmorphism
  success: colors.success,
  danger: colors.danger,
};

const VARIANT_FG: Record<Variant, string> = {
  primary: colors.onAccent,
  neutral: colors.textPrimary,
  success: colors.onAccent,
  danger: colors.textPrimary,
};

/**
 * Oversized, high-contrast button sized for riding gloves (>= 60pt).
 * Includes subtle premium scale transform and glowing shadow effects.
 */
export function BigButton({
  label,
  icon,
  onPress,
  variant = "primary",
  loading = false,
  disabled = false,
  iconOnly = false,
  style,
}: Props) {
  const fg = disabled ? colors.textDisabled : VARIANT_FG[variant];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label ?? (typeof icon === "string" ? icon : undefined)}
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        iconOnly && styles.iconOnly,
        variant === "primary" && !disabled && styles.primaryGlow,
        variant === "neutral" && !disabled && styles.neutralBorder,
        {
          backgroundColor: disabled ? colors.surface : VARIANT_BG[variant],
          opacity: pressed ? 0.85 : 1,
          transform: [{ scale: pressed && !disabled ? 0.97 : 1 }],
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <View style={styles.content}>
          {icon ? <Ionicons name={icon} size={28} color={fg} /> : null}
          {label && !iconOnly ? (
            <Text style={[styles.label, { color: fg }]} numberOfLines={1}>
              {label}
            </Text>
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.touchTargetMin,
    minWidth: layout.touchTargetMin,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOnly: {
    width: layout.touchTargetLarge,
    height: layout.touchTargetLarge,
    paddingHorizontal: 0,
    borderRadius: layout.radius.pill,
  },
  primaryGlow: {
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  neutralBorder: {
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: layout.spacing.sm,
  },
  label: {
    fontSize: layout.font.body,
    fontWeight: layout.fontWeight.bold,
  },
});
