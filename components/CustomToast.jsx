import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/themeContext";
import * as Font from "expo-font";

const { width } = Dimensions.get("window");

const CustomToast = ({
  visible,
  message,
  type = "info",
  title,
  duration = 3000,
  onHide,
  showProgress = false,
  progress = 0,
}) => {
  const { theme, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-100)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [fontsLoaded, setFontsLoaded] = useState(false);

  // Font loading has been moved outside component rendering cycle
  // to avoid useInsertionEffect conflicts
  useEffect(() => {
    // Create a cleanup function to prevent state updates if component unmounts
    let isMounted = true;

    async function loadFonts() {
      try {
        // Only load fonts if they haven't been loaded yet
        if (Ionicons.font && !fontsLoaded) {
          await Font.loadAsync(Ionicons.font);
          if (isMounted) {
            setFontsLoaded(true);
          }
        }
      } catch (error) {
        console.error("Error loading Ionicons font:", error);
      }
    }

    loadFonts();

    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, [Ionicons.font, fontsLoaded]); // Dependencies to prevent unnecessary font loading

  // Define toast colors based on type
  const getToastColors = () => {
    switch (type) {
      case "success":
        return {
          icon: "checkmark-circle",
          iconColor: "#4CAF50",
          glowColor: "rgba(76, 175, 80, 0.9)",
          borderColor: "#4CAF50",
        };
      case "error":
        return {
          icon: "close-circle",
          iconColor: "#F44336",
          glowColor: "rgba(244, 67, 54, 0.9)",
          borderColor: "#F44336",
        };
      case "warning":
        return {
          icon: "warning",
          iconColor: "#FFC107",
          glowColor: "rgba(255, 193, 7, 0.9)",
          borderColor: "#FFC107",
        };
      case "recording":
        return {
          icon: "mic",
          iconColor: "#E91E63",
          glowColor: "rgba(233, 30, 99, 0.9)",
          borderColor: "#E91E63",
          pulseAnimation: true,
        };
      case "processing":
        return {
          icon: "sync",
          iconColor: "#2196F3",
          glowColor: "rgba(33, 150, 243, 0.9)",
          borderColor: "#2196F3",
          pulseAnimation: true,
        };
      default:
        return {
          icon: "information-circle",
          iconColor: "#2196F3",
          glowColor: "rgba(33, 150, 243, 0.9)",
          borderColor: "#2196F3",
        };
    }
  };

  const toastColors = getToastColors();

  // Manage animations - separated visibility and auto-hide logic
  const hideToastRef = useRef();

  // Store the hideToast function in a ref to prevent recreating it on each render
  useEffect(() => {
    hideToastRef.current = () => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: -100,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (onHide) onHide();
      });
    };
  }, [fadeAnim, translateY, onHide]);

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Show toast with animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(translateY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();

      if (showProgress) {
        Animated.timing(progressAnim, {
          toValue: 1,
          duration: duration,
          useNativeDriver: false,
        }).start();
      }
    } else if (hideToastRef.current) {
      // Use the ref to call hideToast
      hideToastRef.current();
    }
  }, [visible, fadeAnim, translateY, showProgress, progressAnim, duration]);

  // Set up auto-hide timer
  useEffect(() => {
    if (visible && duration > 0) {
      const timer = setTimeout(() => {
        if (hideToastRef.current) {
          hideToastRef.current();
        }
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration]);

  // Handle pulse animation for recording and processing icons
  useEffect(() => {
    if (visible && toastColors.pulseAnimation) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      pulseAnim.setValue(1);
    };
  }, [visible, pulseAnim, toastColors.pulseAnimation]);

  // The hideToast function has been moved into the useEffect to prevent React scheduling issues

  // Render icon with fallback
  const renderIcon = () => {
    if (!fontsLoaded) {
      // Render a simple circle as fallback while fonts are loading
      return (
        <View
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            backgroundColor: toastColors.iconColor,
          }}
        />
      );
    }

    return (
      <Ionicons
        name={toastColors.icon}
        size={16}
        color={toastColors.iconColor}
      />
    );
  };

  // Render close icon with fallback
  const renderCloseIcon = () => {
    if (!fontsLoaded) {
      // Render a simple X as fallback
      return (
        <Text
          style={{
            color: theme.secondaryText,
            fontSize: 14,
            fontWeight: "bold",
          }}
        >
          ×
        </Text>
      );
    }

    return <Ionicons name="close" size={14} color={theme.secondaryText} />;
  };

  // Don't render if not visible
  if (!visible) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <View
        style={[
          styles.toastContainer,
          {
            backgroundColor: isDark
              ? "rgba(30, 30, 30, 0.9)"
              : "rgba(255, 255, 255, 0.9)",
            borderColor: toastColors.borderColor,
            shadowColor: toastColors.glowColor,
          },
        ]}
      >
        <View style={styles.contentContainer}>
          <Animated.View
            style={[
              styles.iconContainer,
              toastColors.pulseAnimation && {
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            {renderIcon()}
          </Animated.View>

          {message && (
            <Text
              style={[
                styles.message,
                { color: theme.text },
                !title && { marginLeft: 4 },
                { textAlign: "center" },
              ]}
              numberOfLines={1}
            >
              {message}
            </Text>
          )}

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => hideToastRef.current && hideToastRef.current()}
          >
            {renderCloseIcon()}
          </TouchableOpacity>
        </View>

        {showProgress && (
          <Animated.View
            style={[
              styles.progressBar,
              {
                backgroundColor: toastColors.borderColor,
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 10,
    alignSelf: "center",
    width: width * 0.6,
    maxWidth: 220,
    zIndex: 10000,
    marginTop: 30,
  },
  toastContainer: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1.5,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    shadowOpacity: 1,
    shadowRadius: 20,
    elevation: 15,
  },
  contentContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  iconContainer: {
    marginRight: 6,
  },
  message: {
    fontSize: 12,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
  closeButton: {
    padding: 2,
    marginLeft: 4,
  },
  progressBar: {
    height: 2,
    width: "100%",
  },
});

export default CustomToast;
