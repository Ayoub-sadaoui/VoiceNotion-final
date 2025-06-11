import { supabase } from "../services/supabaseService";

/**
 * Utility function to test Supabase configuration
 * Run this function to verify that your Supabase setup is working correctly
 */
export const testSupabaseConfig = async () => {
  console.log("Testing Supabase configuration...");

  try {
    // Test 1: Check if Supabase client is initialized
    if (!supabase) {
      console.error("❌ Supabase client is not initialized");
      return false;
    }
    console.log("✅ Supabase client is initialized");

    // Test 2: Check if auth is configured
    if (!supabase.auth) {
      console.error("❌ Supabase auth is not configured");
      return false;
    }
    console.log("✅ Supabase auth is configured");

    // Test 3: Check if we can connect to Supabase
    const { data, error } = await supabase
      .from("notes")
      .select("count")
      .limit(1);

    if (error && error.code === "PGRST116") {
      // This error means the table exists but RLS is preventing access (which is expected without auth)
      console.log(
        "✅ Connected to Supabase (table exists but access is restricted by RLS)"
      );
    } else if (error) {
      console.error("❌ Failed to connect to Supabase:", error);
      return false;
    } else {
      console.log("✅ Successfully connected to Supabase");
    }

    // Test 4: Check auth providers
    const { data: authSettings, error: authError } = await supabase.rpc(
      "get_auth_settings"
    );

    if (authError) {
      console.log("⚠️ Could not check auth providers:", authError);
    } else {
      console.log("Auth providers:", authSettings);

      if (
        authSettings &&
        authSettings.external_providers &&
        authSettings.external_providers.includes("google")
      ) {
        console.log("✅ Google auth provider is enabled");
      } else {
        console.log("❌ Google auth provider is not enabled");
      }
    }

    return true;
  } catch (err) {
    console.error("Error testing Supabase configuration:", err);
    return false;
  }
};

// Export a function to test Google OAuth specifically
export const testGoogleOAuthConfig = () => {
  console.log("Testing Google OAuth configuration...");

  // Check if environment variables are set
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  console.log("Supabase URL:", supabaseUrl ? "✅ Set" : "❌ Not set");
  console.log("Supabase Anon Key:", supabaseAnonKey ? "✅ Set" : "❌ Not set");

  // Print redirect URL that will be used
  const redirectUrl = "voicenotion://auth/callback";
  console.log("Redirect URL that will be used:", redirectUrl);

  console.log("\nVerify that this redirect URL is registered in:");
  console.log(
    "1. Google Cloud Console > APIs & Services > Credentials > OAuth client"
  );
  console.log("2. Supabase Dashboard > Authentication > URL Configuration");

  return {
    supabaseConfigured: supabaseUrl && supabaseAnonKey,
    redirectUrl,
  };
};
