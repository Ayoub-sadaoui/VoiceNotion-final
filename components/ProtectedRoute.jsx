import React, { useEffect } from "react";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator } from "react-native";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      // Store the current path for redirection after login
      if (pathname && !pathname.startsWith("/auth/")) {
        // Save the path to return to after login
        // Can use AsyncStorage here if needed
      }

      // Redirect to login page
      router.replace("/auth/login");
    }
  }, [isAuthenticated, loading, pathname, router]);

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? children : null;
}
