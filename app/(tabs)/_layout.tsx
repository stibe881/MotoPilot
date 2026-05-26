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
          backgroundColor: "rgba(12, 14, 20, 0.96)", // premium translucent graphite slate
          borderTopColor: "rgba(255, 255, 255, 0.05)",
          borderTopWidth: 1.5,
          height: 92,
          paddingTop: layout.spacing.sm,
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          elevation: 12,
          shadowColor: "#000000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.25,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: layout.font.label - 1, // slightly refined size
          fontWeight: layout.fontWeight.heavy,
          paddingBottom: layout.spacing.xs,
          letterSpacing: 0.5,
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
          tabBarIcon: ({ color }) => <Ionicons name="compass-sharp" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="media"
        options={{
          title: t("tabs.media"),
          tabBarIcon: ({ color }) => <Ionicons name="headset-sharp" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="intercom"
        options={{
          title: t("tabs.intercom"),
          tabBarIcon: ({ color }) => <Ionicons name="chatbubbles-sharp" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="groups"
        options={{
          title: t("tabs.group"),
          tabBarIcon: ({ color }) => <Ionicons name="people-circle-sharp" size={30} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.you"),
          tabBarIcon: ({ color }) => <Ionicons name="settings-sharp" size={30} color={color} />,
        }}
      />
    </Tabs>
  );
}
