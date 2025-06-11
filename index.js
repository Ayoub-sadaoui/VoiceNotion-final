// Apply crypto polyfill for UUID generation before anything else
import { polyfillCrypto } from "./utils/cryptoPolyfill";
polyfillCrypto();

// Import Expo Router entry point
import "expo-router/entry";
