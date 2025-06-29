import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { signIn } from "../../services/supabaseService";
import {
  signInWithGoogleSupabase,
  setupAuthListener,
} from "../../services/googleOAuthSupabase";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../../contexts/AuthContext";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      console.log("✅ User already authenticated, redirecting to home");
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, authLoading, router]);

  // Set up auth listener for OAuth completion
  useEffect(() => {
    console.log("🔧 Setting up auth listener...");
    const {
      data: { subscription },
    } = setupAuthListener((result) => {
      if (result.data?.session) {
        console.log(
          "✅ OAuth completed via auth listener, redirecting to home"
        );
        setGoogleLoading(false);
        setError(null); // Clear any errors
        router.replace("/(tabs)/home");
      } else if (result.error) {
        console.error("❌ Auth listener error:", result.error);
        setError(result.error.message);
        setGoogleLoading(false);
      }
    });

    return () => {
      console.log("🔧 Cleaning up auth listener");
      subscription?.unsubscribe();
    };
  }, [router]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      console.log("🔐 Attempting login...");
      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        console.error("❌ Login error:", signInError);
        setError(signInError.message);
        return;
      }

      console.log("✅ Login successful:", !!data?.session);

      // Wait a moment for auth state to update, then navigate
      setTimeout(() => {
        console.log("🏠 Navigating to home after login");
        router.replace("/(tabs)/home");
      }, 500);
    } catch (err) {
      console.error("❌ Login exception:", err);
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      console.log("🚀 Starting Google OAuth with Supabase direct method...");

      // Use Supabase direct OAuth - this bypasses Expo proxy issues
      const result = await signInWithGoogleSupabase();

      console.log("📱 Google OAuth result:", {
        success: !result.error,
        hasSession: !!result.data?.session,
        error: result.error?.message || null,
      });

      if (result.error) {
        console.error("❌ Google OAuth failed:", result.error);
        setError(`Google OAuth failed: ${result.error.message}`);
        setGoogleLoading(false);
        return;
      }

      // Check if we got a session directly
      if (result.data?.session) {
        console.log("✅ Session obtained directly, redirecting to home");
        setGoogleLoading(false);
        setError(null);
        router.replace("/(tabs)/home");
      } else {
        console.log("⏳ OAuth completed, waiting for auth state change...");
        // The auth listener will handle the completion and redirect
        // Set a timeout to stop loading if nothing happens
        setTimeout(() => {
          if (googleLoading) {
            console.log("⚠️ Timeout waiting for auth state change");
            setGoogleLoading(false);
            setError("Authentication timed out. Please try again.");
          }
        }, 10000); // 10 second timeout
      }
    } catch (err) {
      console.error("❌ Google OAuth exception:", err);
      setError(`Authentication error: ${err.message || "Unknown error"}`);
      setGoogleLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.container}
    >
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Welcome to</Text>
        <Text style={styles.appName}>sayNote</Text>
      </View>

      <View style={styles.form}>
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <Ionicons
            name="mail-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <Ionicons
            name="lock-closed-outline"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
            <Ionicons
              name={showPassword ? "eye-off" : "eye"}
              size={24}
              color="#666"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.forgotPassword}
          onPress={() => router.push("/auth/forgot-password")}
        >
          <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Log In</Text>
          )}
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        <TouchableOpacity
          style={styles.googleButton}
          onPress={handleGoogleLogin}
          disabled={googleLoading}
        >
          {googleLoading ? (
            <ActivityIndicator color="#4285F4" />
          ) : (
            <>
              <Ionicons
                name="logo-google"
                size={20}
                color="#4285F4"
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account? </Text>
        <Link href="/auth/signup" asChild>
          <TouchableOpacity>
            <Text style={styles.signupText}>Sign Up</Text>
          </TouchableOpacity>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 20,
  },
  header: {
    marginTop: 60,
    marginBottom: 40,
    alignItems: "center",
  },
  title: {
    fontSize: 24,
    color: "#333",
  },
  appName: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#4285F4",
    marginTop: 5,
  },
  form: {
    width: "100%",
  },
  errorContainer: {
    backgroundColor: "#ffebee",
    padding: 10,
    borderRadius: 5,
    marginBottom: 20,
  },
  errorText: {
    color: "#d32f2f",
    textAlign: "center",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    marginBottom: 20,
    paddingHorizontal: 15,
    height: 55,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 16,
    color: "#333",
  },
  forgotPassword: {
    alignSelf: "flex-end",
    marginBottom: 20,
  },
  forgotPasswordText: {
    color: "#4285F4",
    fontSize: 14,
  },
  button: {
    backgroundColor: "#4285F4",
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#ddd",
  },
  dividerText: {
    marginHorizontal: 10,
    color: "#666",
    fontSize: 14,
  },
  googleButton: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    height: 55,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    marginRight: 10,
  },
  googleButtonText: {
    color: "#333",
    fontSize: 16,
    fontWeight: "500",
  },
  disabledButton: {
    opacity: 0.5,
    backgroundColor: "#f5f5f5",
  },

  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 40,
  },
  footerText: {
    color: "#666",
    fontSize: 16,
  },
  signupText: {
    color: "#4285F4",
    fontSize: 16,
    fontWeight: "bold",
  },
});
