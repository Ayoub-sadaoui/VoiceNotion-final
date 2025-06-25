import React, { createContext, useState, useContext, useEffect } from "react";
import { useColorScheme } from "react-native";

// Define theme colors
const lightTheme = {
  background: "#F3F8FF",
  surface: "#FFFFFF",
  text: "#000E21",
  secondaryText: "#5A6169",
  tertiaryText: "#8E8E93",
  primary: "#1E6EE1",
  accent: "#1E6EE1",
  success: "#34C759",
  error: "#FF3B30",
  warning: "#FFCC00",
  border: "#E0E0E0",
  disabled: "#CCCCCC",
  icon: "#8E8E93",
  hover: "#E9F0FB",
  active: "#DDE8F9",
  chip: {
    background: "#E9F0FB",
    selected: "#1E6EE1",
    text: "#000E21",
    selectedText: "#FFFFFF",
  },
  card: {
    background: "#FFFFFF",
    shadow: "rgba(0, 0, 0, 0.08)",
  },
  toolbar: {
    background: "#FFFFFF",
    border: "#E0E0E0",
    icon: "#5A6169",
    activeIcon: "#1E6EE1",
  },
  statusBar: "dark-content",
};

const darkTheme = {
  background: "#00040A",
  surface: "#07111F",
  text: "#F3F8FF",
  secondaryText: "#A9B4C4",
  tertiaryText: "#7A8493",
  primary: "#1E6EE1",
  accent: "#1E6EE1",
  success: "#30D158",
  error: "#FF453A",
  warning: "#FFD60A",
  border: "#1A2B42",
  disabled: "#5A6169",
  icon: "#A9B4C4",
  hover: "#1A2B42",
  active: "#2A3B52",
  chip: {
    background: "#1A2B42",
    selected: "#1E6EE1",
    text: "#F3F8FF",
    selectedText: "#FFFFFF",
  },
  card: {
    background: "#07111F",
    shadow: "rgba(0, 0, 0, 0.2)",
  },
  toolbar: {
    background: "#07111F",
    border: "#1A2B42",
    icon: "#A9B4C4",
    activeIcon: "#1E6EE1",
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
