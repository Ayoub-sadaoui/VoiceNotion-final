import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";

// Define theme colors
const lightTheme = {
  background: "#FFFFFF",
  surface: "#F2F2F7",
  text: "#333333",
  secondaryText: "#666666",
  tertiaryText: "#999999",
  primary: "#007AFF", // iOS blue
  accent: "#FF9500", // iOS orange
  success: "#34C759", // iOS green
  error: "#FF3B30", // iOS red
  warning: "#FFCC00", // iOS yellow
  border: "#EEEEEE",
  disabled: "#CCCCCC",
  icon: "#8E8E93",
  hover: "#F0F0F5", // Background color for hover states
  active: "#E0E0E5", // Background color for active/pressed states
  chip: {
    background: "#F2F2F7",
    selected: "#DEECFF",
    text: "#333333",
    selectedText: "#007AFF",
  },
  card: {
    background: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.1)",
  },
  toolbar: {
    background: "#FAFAFA",
    border: "#EEEEEE",
    icon: "#666666",
    activeIcon: "#007AFF",
  },
  statusBar: "dark-content",
};

const darkTheme = {
  background: "#121212",
  surface: "#1E1E1E",
  text: "#FFFFFF",
  secondaryText: "#CCCCCC",
  tertiaryText: "#999999",
  primary: "#0A84FF", // iOS blue dark
  accent: "#FF9F0A", // iOS orange dark
  success: "#30D158", // iOS green dark
  error: "#FF453A", // iOS red dark
  warning: "#FFD60A", // iOS yellow dark
  border: "#333333",
  disabled: "#666666",
  icon: "#8E8E93",
  hover: "#2A2A2A", // Background color for hover states
  active: "#3A3A3A", // Background color for active/pressed states
  chip: {
    background: "#333333",
    selected: "#0A4E85",
    text: "#FFFFFF",
    selectedText: "#FFFFFF",
  },
  card: {
    background: "#1E1E1E",
    shadow: "rgba(0, 0, 0, 0.3)",
  },
  toolbar: {
    background: "#1A1A1A",
    border: "#333333",
    icon: "#CCCCCC",
    activeIcon: "#0A84FF",
  },
  statusBar: "light-content",
};

// Create theme context
const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const systemTheme = useColorScheme();
  const [isDark, setIsDark] = useState(systemTheme === "dark");
  const theme = isDark ? darkTheme : lightTheme;

  // Monitor system theme changes
  useEffect(() => {
    setIsDark(systemTheme === "dark");
  }, [systemTheme]);

  const toggleTheme = () => {
    setIsDark(!isDark);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
