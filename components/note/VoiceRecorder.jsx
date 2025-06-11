import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
} from "react-native";
import { Audio } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import Toast from "react-native-toast-message";
import * as Haptics from "expo-haptics";
import geminiService from "../../services/geminiService";

/**
 * VoiceRecorder component - Handles voice recording and command processing
 */
const VoiceRecorder = ({
  onCommandProcessed,
  editorContent,
  theme,
  isKeyboardVisible,
  keyboardHeight,
  style = {},
}) => {
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [recording, setRecording] = useState(null);
  const [transcription, setTranscription] = useState("");

  // Animation
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingInterval = useRef(null);

  // Start pulse animation
  useEffect(() => {
    if (isRecording) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.setValue(1);
    }

    return () => {
      pulseAnim.setValue(1);
    };
  }, [isRecording, pulseAnim]);

  // Request permissions for audio recording
  const requestPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();

      if (!granted) {
        Toast.show({
          type: "error",
          text1: "Permission Denied",
          text2: "Microphone access is required for voice commands",
          visibilityTime: 3000,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to request microphone permissions",
        visibilityTime: 3000,
      });
      return false;
    }
  };

  // Start recording
  const startRecording = async () => {
    try {
      const hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
      });

      // Prepare and start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Provide haptic feedback
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Start duration timer
      recordingInterval.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 1);
      }, 1000);

      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording", error);
      Toast.show({
        type: "error",
        text1: "Recording Error",
        text2: "Failed to start recording",
        visibilityTime: 2000,
      });
    }
  };

  // Stop recording and process audio
  const stopRecording = async () => {
    if (!recording) return;

    try {
      // Stop recording
      await recording.stopAndUnloadAsync();
      setIsRecording(false);

      // Clear interval
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
        recordingInterval.current = null;
      }

      // Provide haptic feedback
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      // Get recording URI
      const uri = recording.getURI();
      if (!uri) {
        throw new Error("No recording URI available");
      }

      // Process the recording
      await processRecording(uri);
    } catch (error) {
      console.error("Failed to stop recording", error);
      setIsProcessing(false);
      Toast.show({
        type: "error",
        text1: "Recording Error",
        text2: "Failed to process recording",
        visibilityTime: 2000,
      });
    } finally {
      setRecording(null);
    }
  };

  // Process the recorded audio
  const processRecording = async (uri) => {
    try {
      setIsProcessing(true);

      // Transcribe the audio using Gemini API
      const result = await geminiService.transcribeAudioWithGemini(uri);

      if (!result || !result.success) {
        throw new Error("Transcription failed");
      }

      setTranscription(result.transcription);
      console.log("Transcription:", result.transcription);

      // Process the transcription to extract commands
      const commandResult = await geminiService.processCommandWithGemini(
        result.transcription,
        editorContent
      );

      if (!commandResult || !commandResult.success) {
        throw new Error("Command processing failed");
      }

      console.log("Command result:", commandResult);

      // Pass the command result to the parent component
      onCommandProcessed(commandResult);
    } catch (error) {
      console.error("Error processing recording:", error);
      Toast.show({
        type: "error",
        text1: "Processing Error",
        text2: error.message || "Failed to process voice command",
        visibilityTime: 2000,
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Format recording duration as MM:SS
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  // Calculate position based on keyboard visibility
  const calculatePosition = () => {
    if (!isKeyboardVisible) {
      return { bottom: 20 };
    }
    return { bottom: keyboardHeight + 20 };
  };

  return (
    <View style={[styles.container, calculatePosition(), style]}>
      {isRecording || isProcessing ? (
        <View
          style={[
            styles.recordingContainer,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          {isRecording ? (
            <>
              <Animated.View
                style={[
                  styles.recordingPulse,
                  {
                    backgroundColor: theme.error || "red",
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[styles.recordingText, { color: theme.text }]}>
                {formatDuration(recordingDuration)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.stopButton,
                  { backgroundColor: theme.error || "red" },
                ]}
                onPress={stopRecording}
              >
                <Ionicons name="stop" size={24} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.processingText, { color: theme.text }]}>
                Processing...
              </Text>
            </>
          )}
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.micButton, { backgroundColor: theme.primary }]}
          onPress={startRecording}
        >
          <Ionicons name="mic" size={24} color="white" />
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 20,
    zIndex: 1000,
  },
  micButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 30,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: "500",
    marginRight: 12,
  },
  processingText: {
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
  stopButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default VoiceRecorder;
