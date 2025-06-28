/**
 * Google Authentication Service for Android using expo-auth-session
 * Uses Google OAuth 2.0 with Android client ID - Expo compatible
 */

import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// Ensure proper cleanup of browser sessions
WebBrowser.maybeCompleteAuthSession();

// Android OAuth Client ID
const ANDROID_CLIENT_ID =
  "782576035389-vh39jo2tdsoalo525hlit6ufdg2n021m.apps.googleusercontent.com";
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
 * Sign in with Google using expo-auth-session OAuth 2.0 flow for Android
 */
export const signInWithGoogleBrowser = async () => {
  try {
    console.log(
      "🌐 Starting Google Sign-In for Android with expo-auth-session..."
    );

    // Check if running on Android
    if (Platform.OS !== "android") {
      console.log("⚠️ Google Sign-In is only supported on Android");
      return {
        data: null,
        error: { message: "Google Sign-In is only supported on Android" },
      };
    }

    // Configure redirect URI
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: "sayNote",
      path: "auth/callback",
    });

    console.log("🔄 Redirect URI:", redirectUri);
    console.log("📋 Verify this redirect URL is registered in:");
    console.log(
      "   1. Google Cloud Console > APIs & Services > Credentials > OAuth client"
    );
    console.log(
      "   2. Supabase Dashboard > Authentication > URL Configuration"
    );

    // Create a random string for the code challenge (must be 43-128 characters for PKCE)
    const generateCodeVerifier = () => {
      const chars =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
      let result = "";
      for (let i = 0; i < 128; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const codeVerifier = generateCodeVerifier();
    console.log("🔑 Code verifier length:", codeVerifier.length);

    // Create code challenge using SHA256 and base64url encoding
    const digest = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      codeVerifier,
      { encoding: Crypto.CryptoEncoding.BASE64 }
    );

    // Convert base64 to base64url (replace + with -, / with _, remove padding =)
    const codeChallenge = digest
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    // Configure the request with all required OAuth 2.0 parameters
    const request = new AuthSession.AuthRequest({
      clientId: ANDROID_CLIENT_ID,
      scopes: ["openid", "profile", "email"],
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      codeChallenge: codeChallenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      // Additional parameters to satisfy Google's OAuth 2.0 policy
      additionalParameters: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "consent",
      },
      state: Math.random().toString(36).substring(2, 15), // Add state for security
    });

    console.log("🔧 Google OAuth request configured");
    console.log("📋 OAuth parameters:");
    console.log("   Client ID:", ANDROID_CLIENT_ID);
    console.log("   Redirect URI:", redirectUri);
    console.log("   Scopes:", ["openid", "profile", "email"]);
    console.log("   Code challenge length:", codeChallenge.length);

    // Perform the authentication
    const result = await request.promptAsync({
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    console.log("📱 Auth result:", result.type);

    if (result.type === "success") {
      console.log("✅ OAuth authorization successful");

      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: ANDROID_CLIENT_ID,
          code: result.params.code,
          redirectUri: redirectUri,
          codeVerifier: codeVerifier,
          extraParams: {},
        },
        {
          tokenEndpoint: "https://oauth2.googleapis.com/token",
        }
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
  signInWithGoogleBrowser,
};
