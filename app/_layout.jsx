import { Stack } from "expo-router";
import { useCallback, useEffect } from "react";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { View, StatusBar } from "react-native";
import { StatusBar as ExpoStatusBar } from "expo-status-bar";
import { ThemeProvider, useTheme } from "../utils/themeContext";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { Animated } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import ToastManager from "../components/ToastManager";
import { AuthProvider } from "../contexts/AuthContext";
import { ModalProvider, useModal } from "../contexts/ModalContext";

// Prevent the splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Custom animation for screen transitions
const customTransition = {
  animation: "spring",
  config: {
    stiffness: 1000,
    damping: 500,
    mass: 3,
    overshootClamping: true,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
};

// Separate component that uses the theme context
function StackNavigator() {
  const { theme } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <ExpoStatusBar style={theme.statusBar} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right",
          animationDuration: 200,
          gestureEnabled: true,
          gestureDirection: "horizontal",
          contentStyle: { backgroundColor: theme.background },
          cardStyleInterpolator: ({ current, layouts }) => {
            return {
              cardStyle: {
                transform: [
                  {
                    translateX: current.progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [layouts.screen.width, 0],
                    }),
                  },
                ],
              },
            };
          },
        }}
      />
    </View>
  );
}

// Component to initialize the modal service
function ModalServiceInitializer() {
  const { showModal, hideModal } = useModal();

  // Initialize the global modal service
  useEffect(() => {
    if (global) {
      global.showModal = showModal;
      global.hideModal = hideModal;
    }
  }, [showModal, hideModal]);

  return null;
}

function RootLayoutNav() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ModalProvider>
          <ModalServiceInitializer />
          <StackNavigator />
          <ToastManager />
        </ModalProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    // Add any custom fonts here
  });

  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      // Hide splash screen
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <View style={{ flex: 1 }} onLayout={onLayoutRootView}>
          <RootLayoutNav />
        </View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
