import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform, Linking } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

// SecureStore adapter with chunking for large values
const ChunkedSecureStore = {
  async getItem(key) {
    try {
      // Check if this key has chunked data
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);

      // If no chunks info exists, this is a regular item
      if (!numChunksStr) {
        return SecureStore.getItemAsync(key);
      }

      // Otherwise, reassemble the chunks
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
      // If value is small enough, store directly
      if (value.length < 1800) {
        // Leave some margin below 2048
        await SecureStore.setItemAsync(key, value);
        // Remove any chunks if they existed before
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

      // For large values, split into chunks of 1800 bytes
      const chunkSize = 1800;
      const numChunks = Math.ceil(value.length / chunkSize);

      // Store the number of chunks
      await SecureStore.setItemAsync(`${key}_chunks`, numChunks.toString());

      // Store each chunk
      for (let i = 0; i < numChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, value.length);
        const chunk = value.substring(start, end);
        await SecureStore.setItemAsync(`${key}_${i}`, chunk);
      }

      // Remove the original key to avoid confusion
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error in ChunkedSecureStore.setItem:", error);
    }
  },

  async removeItem(key) {
    try {
      // Check if this key has chunked data
      const numChunksStr = await SecureStore.getItemAsync(`${key}_chunks`);

      if (numChunksStr) {
        // Delete all chunks
        const numChunks = parseInt(numChunksStr, 10);
        for (let i = 0; i < numChunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_chunks`);
      }

      // Delete the original key too
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error("Error in ChunkedSecureStore.removeItem:", error);
    }
  },
};

// Use ChunkedSecureStore for mobile and AsyncStorage for web
const storageAdapter =
  Platform.OS === "web" ? AsyncStorage : ChunkedSecureStore;

// Initialize Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: storageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth functions
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });
  return { data, error };
};

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  return { data, error };
};

export const signInWithGoogle = async () => {
  console.log("Starting Google sign in process");
  console.log("Supabase URL:", supabaseUrl);

  // Determine the appropriate redirect URL based on platform
  const redirectUrl =
    Platform.OS === "web"
      ? "http://localhost:8081/auth/callback"
      : "voicenotion://auth/callback";

  console.log("Using redirect URL:", redirectUrl);

  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        // Add scopes for Google (optional)
        scopes: "email profile",
      },
    });

    console.log("Google sign in response:", { data, error });

    if (error) throw error;

    // Open the URL in a browser
    if (data?.url) {
      if (Platform.OS === "web") {
        window.location.href = data.url;
      } else {
        // Use WebBrowser for a better experience on mobile
        await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        // After WebBrowser is dismissed, check the session
        const { data: sessionData } = await supabase.auth.getSession();
        return { data: sessionData, error: null };
      }
    }

    return { data, error };
  } catch (err) {
    console.error("Google sign in error:", err);
    throw err;
  }
};

export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email);
  return { data, error };
};

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
};

export const getSession = async () => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
};

// Database functions for notes
export const fetchNotes = async (userId) => {
  const { data, error } = await supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  return { data, error };
};

export const createNote = async (noteData) => {
  const { data, error } = await supabase
    .from("notes")
    .insert(noteData)
    .select()
    .single();

  return { data, error };
};

export const updateNote = async (noteId, noteData) => {
  const { data, error } = await supabase
    .from("notes")
    .update(noteData)
    .eq("id", noteId)
    .select()
    .single();

  return { data, error };
};

export const deleteNote = async (noteId) => {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);

  return { error };
};

// Subscribe to realtime changes
export const subscribeToNotes = (userId, callback) => {
  const subscription = supabase
    .channel("notes_channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notes",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        callback(payload);
      }
    )
    .subscribe();

  return subscription;
};
