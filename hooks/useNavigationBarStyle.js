import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";
import { useTheme } from "../utils/themeContext";

/**
 * Hook to manage system navigation bar styling
 * This ensures the navigation bar matches the app theme across all screens
 */
export const useNavigationBarStyle = () => {
  const { theme, isDark } = useTheme();

  useEffect(() => {
    // Only apply on Android devices
    if (Platform.OS !== "android") return;

    const configureNavigationBar = async () => {
      try {
        // Skip navigation bar configuration if edge-to-edge is enabled
        // This prevents the warnings about setBackgroundColorAsync not being supported
        console.log(
          "🎨 Skipping navigation bar configuration (edge-to-edge mode)"
        );
        return;

        // Set navigation bar background color to match app theme
        await NavigationBar.setBackgroundColorAsync(theme.background);

        // Set button style based on theme
        // 'light' means dark icons on light background
        // 'dark' means light icons on dark background
        await NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark");

        console.log("🎨 Navigation bar configured:", {
          backgroundColor: theme.background,
          buttonStyle: isDark ? "light" : "dark",
          isDark,
        });
      } catch (error) {
        console.warn("Failed to configure navigation bar:", error);
      }
    };

    configureNavigationBar();
  }, [theme.background, isDark]);
};

/**
 * Hook specifically for screen-level navigation bar configuration
 * Use this in individual screens that need specific navigation bar styling
 */
export const useScreenNavigationBar = (backgroundColor, buttonStyle) => {
  useEffect(() => {
    if (Platform.OS !== "android") return;

    const configureScreenNavigationBar = async () => {
      try {
        if (backgroundColor) {
          await NavigationBar.setBackgroundColorAsync(backgroundColor);
        }
        if (buttonStyle) {
          await NavigationBar.setButtonStyleAsync(buttonStyle);
        }
      } catch (error) {
        console.warn("Failed to configure screen navigation bar:", error);
      }
    };

    configureScreenNavigationBar();
  }, [backgroundColor, buttonStyle]);
};
