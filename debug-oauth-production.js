/**
 * DEBUG SCRIPT FOR OAUTH REDIRECT ISSUES
 * Run this to test the OAuth flow and redirect URI handling
 */

import { supabase } from "./services/supabaseService";
import * as Linking from "expo-linking";

export const debugOAuthFlow = async () => {
  console.log("🔍 DEBUGGING OAUTH FLOW");
  console.log("========================");

  // 1. Check environment
  console.log("📱 Environment Check:");
  console.log("- __DEV__:", __DEV__);
  console.log("- NODE_ENV:", process.env.NODE_ENV);
  console.log("- Platform:", Platform.OS);

  // 2. Check app URL scheme
  console.log("\n🔗 URL Scheme Check:");
  const url = Linking.createURL("");
  console.log("- App URL scheme:", url);

  // 3. Test OAuth URL generation
  console.log("\n🌐 OAuth URL Generation:");
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: "saynote://auth",
        queryParams: {
          access_type: "offline",
          prompt: "select_account",
        },
      },
    });

    if (error) {
      console.log("❌ OAuth URL error:", error);
    } else if (data?.url) {
      console.log("✅ OAuth URL generated:", data.url);

      // Parse the URL to check redirect_uri parameter
      const oauthUrl = new URL(data.url);
      const redirectUri = oauthUrl.searchParams.get("redirect_uri");
      console.log("🎯 Extracted redirect_uri:", redirectUri);

      if (redirectUri && redirectUri.includes("///")) {
        console.log("❌ ISSUE FOUND: Triple slash in redirect URI!");
        console.log("   This might be causing the black screen issue");
      } else if (redirectUri === "saynote://auth") {
        console.log("✅ Redirect URI looks correct");
      } else {
        console.log("⚠️ Unexpected redirect URI format");
      }
    }
  } catch (error) {
    console.log("❌ Error testing OAuth:", error);
  }

  // 4. Check current session
  console.log("\n👤 Current Session:");
  try {
    const { data: sessionData, error: sessionError } =
      await supabase.auth.getSession();
    if (sessionError) {
      console.log("❌ Session error:", sessionError);
    } else if (sessionData?.session) {
      console.log("✅ Session exists:", sessionData.session.user?.email);
    } else {
      console.log("⚠️ No active session");
    }
  } catch (error) {
    console.log("❌ Error checking session:", error);
  }

  console.log("\n========================");
  console.log("🔍 DEBUG COMPLETE");
};

// Test deep link handling
export const testDeepLink = async (testUrl = "saynote://auth?code=test123") => {
  console.log("🧪 TESTING DEEP LINK");
  console.log("===================");
  console.log("Test URL:", testUrl);

  try {
    // Parse the URL like the app would
    const parsed = Linking.parse(testUrl);
    console.log("Parsed URL:", parsed);

    if (parsed.queryParams?.code) {
      console.log("✅ Found auth code:", parsed.queryParams.code);
    } else {
      console.log("⚠️ No auth code in URL");
    }
  } catch (error) {
    console.log("❌ Error parsing URL:", error);
  }

  console.log("===================");
};

export default debugOAuthFlow;
