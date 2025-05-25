import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { Platform, View, StyleSheet, Text } from "react-native";

export default function TabLayout() {
  const { theme } = useTheme();

  const renderTabIcon = (name, color, focused) => {
    const iconName = focused ? name : `${name}-outline`;
    return (
      <View style={styles.tabIconContainer}>
        <Ionicons
          name={iconName}
          size={24}
          color={color}
          style={styles.tabIcon}
        />
      </View>
    );
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.secondaryText,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          paddingVertical: 10,
          height: Platform.OS === "ios" ? 85 : 65,
          paddingBottom: Platform.OS === "ios" ? 25 : 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 4,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="home/index"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon("home", color, focused),
        }}
      />

      <Tabs.Screen
        name="editor/index"
        options={{
          title: "Editor",
          headerShown: false,
          tabBarStyle: {
            display: "none",
          },
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon("document-text", color, focused),
        }}
      />

      <Tabs.Screen
        name="search/index"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon("search", color, focused),
        }}
      />

      <Tabs.Screen
        name="profile/index"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) =>
            renderTabIcon("person", color, focused),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIconContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  tabIcon: {
    marginBottom: -2,
  },
});
