import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../utils/themeContext";

/**
 * NotificationBadge - A small red circle with count to show on icons
 * @param {number} count - Number to display in the badge
 * @param {boolean} show - Whether to show the badge (default: true if count > 0)
 * @param {Object} style - Additional styles for the badge container
 */
const NotificationBadge = ({ count, show = count > 0, style }) => {
  const { theme } = useTheme();

  if (!show || count <= 0) return null;

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: theme.error || "#FF4444" },
        style,
      ]}
    >
      <Text style={[styles.badgeText, { color: "#FFFFFF" }]}>
        {count > 99 ? "99+" : count.toString()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    zIndex: 1,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default NotificationBadge;
