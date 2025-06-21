import { Stack } from "expo-router";
import { useTheme } from "../../utils/themeContext";
import { StatusBar, View } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { useEffect } from "react";

export default function NoteLayout() {
  const { theme } = useTheme();

  // Hide status bar when this layout is active
  useEffect(() => {
    StatusBar.setHidden(true);

    // Restore status bar when unmounting
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ExpoStatusBar hidden={true} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.background },
        }}
      />
    </View>
  );
}
