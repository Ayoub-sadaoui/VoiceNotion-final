import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  SafeAreaView,
  Image,
  ScrollView,
  ActivityIndicator,
  TextInput,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "../services/supabase/storage";
import { supabase, signIn } from "../services/supabaseService";
import { checkAuthStatus, validateStorageRLSPath } from "../utils/authDebug";

export default function SimpleImageUploadTest() {
  const [image, setImage] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);
  const [authDebugInfo, setAuthDebugInfo] = useState(null);
  const [debugActive, setDebugActive] = useState(false);

  // Added login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      const response = await supabase.auth.getSession();
      console.log(
        "Auth check response:",
        JSON.stringify({
          hasData: !!response.data,
          hasSession: !!response.data?.session,
          hasUser: !!response.data?.session?.user,
          userId: response.data?.session?.user?.id || "none",
        })
      );

      if (response.data?.session?.user?.id) {
        setUserId(response.data.session.user.id);
      } else {
        console.warn("No authenticated user found in session");
        setError("Authentication required. Please login first.");
      }
    } catch (err) {
      console.error("Error getting session:", err);
      setError(`Session error: ${err.message}`);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setImage(result.assets[0]);
        console.log("Selected image:", result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error picking image:", error);
      setError(`Error picking image: ${error.message}`);
    }
  };

  const uploadImage = async () => {
    if (!image) {
      setError("Please select an image first");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log("Starting upload with image:", {
        uri: image.uri,
        type: image.mimeType,
        size: image.fileSize,
        mode: "public access",
      });

      const url = await uploadImageAsync(image);
      setUploadedUrl(url);
      console.log("Image uploaded successfully:", url);
    } catch (error) {
      console.error("Upload error:", error);
      setError(`Upload error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Add login function
  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter email and password");
      return;
    }

    setLoginLoading(true);
    setError(null);

    try {
      const { data, error: loginError } = await signIn(email, password);

      if (loginError) {
        setError(`Login failed: ${loginError.message}`);
        return;
      }

      console.log("Login successful");
      await checkSession();
    } catch (err) {
      setError(`Login error: ${err.message}`);
    } finally {
      setLoginLoading(false);
    }
  };

  const toggleDebug = () => {
    setDebugActive(!debugActive);
    if (!debugActive) {
      checkAuthStatus()
        .then((info) => {
          setAuthDebugInfo(info);
        })
        .catch((err) => {
          setError(`Debug info error: ${err.message}`);
        });
    } else {
      setAuthDebugInfo(null);
    }
  };

  const debugAuth = async () => {
    setDebugActive(true);
    setAuthDebugInfo(null);

    try {
      const debugInfo = await checkAuthStatus();
      console.log("Auth Debug Results:", debugInfo);
      setAuthDebugInfo(debugInfo);

      // If we have a userId, test the RLS path validation
      if (userId) {
        const testPath = `${userId}/test.jpg`;
        const rlsPathCheck = validateStorageRLSPath(userId, testPath);
        console.log("RLS Path Validation:", rlsPathCheck);
        setAuthDebugInfo((prev) => ({
          ...prev,
          rlsPathValidation: rlsPathCheck,
        }));
      }
    } catch (err) {
      console.error("Debug error:", err);
      setError(`Auth debug error: ${err.message}`);
    } finally {
      setDebugActive(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.title}>Simple Image Upload Test</Text>

        {userId ? (
          <Text style={styles.userInfo}>User ID: {userId}</Text>
        ) : (
          <Text style={styles.warning}>Not logged in! Please login first.</Text>
        )}

        {/* Login Section */}
        <View style={styles.loginContainer}>
          <Text style={styles.subtitle}>Login</Text>
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />
          <View style={styles.buttonContainer}>
            <Button
              title={loginLoading ? "Logging in..." : "Login"}
              onPress={handleLogin}
              disabled={loginLoading}
            />
          </View>
        </View>

        {/* Debug Authentication Button */}
        <View style={styles.buttonContainer}>
          <Button
            title={debugActive ? "Debugging..." : "Debug Auth Status"}
            onPress={debugAuth}
            disabled={debugActive}
            color="#009688"
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button title="Pick an Image" onPress={pickImage} />
        </View>

        {image && (
          <View style={styles.imageContainer}>
            <Text style={styles.subtitle}>Selected Image:</Text>
            <Image source={{ uri: image.uri }} style={styles.image} />
            <Button
              title={loading ? "Uploading..." : "Upload to Supabase"}
              onPress={uploadImage}
              disabled={loading}
            />
          </View>
        )}

        {loading && (
          <ActivityIndicator
            size="large"
            color="#0000ff"
            style={styles.loader}
          />
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {uploadedUrl && (
          <View style={styles.successContainer}>
            <Text style={styles.subtitle}>Upload Successful!</Text>
            <Text style={styles.urlText} selectable={true}>
              {uploadedUrl}
            </Text>
            <Text style={styles.subtitle}>Result:</Text>
            <Image source={{ uri: uploadedUrl }} style={styles.resultImage} />
          </View>
        )}

        {/* Debug Section */}
        <View style={styles.debugContainer}>
          <Button
            title={debugActive ? "Hide Debug Info" : "Show Debug Info"}
            onPress={toggleDebug}
          />
          <Button
            title="Run Auth Debug"
            onPress={debugAuth}
            disabled={debugActive}
          />
          {debugActive && authDebugInfo && (
            <View style={styles.debugInfoContainer}>
              <Text style={styles.debugTitle}>Auth Debug Info:</Text>
              <Text style={styles.debugText}>
                {JSON.stringify(authDebugInfo, null, 2)}
              </Text>
            </View>
          )}

          {authDebugInfo && (
            <View style={styles.debugContainer}>
              <Text style={styles.subtitle}>Auth Debug Results:</Text>
              <Text
                style={
                  authDebugInfo.isAuthenticated
                    ? styles.successText
                    : styles.errorText
                }
              >
                Authenticated:{" "}
                {authDebugInfo.isAuthenticated ? "Yes ✅" : "No ❌"}
              </Text>

              <Text style={styles.debugLabel}>Session:</Text>
              <Text>
                • Session exists:{" "}
                {authDebugInfo.session.exists ? "Yes ✅" : "No ❌"}
                {"\n"}• User ID: {authDebugInfo.session.userId || "None"}
                {"\n"}• Access Token:{" "}
                {authDebugInfo.session.tokenDetails?.hasAccessToken
                  ? "Valid ✅"
                  : "Missing ❌"}
              </Text>

              <Text style={styles.debugLabel}>User:</Text>
              <Text>
                • User exists: {authDebugInfo.user.exists ? "Yes ✅" : "No ❌"}
                {"\n"}• User ID: {authDebugInfo.user.id || "None"}
                {"\n"}• Email: {authDebugInfo.user.email || "None"}
              </Text>

              <Text style={styles.debugLabel}>RLS Test:</Text>
              <Text>
                • Query success:{" "}
                {authDebugInfo.rlsTest.success ? "Yes ✅" : "No ❌"}
                {"\n"}• Has data: {authDebugInfo.rlsTest.hasData ? "Yes" : "No"}
                {"\n"}• Error: {authDebugInfo.rlsTest.error || "None"}
              </Text>

              {authDebugInfo.rlsPathValidation && (
                <>
                  <Text style={styles.debugLabel}>
                    Storage Path Validation:
                  </Text>
                  <Text>
                    • Valid path:{" "}
                    {authDebugInfo.rlsPathValidation.valid ? "Yes ✅" : "No ❌"}
                    {"\n"}• First path segment:{" "}
                    {authDebugInfo.rlsPathValidation.firstPathSegment}
                    {"\n"}• Expected prefix:{" "}
                    {authDebugInfo.rlsPathValidation.expectedPrefix}
                  </Text>
                </>
              )}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  scrollContainer: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  userInfo: {
    fontSize: 16,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#e3f2fd",
    borderRadius: 5,
  },
  warning: {
    fontSize: 16,
    marginBottom: 20,
    padding: 10,
    backgroundColor: "#ffebee",
    color: "#d32f2f",
    borderRadius: 5,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    marginVertical: 10,
  },
  buttonContainer: {
    marginBottom: 20,
  },
  imageContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  image: {
    width: 300,
    height: 300,
    resizeMode: "contain",
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: "#e0e0e0",
  },
  loader: {
    marginVertical: 20,
  },
  errorContainer: {
    padding: 15,
    backgroundColor: "#ffebee",
    borderRadius: 5,
    marginVertical: 10,
  },
  errorText: {
    color: "#d32f2f",
  },
  successContainer: {
    marginTop: 20,
    padding: 15,
    backgroundColor: "#e8f5e9",
    borderRadius: 5,
    alignItems: "center",
  },
  urlText: {
    fontSize: 14,
    color: "#2962ff",
    marginBottom: 10,
    padding: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    maxWidth: "100%",
  },
  resultImage: {
    width: 300,
    height: 300,
    resizeMode: "contain",
    marginTop: 10,
    borderRadius: 5,
    backgroundColor: "#e0e0e0",
  },
  loginContainer: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: "#e8f0fe",
    borderRadius: 5,
  },
  input: {
    height: 40,
    borderColor: "#ccc",
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
    marginBottom: 15,
    backgroundColor: "#fff",
  },
  debugContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 16,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  debugTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
  },
  debugInfoContainer: {
    maxHeight: 200,
    overflow: "scroll",
    backgroundColor: "#fff",
    borderRadius: 5,
    padding: 10,
    borderColor: "#ccc",
    borderWidth: 1,
  },
  debugText: {
    fontSize: 12,
    color: "#333",
  },
  debugLabel: {
    fontWeight: "bold",
    marginTop: 10,
    marginBottom: 5,
    fontSize: 16,
  },
  successText: {
    color: "green",
    fontWeight: "bold",
    fontSize: 16,
  },
  errorText: {
    color: "red",
    fontWeight: "bold",
  },
});
