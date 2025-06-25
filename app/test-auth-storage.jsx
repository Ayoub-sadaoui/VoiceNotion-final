import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  Button,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { supabase } from "../services/supabaseService";
import { uploadImageAsync } from "../services/supabase/storage";
import { checkStorageSettings } from "../services/supabase/diagnostics";

const TestAuthStoragePage = () => {
  const [session, setSession] = useState(null);
  const [buckets, setBuckets] = useState([]);
  const [selectedImage, setSelectedImage] = useState(null);
  const [uploadedUrl, setUploadedUrl] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [diagnostics, setDiagnostics] = useState(null);

  // Log function that tracks messages
  const log = (message) => {
    setLogs((prevLogs) => [
      ...prevLogs,
      `${new Date().toISOString().slice(11, 19)}: ${message}`,
    ]);
    console.log(message);
  };

  // Check auth status on load
  useEffect(() => {
    const getSession = async () => {
      setLoading(true);
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session);
        log(
          data.session
            ? `Logged in as ${data.session.user.email}`
            : "Not logged in"
        );
      } catch (err) {
        log(`Auth error: ${err.message}`);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    getSession();
    checkStorageBuckets();
  }, []);

  // Check available storage buckets
  const checkStorageBuckets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.listBuckets();
      if (error) throw error;
      setBuckets(data);
      log(`Found ${data.length} storage buckets`);
    } catch (err) {
      log(`Error fetching buckets: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create images bucket if it doesn't exist
  const createBucket = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.storage.createBucket("images", {
        public: true,
      });
      if (error) throw error;
      log("Created images bucket");
      await checkStorageBuckets();
    } catch (err) {
      log(`Bucket creation error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pick an image from the device
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.5,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        log("Image picker canceled");
        return;
      }

      const image = result.assets[0];
      setSelectedImage(image);
      log(`Selected image: ${image.uri.split("/").pop()}`);
    } catch (err) {
      log(`Image picker error: ${err.message}`);
      setError(err.message);
    }
  };

  // Upload the selected image using our service function
  const uploadImage = async () => {
    if (!selectedImage) {
      log("No image selected");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      log("Starting upload...");
      const publicUrl = await uploadImageAsync(selectedImage);
      setUploadedUrl(publicUrl);
      log(`Upload successful! URL: ${publicUrl}`);
    } catch (err) {
      log(`Upload error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign in anonymously for testing
  const signInAnonymously = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) throw error;
      setSession(data.session);
      log(`Signed in anonymously with ID: ${data.user.id}`);
    } catch (err) {
      log(`Anonymous sign-in error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    setLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      log("Signed out");
    } catch (err) {
      log(`Sign-out error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Run storage diagnostics
  const runStorageDiagnostics = async () => {
    setLoading(true);
    setError(null);
    log("Running storage diagnostics...");
    try {
      const results = await checkStorageSettings("images");
      setDiagnostics(results);
      log(JSON.stringify(results, null, 2));
      if (results.success) {
        log("Diagnostics completed successfully");
      } else {
        throw new Error("Diagnostics failed");
      }
    } catch (err) {
      log(`Diagnostics error: ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Supabase Storage Test</Text>

      {/* Auth Status */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Authentication Status</Text>
        {session ? (
          <View>
            <Text style={styles.infoText}>
              Logged in as: {session.user.email || "Anonymous"}
            </Text>
            <Text style={styles.infoText}>User ID: {session.user.id}</Text>
            <Button title="Sign Out" onPress={signOut} />
          </View>
        ) : (
          <View>
            <Text style={styles.infoText}>Not logged in</Text>
            <Button title="Sign In Anonymously" onPress={signInAnonymously} />
          </View>
        )}
      </View>

      {/* Storage Buckets */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Storage Buckets</Text>
        {buckets.length > 0 ? (
          buckets.map((bucket) => (
            <Text key={bucket.id} style={styles.infoText}>
              {bucket.name} {bucket.public ? "(public)" : "(private)"}
            </Text>
          ))
        ) : (
          <Text style={styles.infoText}>No buckets found</Text>
        )}
        <View style={styles.buttonRow}>
          <Button title="Refresh Buckets" onPress={checkStorageBuckets} />
          <View style={styles.buttonSpacer} />
          <Button title="Create 'images' Bucket" onPress={createBucket} />
          <View style={styles.buttonSpacer} />
          <Button title="Run Diagnostics" onPress={runStorageDiagnostics} />
        </View>
      </View>

      {/* Storage Diagnostics Results */}
      {diagnostics && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Storage Diagnostics</Text>
          <View style={styles.diagnosticsContainer}>
            <Text
              style={[
                styles.infoText,
                diagnostics.success ? styles.successText : styles.errorText,
              ]}
            >
              Status: {diagnostics.success ? "SUCCESS" : "FAILED"}
            </Text>
            <Text style={styles.infoText}>
              Authenticated: {diagnostics.authenticated ? "YES" : "NO"}
            </Text>
            <Text style={styles.infoText}>
              User ID: {diagnostics.userId || "N/A"}
            </Text>
            <Text style={styles.infoText}>
              'images' Bucket: {diagnostics.bucketExists ? "EXISTS" : "MISSING"}
            </Text>
            <Text style={styles.infoText}>
              Bucket is Public: {diagnostics.bucketIsPublic ? "YES" : "NO"}
            </Text>
            <Text style={styles.infoText}>
              Available Buckets: {diagnostics.buckets.join(", ") || "None"}
            </Text>
            {diagnostics.error && (
              <Text style={[styles.infoText, styles.errorText]}>
                Error: {diagnostics.error}
              </Text>
            )}
          </View>
        </View>
      )}

      {/* Image Upload */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Image Upload Test</Text>

        <View style={styles.buttonRow}>
          <Button title="Pick Image" onPress={pickImage} />
          <View style={styles.buttonSpacer} />
          <Button
            title="Upload Image"
            onPress={uploadImage}
            disabled={!selectedImage || loading}
          />
        </View>

        {selectedImage && (
          <View style={styles.imagePreview}>
            <Text style={styles.infoText}>Selected Image:</Text>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}

        {uploadedUrl && (
          <View style={styles.imagePreview}>
            <Text style={styles.infoText}>Uploaded Image:</Text>
            <Text style={styles.url}>{uploadedUrl}</Text>
            <Image
              source={{ uri: uploadedUrl }}
              style={styles.image}
              resizeMode="contain"
            />
          </View>
        )}
      </View>

      {/* Error Display */}
      {error && (
        <View style={styles.errorSection}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Log Display */}
      <View style={styles.logSection}>
        <Text style={styles.sectionTitle}>Logs</Text>
        {logs.map((log, index) => (
          <Text key={index} style={styles.logText}>
            {log}
          </Text>
        ))}
      </View>

      {loading && <Text style={styles.loadingText}>Loading...</Text>}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  section: {
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    marginBottom: 8,
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 10,
  },
  buttonSpacer: {
    width: 10,
  },
  imagePreview: {
    marginTop: 15,
    alignItems: "center",
  },
  image: {
    width: "100%",
    height: 200,
    borderRadius: 5,
    marginTop: 5,
  },
  url: {
    fontSize: 12,
    color: "blue",
    marginBottom: 10,
    textAlign: "center",
  },
  diagnosticsContainer: {
    backgroundColor: "#f5f5f5",
    padding: 10,
    borderRadius: 5,
  },
  successText: {
    color: "#2e7d32",
    fontWeight: "bold",
  },
  errorText: {
    color: "#d32f2f",
    fontWeight: "bold",
  },
  errorSection: {
    backgroundColor: "#ffebee",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorText: {
    fontSize: 14,
    color: "#d32f2f",
  },
  logSection: {
    backgroundColor: "#e8eaf6",
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  logText: {
    fontSize: 12,
    fontFamily: "monospace",
    color: "#333",
    marginBottom: 2,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    color: "#666",
    marginTop: 10,
  },
});

export default TestAuthStoragePage;
