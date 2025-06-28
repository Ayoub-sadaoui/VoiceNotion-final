/**
 * Google Authentication Service - Web Client ID Approach
 * This uses a Web OAuth client ID which is compatible with expo-auth-session
 *
 * IMPORTANT: You need to create a Web OAuth client ID in Google Cloud Console
 * and use that instead of the Android client ID for expo-auth-session flows.
 */

import { Platform } from "react-native";
import * as AuthSession from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import * as Crypto from "expo-crypto";

// Ensure proper cleanup of browser sessions
WebBrowser.maybeCompleteAuthSession();

// Web OAuth Client ID
const WEB_CLIENT_ID =
  "782576035389-cc3dodktrl90m55umqvbtvs1tdgnbqo9.apps.googleusercontent.com";

const SUPABASE_URL =
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://eozfitnpenjpmstpfxsv.supabase.co";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Generate a cryptographically secure code verifier for PKCE
 */
const generateCodeVerifier = () => {
  const array = new Uint8Array(32);
  const charset =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";

  for (let i = 0; i < array.length; i++) {
    array[i] = Math.floor(Math.random() * charset.length);
  }

  return Array.from(array, (byte) => charset[byte]).join("");
};

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
      return {
        data: null,
        error: {
          message:
            data.error_description || data.error || "Token exchange failed",
        },
      };
    }
  } catch (error) {
    console.error("❌ Error during Supabase token exchange:", error);
    return {
      data: null,
      error: { message: error.message },
    };
  }
};

/**
 * Sign in with Google using Web OAuth Client ID
 */
export const signInWithGoogleWeb = async () => {
  try {
    console.log("🚀 Starting Google OAuth with Web Client ID...");
    console.log("🔧 Client ID:", WEB_CLIENT_ID);

    if (!WEB_CLIENT_ID || WEB_CLIENT_ID.includes("YOUR_WEB_CLIENT_ID")) {
      throw new Error(
        "❌ Web Client ID not configured. Please set WEB_CLIENT_ID in the code."
      );
    }

    // Use a simpler, direct approach for redirect URI
    console.log("🔍 Determining redirect URI...");

    // Use the exact URI that should work based on your app.json configuration
    const redirectUri = "https://auth.expo.io/@ayoubsddd/sayNote";
    console.log("🔗 Using redirect URI:", redirectUri);

    // Also log what other URIs would be generated for comparison
    try {
      const testUri = AuthSession.makeRedirectUri();
      console.log("🔍 AuthSession.makeRedirectUri() generates:", testUri);
    } catch (e) {
      console.log("⚠️ AuthSession.makeRedirectUri() failed:", e.message);
    }

    // Generate PKCE code verifier and challenge
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

    console.log("🔐 Code challenge generated, length:", codeChallenge.length);

    // Configure the request with Web client ID and minimal scopes
    const request = new AuthSession.AuthRequest({
      clientId: WEB_CLIENT_ID,
      scopes: ["openid"], // Minimal scope to avoid verification requirements
      redirectUri: redirectUri,
      responseType: AuthSession.ResponseType.Code,
      codeChallenge: codeChallenge,
      codeChallengeMethod: AuthSession.CodeChallengeMethod.S256,
      additionalParameters: {
        access_type: "offline",
        include_granted_scopes: "true",
        prompt: "select_account",
      },
      state: Math.random().toString(36).substring(2, 15),
    });

    console.log("🔧 Google OAuth request configured with Web Client ID");
    console.log("📋 OAuth parameters:");
    console.log("   Client ID:", WEB_CLIENT_ID);
    console.log("   Redirect URI:", redirectUri);
    console.log("   Scopes:", ["openid"]);
    console.log("   Response Type:", "code");
    console.log("   Code challenge method:", "S256");

    // Perform the authentication
    const result = await request.promptAsync({
      authorizationEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    });

    console.log("📱 Auth result type:", result.type);

    if (result.type === "success") {
      console.log("✅ OAuth authorization successful");
      console.log("🔗 Authorization code received");

      // Exchange authorization code for tokens
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: WEB_CLIENT_ID,
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
          console.error("❌ Invalid response from Supabase:", data);
          return {
            data: null,
            error: { message: "Invalid authentication response" },
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
      console.log("⏹️ User cancelled Google OAuth");
      return {
        data: null,
        error: { message: "Authentication cancelled by user" },
      };
    } else if (result.type === "dismiss") {
      console.log("🚪 OAuth flow was dismissed - likely redirect URI issue");
      return {
        data: null,
        error: {
          message:
            "OAuth flow was dismissed. This may be due to redirect URI configuration issues. Please ensure the redirect URI is properly configured in Google Cloud Console.",
        },
      };
    } else {
      console.error("❌ Google OAuth failed:", result);
      return {
        data: null,
        error: {
          message:
            result.error?.message ||
            `Google authentication failed (${result.type})`,
        },
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

export default signInWithGoogleWeb;
