// Apply crypto polyfill for UUID generation before anything else
import { polyfillCrypto } from "./utils/cryptoPolyfill";
polyfillCrypto();

// Setup global error handler for initialization issues
import { setupGlobalErrorHandler } from "./utils/errorHandler";
setupGlobalErrorHandler();

// Import Expo Router entry point
import "expo-router/entry";
