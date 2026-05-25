import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { useTranslation } from "react-i18next";
import { useLoadProfile } from "@/hooks/useProfile";
import { colors, layout } from "@/theme";

// Oversized tab bar: tall bar + large icons + always-visible labels so each
// destination is an easy gloved target while riding.
export default function TabsLayout() {
  const { t } = useTranslation();
  useLoadProfile();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 92,
          paddingTop: layout.spacing.sm,
        },
        tabBarLabelStyle: {
          fontSize: layout.font.label,
          fontWeight: layout.fontWeight.bold,
          paddingBottom: layout.spacing.xs,
        },
        tabBarItemStyle: {
          paddingVertical: layout.spacing.xs,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.navigate"),
          tabBarIcon: ({ color }) => <Ionicons name="navigate" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: t("tabs.media"),
          tabBarIcon: ({ color }) => <Ionicons name="musical-notes" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="intercom"
        options={{
          title: t("tabs.intercom"),
          tabBarIcon: ({ color }) => <Ionicons name="bluetooth" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: t("tabs.group"),
          tabBarIcon: ({ color }) => <Ionicons name="people" size={32} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.you"),
          tabBarIcon: ({ color }) => <Ionicons name="person-circle" size={32} color={color} />,
        }}
      />
    </Tabs>
  );
}
