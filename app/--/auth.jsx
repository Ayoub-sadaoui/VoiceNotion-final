import { View, Text, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useEffect } from "react";

export default function AuthRedirectTest() {
  const router = useRouter();

  useEffect(() => {
    console.log("🧪 Auth redirect test page loaded");
    console.log("This means the development server URL is working!");

    // Redirect to login after showing this test page
    const timer = setTimeout(() => {
      router.replace("/auth/login");
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🎉 Development Server Working!</Text>
      <Text style={styles.message}>
        The Expo development server can handle redirects.
      </Text>
      <Text style={styles.info}>Redirecting to login in 3 seconds...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#4285F4",
  },
  message: {
    fontSize: 16,
    marginBottom: 10,
    textAlign: "center",
    color: "#333",
  },
  info: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
