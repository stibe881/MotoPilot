import { useCallback, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { ScreenScaffold } from "@/components/ui/ScreenScaffold";
import { BigButton } from "@/components/ui/BigButton";
import { useGroupRide } from "@/hooks/useGroupRide";
import { createGroup, joinGroupByCode, leaveGroup, listMyGroups } from "@/lib/groups";
import { useRideStore } from "@/store/useRideStore";
import { colors, layout } from "@/theme";
import type { RiderGroup } from "@/types/models";

export default function GroupsScreen() {
  const [groups, setGroups] = useState<RiderGroup[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const liveCount = useRideStore((s) => Object.keys(s.liveRiders).length);
  useGroupRide(activeId, activeId !== null);

  const refresh = useCallback(async () => {
    try {
      setGroups(await listMyGroups());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenScaffold title="Group Ride" subtitle="Ride together, see everyone live" icon="people">
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="New group name"
          placeholderTextColor={colors.textDisabled}
          value={name}
          onChangeText={setName}
        />
        <BigButton
          label="Create"
          icon="add-circle"
          loading={busy}
          disabled={!name.trim()}
          onPress={() =>
            run(async () => {
              await createGroup(name.trim());
              setName("");
              await refresh();
            })
          }
        />
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Join code"
          placeholderTextColor={colors.textDisabled}
          autoCapitalize="characters"
          value={code}
          onChangeText={setCode}
        />
        <BigButton
          label="Join"
          icon="enter"
          variant="neutral"
          loading={busy}
          disabled={!code.trim()}
          onPress={() =>
            run(async () => {
              await joinGroupByCode(code.trim());
              setCode("");
              await refresh();
            })
          }
        />
      </View>

      {groups.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>No groups yet. Create one or join with a code.</Text>
        </View>
      ) : (
        groups.map((g) => {
          const isActive = g.id === activeId;
          return (
            <View key={g.id} style={[styles.groupCard, isActive && styles.groupCardActive]}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupName}>{g.name}</Text>
                <Text style={styles.joinCode}>{g.join_code}</Text>
              </View>
              {isActive ? (
                <Text style={styles.liveText}>● Live · {liveCount} rider(s) sharing</Text>
              ) : null}
              <View style={styles.groupActions}>
                <BigButton
                  label={isActive ? "Stop sharing" : "Start ride"}
                  icon={isActive ? "stop-circle" : "navigate"}
                  variant={isActive ? "danger" : "primary"}
                  onPress={() => setActiveId(isActive ? null : g.id)}
                  style={styles.flex}
                />
                <Pressable
                  style={styles.leaveButton}
                  onPress={() =>
                    run(async () => {
                      if (activeId === g.id) setActiveId(null);
                      await leaveGroup(g.id);
                      await refresh();
                    })
                  }
                >
                  <Text style={styles.leaveText}>Leave</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  error: { color: colors.danger, fontSize: layout.font.label, fontWeight: layout.fontWeight.bold },
  form: { flexDirection: "row", gap: layout.spacing.sm, alignItems: "center" },
  input: {
    flex: 1,
    minHeight: layout.touchTargetMin,
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    paddingHorizontal: layout.spacing.md,
    color: colors.textPrimary,
    fontSize: layout.font.body,
  },
  emptyState: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    padding: layout.spacing.xl,
    alignItems: "center",
  },
  emptyText: { color: colors.textSecondary, fontSize: layout.font.body, textAlign: "center" },
  groupCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: layout.radius.md,
    padding: layout.spacing.md,
    gap: layout.spacing.sm,
    borderWidth: 2,
    borderColor: "transparent",
  },
  groupCardActive: { borderColor: colors.success },
  groupHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  groupName: { color: colors.textPrimary, fontSize: layout.font.title, fontWeight: layout.fontWeight.heavy },
  joinCode: { color: colors.accent, fontSize: layout.font.body, fontWeight: layout.fontWeight.bold, letterSpacing: 2 },
  liveText: { color: colors.success, fontSize: layout.font.label, fontWeight: layout.fontWeight.bold },
  groupActions: { flexDirection: "row", gap: layout.spacing.sm, alignItems: "center" },
  flex: { flex: 1 },
  leaveButton: {
    minHeight: layout.touchTargetMin,
    paddingHorizontal: layout.spacing.lg,
    borderRadius: layout.radius.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  leaveText: { color: colors.textSecondary, fontSize: layout.font.body, fontWeight: layout.fontWeight.bold },
});
