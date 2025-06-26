import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import { storageAdapter } from "./storageAdapter";
import { Linking, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";

// Get Supabase URL and anon key from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "";

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
      : "sayNote://auth/callback";

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

export const updateUserProfile = async (userData) => {
  try {
    console.log(
      "Updating user profile with data:",
      JSON.stringify(userData).substring(0, 100) + "..."
    );

    const { data, error } = await supabase.auth.updateUser({
      data: userData,
    });

    if (error) {
      console.error("Error updating user profile:", error);
    } else {
      console.log("User profile updated successfully");
    }

    return { data, error };
  } catch (err) {
    console.error("Exception in updateUserProfile:", err);
    return { data: null, error: err };
  }
};

export const updateUserAvatar = async (avatarUrl) => {
  try {
    console.log("Updating user avatar...");

    // First get current user metadata
    const currentUser = await getCurrentUser();
    const currentMetadata = currentUser?.user_metadata || {};

    // Log the current metadata
    console.log(
      "Current metadata before update:",
      JSON.stringify({
        has_metadata: !!currentMetadata,
        has_full_name: !!currentMetadata.full_name,
        has_avatar: !!currentMetadata.avatar_url,
      })
    );

    // Create updated metadata with new avatar URL
    const updatedMetadata = {
      ...currentMetadata,
      avatar_url: avatarUrl,
    };

    console.log(
      "Sending avatar update with data length:",
      avatarUrl ? avatarUrl.substring(0, 50) + "..." : "No avatar"
    );

    // Direct approach to update user metadata with avatar
    const { data, error } = await supabase.auth.updateUser({
      data: updatedMetadata,
    });

    if (error) {
      console.error("Error updating avatar:", error);
    } else {
      console.log("Avatar update request sent successfully");

      // Verify the update immediately
      const updatedUser = await getCurrentUser();
      console.log(
        "Verification - User metadata after update:",
        JSON.stringify({
          has_avatar: !!updatedUser?.user_metadata?.avatar_url,
          avatar_preview: updatedUser?.user_metadata?.avatar_url
            ? updatedUser.user_metadata.avatar_url.substring(0, 30) + "..."
            : "none",
        })
      );
    }

    return { data, error };
  } catch (err) {
    console.error("Exception in updateUserAvatar:", err);
    return { data: null, error: err };
  }
};

export const updateUserAvatarDirect = async (avatarUrl) => {
  try {
    console.log("Direct avatar update attempt...");

    // Use a direct approach with minimal data
    const { data, error } = await supabase.auth.updateUser({
      data: { avatar_url: avatarUrl },
    });

    if (error) {
      console.error("Error in direct avatar update:", error);
    } else {
      console.log("Direct avatar update request sent");
    }

    return { data, error };
  } catch (err) {
    console.error("Exception in direct avatar update:", err);
    return { data: null, error: err };
  }
};
