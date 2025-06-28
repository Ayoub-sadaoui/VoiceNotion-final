import { useEffect } from "react";
import { Text, View, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { supabase } from "../../services/supabaseService";
import * as Linking from "expo-linking";

export default function AuthHandler() {
  const router = useRouter();
  const params = useLocalSearchParams();

  useEffect(() => {
    const handleDeepLinkAuth = async () => {
      console.log("🔗 Deep link auth handler triggered");
      console.log("📋 URL params:", params);

      try {
        // Wait a moment for any pending auth operations
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check if we have auth code or session
        if (params.code) {
          console.log("🔑 Auth code found in URL:", params.code);

          // Exchange code for session using Supabase
          const { data, error } = await supabase.auth.exchangeCodeForSession(
            params.code
          );

          if (error) {
            console.error("❌ Error exchanging code for session:", error);
            Alert.alert(
              "Authentication Error",
              "Failed to complete authentication: " + error.message
            );
            router.replace("/auth/login");
            return;
          }

          if (data?.session) {
            console.log("✅ Successfully authenticated via deep link");
            router.replace("/(tabs)/home");
            return;
          }
        }

        // Check for session multiple times as it might take a moment
        let session = null;
        let attempts = 0;
        const maxAttempts = 5;

        while (!session && attempts < maxAttempts) {
          console.log(
            `🔄 Checking session attempt ${attempts + 1}/${maxAttempts}`
          );

          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            console.error("❌ Error getting session:", sessionError);
            break;
          }

          if (sessionData?.session) {
            session = sessionData.session;
            console.log("✅ Session found:", session.user?.email);
            break;
          } else {
            console.log("⏳ No session yet, waiting...");
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }

          attempts++;
        }

        if (session) {
          console.log("🏠 Redirecting to home");
          router.replace("/(tabs)/home");
        } else {
          console.log("❌ No session after max attempts, redirecting to login");
          router.replace("/auth/login");
        }
      } catch (error) {
        console.error("Error in deep link auth handler:", error);
        Alert.alert(
          "Authentication Error",
          "An unexpected error occurred: " + error.message
        );
        router.replace("/auth/login");
      }
    };

    // Add a small delay to ensure routing is ready
    const timeout = setTimeout(handleDeepLinkAuth, 100);
    return () => clearTimeout(timeout);
  }, [params, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={styles.text}>Completing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: "#333",
  },
});
