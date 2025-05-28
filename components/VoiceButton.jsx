import React, { useState, useEffect } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  View,
  Text,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Permissions from "expo-permissions";
import { Audio } from "expo-av";
import { useTheme } from "../utils/themeContext";

const VoiceButton = ({
  size = 56,
  onStart,
  onEnd,
  onError,
  style,
  containerStyle,
}) => {
  const { theme } = useTheme();
  const [hasPermission, setHasPermission] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check for permissions when component mounts
  useEffect(() => {
    checkPermissions();
  }, []);

  // Function to check for microphone permissions
  const checkPermissions = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
    } catch (error) {
      console.error("Error checking microphone permission:", error);
      setHasPermission(false);
    }
  };

  // Function to request microphone permissions
  const requestPermissions = async () => {
    try {
      setIsLoading(true);
      const { status } = await Audio.requestPermissionsAsync();
      setHasPermission(status === "granted");
      setIsLoading(false);

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Voice recognition requires microphone access. Please grant permission in your device settings.",
          [{ text: "OK" }]
        );
      }
    } catch (error) {
      console.error("Error requesting microphone permission:", error);
      setIsLoading(false);
      setHasPermission(false);

      if (onError) {
        onError("Failed to request microphone permission");
      }
    }
  };

  // Handle button press
  const handlePress = async () => {
    // If we don't have permission yet, request it
    if (!hasPermission) {
      await requestPermissions();
      return;
    }

    // Toggle recording state
    if (isRecording) {
      setIsRecording(false);
      if (onEnd) {
        onEnd();
      }
    } else {
      try {
        setIsRecording(true);
        if (onStart) {
          onStart();
        }
      } catch (error) {
        console.error("Error starting recording:", error);
        setIsRecording(false);
        if (onError) {
          onError("Failed to start recording");
        }
      }
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isRecording ? theme.error : theme.primary,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
          style,
        ]}
        onPress={handlePress}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Ionicons
            name={isRecording ? "mic" : "mic-outline"}
            size={size * 0.5}
            color="#FFF"
          />
        )}
      </TouchableOpacity>

      {isRecording && (
        <View style={styles.recordingIndicator}>
          <Text style={[styles.recordingText, { color: theme.error }]}>
            Recording...
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  recordingIndicator: {
    marginTop: 8,
    padding: 4,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default VoiceButton;
