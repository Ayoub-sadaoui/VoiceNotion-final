/**
 * Alternative Google Authentication using Web Client ID
 * Sometimes Web clients work better with expo-auth-session than Android clients
 */

import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// Ensure proper cleanup of browser sessions
WebBrowser.maybeCompleteAuthSession();

// Alternative: Use Web Client ID instead of Android Client ID
// You can create this in Google Cloud Console > Credentials > Create Credentials > OAuth client ID > Web application
const WEB_CLIENT_ID = "YOUR_WEB_CLIENT_ID_HERE.apps.googleusercontent.com"; // Replace with your web client ID

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://eozfitnpenjpmstpfxsv.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Send ID token to Supabase to complete authentication
 */
const exchangeIdTokenWithSupabase = async (idToken) => {
  try {
    console.log("🔄 Exchanging ID token with Supabase...");

    const response = await fetch(
      `${SUPABASE_URL}/auth/v1/token?grant_type=id_token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          provider: "google",
          token: idToken,
        }),
      }
    );

    const data = await response.json();

    if (response.ok) {
      console.log("✅ Successfully exchanged ID token for Supabase session");
      return { data, error: null };
    } else {
      console.error("❌ Supabase token exchange failed:", data);
      return { data: null, error: data };
    }
  } catch (error) {
    console.error("💥 Error exchanging ID token:", error);
    return { data: null, error: { message: error.message } };
  }
};

/**
 * Alternative Google Sign-In using Web Client ID
 */
export const signInWithGoogleWebClient = async () => {
  try {
    console.log("🌐 Starting Google Sign-In with Web Client...");

    // Configure redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "sayNote",
      path: "auth/callback",
    });

    console.log("🔄 Redirect URI:", redirectUri);

    // Simpler approach: Use AuthSession.useAuthRequest hook pattern
    const discovery = {
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
    };

    // Create the request
    const request = new AuthSession.AuthRequest({
      clientId: WEB_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      state: Math.random().toString(36).substring(2, 15),
    });

    console.log("🔧 Web client OAuth request configured");
    console.log("📋 Using Web Client ID:", WEB_CLIENT_ID);

    // Perform the authentication
    const result = await request.promptAsync(discovery);

    console.log("📱 Auth result:", result.type);

    if (result.type === "success") {
      console.log("✅ OAuth authorization successful");

      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: WEB_CLIENT_ID,
          code: result.params.code,
          redirectUri: redirectUri,
          extraParams: {},
        },
        discovery
      );

      console.log("🎫 Token exchange successful");

      if (tokenResult.idToken) {
        console.log("🔑 ID token received from Google");

        // Exchange ID token with Supabase
        const { data, error } = await exchangeIdTokenWithSupabase(
          tokenResult.idToken
        );

        if (error) {
          console.error("❌ Failed to exchange ID token with Supabase:", error);
          return {
            data: null,
            error: {
              message: error.message || "Failed to authenticate with Supabase",
            },
          };
        }

        if (data?.access_token && data?.refresh_token) {
          console.log("🎉 Authentication successful! Session created");
          return {
            data: {
              session: {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user,
                expires_at: data.expires_at,
                expires_in: data.expires_in,
                token_type: data.token_type,
              },
              user: data.user,
            },
            error: null,
          };
        } else {
          console.log("⚠️ No session data received from Supabase");
          return {
            data: null,
            error: { message: "No session created after authentication" },
          };
        }
      } else {
        console.error("❌ No ID token received from Google");
        return {
          data: null,
          error: { message: "No ID token received from Google" },
        };
      }
    } else if (result.type === "cancel") {
      console.log("❌ User cancelled authentication");
      return {
        data: null,
        error: { message: "Sign-in was cancelled by user" },
      };
    } else {
      console.log("❌ Authentication failed:", result);
      return {
        data: null,
        error: { message: `Authentication failed: ${result.type}` },
      };
    }
  } catch (error) {
    console.error("💥 Google authentication exception:", error);

    let errorMessage = "Google authentication failed";
    if (error.message) {
      errorMessage = error.message;
    }

    return {
      data: null,
      error: { message: errorMessage },
    };
  }
};

export default {
  signInWithGoogleWebClient,
};
