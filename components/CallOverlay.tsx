import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BigButton } from "@/components/ui/BigButton";
import { answerCall, endCall, setupCallKeep } from "@/lib/callkeep";
import { useCallStore } from "@/store/useCallStore";
import { colors, layout } from "@/theme";

const STATE_LABEL: Record<string, string> = {
  incoming: "Incoming call",
  outgoing: "Calling…",
  active: "On call",
};

/**
 * Full-screen, high-contrast call overlay. Mounted once at the root; renders
 * nothing until CallKit reports a call (via lib/callkeep). Large Answer / End
 * targets so a call can be handled with a gloved hand without app-switching.
 */
export function CallOverlay() {
  const call = useCallStore((s) => s.call);

  useEffect(() => {
    setupCallKeep().catch((e) => console.warn("CallKeep setup failed", e));
  }, []);

  if (!call) return null;

  const isIncoming = call.state === "incoming";

  return (
    <View style={styles.overlay}>
      <View style={styles.body}>
        <Text style={styles.state}>{STATE_LABEL[call.state] ?? "Call"}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {call.callerName || call.handle}
        </Text>
        {call.callerName ? (
          <Text style={styles.handle} numberOfLines={1}>
            {call.handle}
          </Text>
        ) : null}
      </View>

      <View style={styles.actions}>
        {isIncoming ? (
          <>
            <BigButton
              label="Decline"
              icon="call"
              variant="danger"
              style={styles.action}
              onPress={() => endCall(call.uuid)}
            />
            <BigButton
              label="Answer"
              icon="call"
              variant="success"
              style={styles.action}
              onPress={() => answerCall(call.uuid)}
            />
          </>
        ) : (
          <BigButton
            label="End call"
            icon="call"
            variant="danger"
            style={styles.action}
            onPress={() => endCall(call.uuid)}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.background,
    zIndex: 1000,
    justifyContent: "space-between",
    paddingVertical: 96,
    paddingHorizontal: layout.spacing.lg,
  },
  body: {
    alignItems: "center",
    gap: layout.spacing.sm,
    marginTop: layout.spacing.xl,
  },
  state: {
    color: colors.textSecondary,
    fontSize: layout.font.title,
    fontWeight: layout.fontWeight.bold,
  },
  name: {
    color: colors.textPrimary,
    fontSize: layout.font.display,
    fontWeight: layout.fontWeight.heavy,
    textAlign: "center",
  },
  handle: {
    color: colors.textSecondary,
    fontSize: layout.font.body,
  },
  actions: {
    flexDirection: "row",
    gap: layout.spacing.lg,
  },
  action: {
    flex: 1,
    minHeight: layout.touchTargetLarge,
  },
});
