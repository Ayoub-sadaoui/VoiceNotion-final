import React, { useRef, useState } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Text,
  Animated,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/themeContext";

/**
 * Floating Action Button Component
 *
 * Displays a floating action button for primary actions with animations
 */
const FloatingActionButton = ({ onPress, icon, label, isExtended = false }) => {
  const { theme } = useTheme();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const shadowAnim = useRef(new Animated.Value(0)).current;
  const [isPressed, setIsPressed] = useState(false);

  // Handle button press animation
  const handlePressIn = () => {
    setIsPressed(true);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0.9,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(shadowAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Calculate shadow properties based on animation
  const shadowOpacity = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.25, 0.15],
  });

  const shadowRadius = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [4, 2],
  });

  const elevation = shadowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [6, 3],
  });

  return (
    <Animated.View
      style={[
        styles.fabContainer,
        {
          transform: [{ scale: scaleAnim }],
          shadowOpacity,
          shadowRadius,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.fab,
          {
            backgroundColor: theme.primary,
            width: isExtended || label ? "auto" : 56,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.95}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        {icon ? icon : <Ionicons name="add" size={24} color="#FFFFFF" />}
        {label && <Text style={styles.label}>{label}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  fabContainer: {
    position: "absolute",
    bottom: 20,
    right: 20,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    elevation: 5,
    zIndex: 10,
  },
  fab: {
    height: 56,
    minWidth: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    flexDirection: "row",
  },
  label: {
    color: "#FFFFFF",
    marginLeft: 8,
    fontWeight: "500",
  },
});

export default FloatingActionButton;
