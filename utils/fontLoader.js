import * as Font from "expo-font";
import { Ionicons } from "@expo/vector-icons";

/**
 * Preloads the Ionicons font to prevent missing icons
 * @returns {Promise<void>}
 */
export const loadFonts = async () => {
  try {
    await Font.loadAsync({
      ...Ionicons.font,
    });
    console.log("Ionicons font loaded successfully");
    return true;
  } catch (error) {
    console.error("Error loading Ionicons font:", error);
    return false;
  }
};

/**
 * Checks if a font is loaded
 * @param {string} fontFamily - The font family to check
 * @returns {boolean} - Whether the font is loaded
 */
export const isFontLoaded = (fontFamily) => {
  // For React Native
  if (typeof document === "undefined") {
    return Font.isLoaded(fontFamily);
  }

  // For web
  try {
    const testElement = document.createElement("span");
    testElement.style.fontFamily = fontFamily;
    return window.getComputedStyle(testElement).fontFamily.includes(fontFamily);
  } catch (error) {
    console.error("Error checking font:", error);
    return false;
  }
};
