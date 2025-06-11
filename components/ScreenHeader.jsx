import React from "react";
import { View, Text, StyleSheet, Platform, StatusBar } from "react-native";
import { useTheme } from "../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Screen Header Component
 *
 * Displays the screen title and optional right element
 */
const ScreenHeader = ({ title, rightElement }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate padding to avoid status bar
  const statusBarHeight =
    Platform.OS === "ios" ? insets.top : StatusBar.currentHeight || 0;

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          paddingTop: Math.max(statusBarHeight, 10) + 5,
          paddingBottom: 15,
        },
      ]}
    >
      <View style={styles.titleContainer}>
        <Text
          style={[styles.title, { color: theme.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {title}
        </Text>
      </View>
      {rightElement && (
        <View style={styles.rightContainer}>{rightElement}</View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 10,
    elevation: 0,
    shadowColor: "transparent",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  titleContainer: {
    flex: 1,
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "600",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ScreenHeader;
