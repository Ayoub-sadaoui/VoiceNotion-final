import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from "react-native";
import { signIn, signInWithGoogle } from "../../services/supabaseService";
import { Link, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { FontAwesome } from "@expo/vector-icons";
import {
  testSupabaseConfig,
  testGoogleOAuthConfig,
} from "../../utils/testSupabaseConfig";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { data, error: signInError } = await signIn(email, password);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      // Navigate to home screen on successful login
      router.replace("/(tabs)/home");
    } catch (err) {
      setError("An unexpected error occurred");
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      setError(null);

      console.log("Initiating Google login...");
      // First, test the configuration
      const config = testGoogleOAuthConfig();
      if (!config.supabaseConfigured) {
        setError(
          "Supabase is not properly configured. Check your environment variables."
        );
        return;
      }

      // This will open a browser window/tab for authentication
      const { data, error: googleError } = await signInWithGoogle();

      console.log("Google login response after browser flow:", {
        data,
        googleError,
      });

      if (googleError) {
        console.error("Google login error details:", googleError);
        setError(googleError.message || "Error with Google login");
        return;
      }

      // Check if we have a session after the browser flow
      if (data?.session) {
        console.log("Session obtained after Google login, redirecting to home");
        router.replace("/(tabs)/home");
      } else {
        console.log("No session after Google login");
        // The user might have cancelled the flow or something went wrong
        setError("Google login was not completed. Please try again.");
      }
    } catch (err) {
      console.error("Google login exception:", err);
      setError(
        "An error occurred with Google login: " +
          (err.message || "Unknown error")
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleTestConfig = async () => {
    try {
      const result = await testSupabaseConfig();
      if (result) {
        Alert.alert(
          "Configuration Test",
          "Supabase configuration appears to be working correctly. Check console for details."
        );
      } else {
        Alert.alert(
          "Configuration Test",
          "Supabase configuration has issues. Check console for details."
        );
      }
    } catch (err) {
      Alert.alert("Test Error", "Error testing configuration: " + err.message);
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
          <FontAwesome
            name="envelope"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.inputContainer}>
          <FontAwesome
            name="lock"
            size={20}
            color="#666"
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
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
              <FontAwesome
                name="google"
                size={20}
                color="#4285F4"
                style={styles.googleIcon}
              />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </TouchableOpacity>

        {__DEV__ && (
          <TouchableOpacity
            style={styles.testButton}
            onPress={handleTestConfig}
          >
            <Text style={styles.testButtonText}>Test Configuration</Text>
          </TouchableOpacity>
        )}
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
  testButton: {
    marginTop: 20,
    padding: 10,
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  testButtonText: {
    color: "#666",
    fontSize: 14,
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
