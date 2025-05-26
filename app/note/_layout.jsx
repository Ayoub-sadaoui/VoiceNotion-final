import { Stack } from "expo-router";
import { useTheme } from "../../utils/themeContext";

export default function NoteLayout() {
  const { theme } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: theme.background },
      }}
    />
  );
}
