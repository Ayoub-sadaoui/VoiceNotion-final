import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const FloatingTabBar = ({ state, descriptors, navigation }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Log available routes for debugging
  console.log(
    "Available routes:",
    state.routes.map((r) => r.name)
  );
  console.log("Current tab index:", state.index);

  // Map route names to icons and labels
  const getTabInfo = (routeName) => {
    if (routeName === "home/index") {
      return { iconName: "home", label: "Home" };
    }
    if (routeName === "search/index") {
      return { iconName: "search", label: "Search" };
    }
    if (routeName === "profile/index") {
      return { iconName: "person", label: "Profile" };
    }
    if (routeName === "editor/index") {
      return { iconName: "document-text", label: "Editor" };
    }
    return { iconName: "home", label: "Home" }; // Default fallback
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingBottom: insets.bottom > 0 ? insets.bottom : 20,
          backgroundColor: "transparent",
        },
      ]}
    >
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.mode === "dark" ? "#1A1B1E" : "#1A1B1E",
            shadowColor:
              theme.mode === "dark"
                ? "rgba(0, 0, 0, 0.5)"
                : "rgba(0, 0, 0, 0.3)",
          },
        ]}
      >
        {state.routes.map((route, index) => {
          // Skip the Editor tab in the bottom bar
          if (route.name === "editor/index") return null;

          const { options } = descriptors[route.key];
          const { iconName, label } = getTabInfo(route.name);
          const isFocused = state.index === index;

          const onPress = () => {
            console.log("Tab pressed:", route.name);

            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
            });

            if (!isFocused && !event.defaultPrevented) {
              console.log("Navigating to:", route.name);

              // Use router.push for more reliable navigation
              // Convert route.name (like "home/index") to the correct path format ("/(tabs)/home")
              const path = `/(tabs)/${route.name.split("/")[0]}`;
              console.log("Navigating to path:", path);
              router.push(path);
            }
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel}
              onPress={onPress}
              style={[styles.tab, isFocused && styles.activeTab]}
            >
              <View style={styles.tabContent}>
                <Ionicons
                  name={isFocused ? iconName : `${iconName}-outline`}
                  size={22}
                  color={isFocused ? "#000000" : "#FFFFFF"}
                />
                {isFocused && <Text style={styles.tabText}>{label}</Text>}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 999,
  },
  tabBar: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    borderRadius: 30,
    paddingVertical: 8,
    paddingHorizontal: 8,
    width: "100%",
    height: 64,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  tab: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 30,
    marginHorizontal: 5,
    flex: 1,
    height: 48,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
    color: "#000000",
  },
});

export default FloatingTabBar;
