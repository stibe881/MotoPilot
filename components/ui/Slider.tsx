import { useState } from "react";
import { StyleSheet, View, type GestureResponderEvent } from "react-native";
import { colors, layout } from "@/theme";

interface Props {
  value: number;
  onValueChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}

/**
 * Glove-friendly track slider (no native dependency). Tapping or dragging
 * anywhere on the track sets the value, snapped to `step`.
 */
export function Slider({ value, onValueChange, min = 0, max = 100, step = 1 }: Props) {
  const [width, setWidth] = useState(0);

  const handleTouch = (evt: GestureResponderEvent) => {
    if (width <= 0) return;
    const x = evt.nativeEvent.locationX;
    const pct = Math.max(0, Math.min(1, x / width));
    const raw = min + pct * (max - min);
    const stepped = Math.round(raw / step) * step;
    onValueChange(Math.max(min, Math.min(max, stepped)));
  };

  const pct = max > min ? (value - min) / (max - min) : 0;

  return (
    <View
      style={styles.track}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => true}
      onMoveShouldSetResponder={() => true}
      onResponderGrant={handleTouch}
      onResponderMove={handleTouch}
    >
      <View style={styles.background} pointerEvents="none" />
      <View style={[styles.fill, { width: `${pct * 100}%` }]} pointerEvents="none" />
      <View style={[styles.thumb, { left: `${pct * 100}%` }]} pointerEvents="none" />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: layout.touchTargetMin,
    justifyContent: "center",
    position: "relative",
    width: "100%",
  },
  background: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 3,
    height: 6,
    width: "100%",
  },
  fill: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    height: 6,
    position: "absolute",
  },
  thumb: {
    backgroundColor: colors.textPrimary,
    borderColor: colors.accent,
    borderRadius: 14,
    borderWidth: 3,
    height: 28,
    width: 28,
    marginLeft: -14,
    position: "absolute",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
});
