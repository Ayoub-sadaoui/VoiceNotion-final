/**
 * SIMPLIFIED GOOGLE OAUTH - USING SUPABASE DIRECT
 * This approach uses Supabase's built-in OAuth handling to avoid redirect URI issues
 */

import { supabase } from "./supabaseService";
import * as WebBrowser from "expo-web-browser";

// Ensure proper cleanup of browser sessions
WebBrowser.maybeCompleteAuthSession();

/**
 * Simple Google OAuth using Supabase's built-in OAuth with WebBrowser
 * This avoids all the redirect URI complexity by using Supabase's hosted auth
 */
export const signInWithGoogleSupabase = async () => {
  try {
    console.log("🚀 Starting Google OAuth via Supabase...");

    // For Expo development, use the development server URL instead of custom scheme
    const isDevelopment = __DEV__ || process.env.NODE_ENV === "development";
    const redirectUrl = isDevelopment
      ? "http://192.168.100.3:8081/--/auth" // Expo development server
      : "saynote://auth"; // Production custom scheme

    console.log("🔗 Using redirect URL:", redirectUrl);

    // Use Supabase's built-in OAuth which handles all redirects automatically
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    console.log("📱 Supabase OAuth result:", { data, error });

    if (error) {
      console.error("❌ Supabase OAuth error:", error);
      return {
        data: null,
        error: { message: error.message || "Google authentication failed" },
      };
    }

    // For OAuth, Supabase returns the auth URL
    if (data?.url) {
      console.log("🌐 Opening OAuth URL in browser:", data.url);

      // Use the same redirect URL for WebBrowser
      const isDevelopment = __DEV__ || process.env.NODE_ENV === "development";
      const redirectUrl = isDevelopment
        ? "http://192.168.100.3:8081/--/auth" // Expo development server
        : "saynote://auth"; // Production custom scheme

      // Open the OAuth URL in a web browser
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUrl
      );

      console.log("📱 WebBrowser result:", result);

      if (result.type === "success") {
        console.log("✅ OAuth URL redirect successful");
        console.log("🔗 Redirect URL:", result.url);

        // Wait a moment for Supabase to process the session
        console.log("⏳ Waiting for session to be established...");
        await new Promise((resolve) => setTimeout(resolve, 2000));

        // Check if session was established
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();

        if (sessionError) {
          console.error("❌ Error getting session after OAuth:", sessionError);
          return {
            data: null,
            error: { message: sessionError.message },
          };
        }

        if (sessionData?.session) {
          console.log("✅ Session found after OAuth redirect");
          return {
            data: sessionData,
            error: null,
          };
        } else {
          console.log("⚠️ No session found, will rely on auth state listener");
          return {
            data: { result },
            error: null,
          };
        }
      } else if (result.type === "cancel") {
        console.log("⚠️ User cancelled OAuth");
        return {
          data: null,
          error: { message: "Authentication was cancelled" },
        };
      } else {
        console.log("❌ OAuth failed:", result);
        return {
          data: null,
          error: { message: "Authentication failed" },
        };
      }
    } else {
      console.error("❌ No OAuth URL returned from Supabase");
      return {
        data: null,
        error: { message: "Failed to initiate authentication" },
      };
    }
  } catch (error) {
    console.error("❌ Google OAuth error:", error);
    return {
      data: null,
      error: { message: error.message || "Authentication failed" },
    };
  }
};

/**
 * Listen for auth state changes to detect when OAuth completes
 */
export const setupAuthListener = (callback) => {
  return supabase.auth.onAuthStateChange((event, session) => {
    console.log(
      "🔄 Auth state change:",
      event,
      session ? "Session exists" : "No session"
    );

    if (event === "SIGNED_IN" && session) {
      console.log("✅ User signed in successfully");
      callback({ data: { session, user: session.user }, error: null });
    } else if (event === "SIGNED_OUT") {
      console.log("📤 User signed out");
      callback({ data: null, error: null });
    }
  });
};

export default signInWithGoogleSupabase;
