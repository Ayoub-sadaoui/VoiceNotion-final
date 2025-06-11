import { useEffect } from "react";
import { Text, View, StyleSheet, Alert } from "react-native";
import { useRouter, useSegments } from "expo-router";
import { supabase } from "../../services/supabaseService";
import * as Linking from "expo-linking";

export default function AuthCallback() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    // Handle the OAuth callback
    const handleOAuthCallback = async () => {
      console.log("Auth callback triggered");

      try {
        // Extract any URL parameters
        const url = await Linking.getInitialURL();
        console.log("Initial URL in callback:", url);

        // Get the session
        console.log("Fetching session from Supabase");
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          console.error("Error getting session:", error);
          Alert.alert(
            "Authentication Error",
            "Failed to get session: " + error.message
          );
          router.replace("/auth/login");
          return;
        }

        console.log("Session data in callback:", data);

        if (data?.session) {
          console.log("Valid session found in callback, redirecting to home");
          // Successfully authenticated, redirect to home
          router.replace("/(tabs)/home");
        } else {
          console.log("No session found in callback, redirecting to login");
          // No session found, redirect to login
          router.replace("/auth/login");
        }
      } catch (error) {
        console.error("Error handling OAuth callback:", error);
        Alert.alert(
          "Authentication Error",
          "An unexpected error occurred: " + error.message
        );
        router.replace("/auth/login");
      }
    };

    handleOAuthCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <Text style={styles.text}>Completing login...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  text: {
    fontSize: 18,
    color: "#4285F4",
  },
});
