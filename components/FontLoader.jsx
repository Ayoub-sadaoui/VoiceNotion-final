import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";

/**
 * FontLoader component that preloads necessary fonts
 * and shows a loading indicator until fonts are ready
 */
const FontLoader = ({ children }) => {
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    async function loadFonts() {
      try {
        await Font.loadAsync({
          ...Ionicons.font,
        });
        console.log("Ionicons font loaded successfully");
        setFontsLoaded(true);
      } catch (error) {
        console.error("Error loading Ionicons font:", error);
        // Continue even if font loading fails
        setFontsLoaded(true);
      }
    }

    loadFonts();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return children;
};

export default FontLoader;
