import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { View, ActivityIndicator, Text } from "react-native";

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasRedirected, setHasRedirected] = useState(false);

  useEffect(() => {
    // Only redirect if we're not loading, not authenticated, and haven't already redirected
    if (!loading && !isAuthenticated && !hasRedirected) {
      console.log("🔒 ProtectedRoute: Not authenticated, redirecting to login");
      setHasRedirected(true);
      router.replace("/auth/login");
    } else if (!loading && isAuthenticated && user) {
      console.log("✅ ProtectedRoute: User authenticated, rendering content");
    }
  }, [isAuthenticated, loading, hasRedirected, user, router]);

  // Show loading indicator while checking authentication
  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={{ marginTop: 10, color: "#666" }}>
          Checking authentication...
        </Text>
      </View>
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated && hasRedirected) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#4285F4" />
        <Text style={{ marginTop: 10, color: "#666" }}>Redirecting...</Text>
      </View>
    );
  }

  // Only render children if authenticated
  return isAuthenticated ? children : null;
}
