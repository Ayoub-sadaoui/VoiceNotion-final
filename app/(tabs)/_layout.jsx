import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { Platform, View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ProtectedRoute from "../../components/ProtectedRoute";
import FloatingTabBar from "../../components/FloatingTabBar";

export default function TabLayout() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

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

  // Custom tab bar that checks the current route
  const renderTabBar = (props) => {
    // Don't show the tab bar on the Editor screen
    const currentRoute = props.state.routes[props.state.index];
    if (currentRoute.name === "editor/index") {
      return null;
    }

    return <FloatingTabBar {...props} />;
  };

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: theme.primary,
          tabBarInactiveTintColor: theme.secondaryText,
          headerShown: false,
          tabBarStyle: { display: "none" }, // Hide the default tab bar
        }}
        tabBar={renderTabBar}
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

        {/* Keep editor tab last so it doesn't disrupt the tab order in the floating bar */}
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
      </Tabs>
    </ProtectedRoute>
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
