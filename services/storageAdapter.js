import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// SecureStore adapter with chunking for large values
export const ChunkedSecureStore = {
  async getItem(key) {
    try {
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (!numChunksStr) {
        return SecureStore.getItemAsync(key);
      }
      const numChunks = parseInt(numChunksStr, 10);
      let result = "";
      for (let i = 0; i < numChunks; i++) {
        const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
        if (chunk) {
          result += chunk;
        } else {
          console.warn(`Missing chunk ${i} for key ${key}`);
        }
      }
      return result;
    } catch (error) {
      console.error("Error in ChunkedSecureStore.getItem:", error);
      return null;
    }
  },

  async setItem(key, value) {
    try {
      if (value.length < 1800) {
        await SecureStore.setItemAsync(key, value);
        const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
        if (numChunksStr) {
          const numChunks = parseInt(numChunksStr, 10);
          for (let i = 0; i < numChunks; i++) {
            await SecureStore.deleteItemAsync(`${key}_${i}`);
          }
          await SecureStore.deleteItemAsync(`${key}_chunks`);
        }
        return;
      }

      const chunkSize = 1800;
      const numChunks = Math.ceil(value.length / chunkSize);
      await SecureStore.setItemAsync(`${key}_chunks`, numChunks.toString());

      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, value.length);
        const chunk = value.substring(start, end);
        await SecureStore.setItemAsync(`${key}_${i}`, chunk);
      }

      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error in ChunkedSecureStore.setItem:", error);
    }
  },

  async removeItem(key) {
    try {
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);
      if (numChunksStr) {
        const numChunks = parseInt(numChunksStr, 10);
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error in ChunkedSecureStore.removeItem:", error);
    }
  },
};

// Use ChunkedSecureStore for mobile and AsyncStorage for web
export const storageAdapter =
  Platform.OS === "web" ? AsyncStorage : ChunkedSecureStore;
