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
import * as Haptics from "expo-haptics";
import geminiService from "../../services/geminiService";
import { showToast } from "../ToastManager";

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
  const [isAIMode, setIsAIMode] = useState(false);
  const [isLongPressDetected, setIsLongPressDetected] = useState(false);
  const longPressTimeout = useRef(null);
  const pressStartTime = useRef(null);

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

  // Clean up on unmount
  useEffect(() => {
    // Show a welcome toast
    showToast({
      type: "info",
      message: "Tap mic to start recording",
      duration: 5000,
    });

    return () => {
      if (longPressTimeout.current) {
        clearTimeout(longPressTimeout.current);
      }
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    };
  }, []);

  // Request permissions for audio recording
  const requestPermissions = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync();

      if (!granted) {
        showToast({
          type: "error",
          message: "Mic access needed",
          duration: 3000,
        });
        return false;
      }

      return true;
    } catch (error) {
      console.error("Error requesting permissions:", error);
      showToast({
        type: "error",
        message: "Mic permission failed",
        duration: 3000,
      });
      return false;
    }
  };

  // Handle press start for long press detection
  const handlePressIn = () => {
    pressStartTime.current = Date.now();
    setIsLongPressDetected(false);

    longPressTimeout.current = setTimeout(() => {
      // Long press detected (800ms)
      setIsLongPressDetected(true);
      setIsAIMode(true);
      if (Platform.OS === "ios") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
      showToast({
        type: "info",
        message: "AI Question Mode",
        duration: 1500,
      });
      startRecording();
    }, 800);
  };

  // Handle press out to cancel long press if needed
  const handlePressOut = () => {
    if (longPressTimeout.current) {
      clearTimeout(longPressTimeout.current);
      longPressTimeout.current = null;
    }

    // If this was a short press (not a long press) and we're not already recording
    if (
      !isLongPressDetected &&
      !isRecording &&
      Date.now() - pressStartTime.current < 800
    ) {
      // Start normal recording mode
      setIsAIMode(false);
      startRecording();
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

      console.log(
        `Recording started in ${isAIMode ? "AI Question" : "Command"} mode`
      );

      // Show recording toast
      showToast({
        type: "recording",
        message: isAIMode ? "Recording question..." : "Recording...",
        duration: 0, // No auto-hide
      });
    } catch (error) {
      console.error("Failed to start recording", error);
      showToast({
        type: "error",
        message: "Recording failed",
        duration: 2000,
      });
      setIsAIMode(false);
      setIsLongPressDetected(false);
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

      // Reset recording state before processing to avoid memory leaks
      const recordingToProcess = uri;
      setRecording(null);

      // Process the recording
      await processRecording(recordingToProcess);
    } catch (error) {
      console.error("Failed to stop recording", error);
      setIsProcessing(false);
      showToast({
        type: "error",
        message: "Processing failed",
        duration: 2000,
      });

      // Ensure recording is reset even on error
      setRecording(null);
      setIsAIMode(false);
      setIsLongPressDetected(false);
    }
  };

  // Process the recorded audio
  const processRecording = async (uri) => {
    try {
      setIsProcessing(true);

      // Update toast to processing state
      showToast({
        type: "processing",
        message: isAIMode ? "Transcribing..." : "Processing...",
        duration: 0, // No auto-hide
        showProgress: true,
      });

      // Transcribe the audio using Gemini API
      console.log("Sending audio for transcription:", uri);
      const result = await geminiService.transcribeAudioWithGemini(uri);

      if (!result || !result.success) {
        console.error(
          "Transcription failed:",
          result?.error || "Unknown error"
        );
        throw new Error(result?.error || "Transcription failed");
      }

      setTranscription(result.transcription);
      console.log("Transcription successful:", result.transcription);

      // If transcription is empty or only whitespace, show a toast and exit
      if (!result.transcription || !result.transcription.trim()) {
        showToast({
          type: "info",
          message: "No speech detected. Nothing was added.",
          duration: 2000,
        });
        return;
      }

      showToast({
        type: "success",
        message: isAIMode ? "Processing question..." : "Processing command...",
        duration: 1500,
      });

      let commandResult;

      if (isAIMode) {
        // In AI mode, directly use askGeminiAI instead of processCommandWithGemini
        console.log("Processing direct AI question:", result.transcription);

        showToast({
          type: "processing",
          message: "Processing question...",
          duration: 0, // No auto-hide
          showProgress: true,
        });

        const aiResponse = await geminiService.askGeminiAI(
          result.transcription,
          editorContent
        );

        if (aiResponse.success && aiResponse.blocks) {
          console.log("Got AI answer with blocks:", aiResponse.blocks.length);
          commandResult = {
            success: true,
            action: "INSERT_AI_ANSWER",
            blocks: aiResponse.blocks,
            rawCommand: result.transcription,
            rawTranscription: result.transcription,
          };
        } else {
          console.error("Failed to get AI answer:", aiResponse.message);
          throw new Error(
            aiResponse.message || "AI couldn't answer that question"
          );
        }
      } else {
        // Normal command processing
        showToast({
          type: "processing",
          message: "Processing command...",
          duration: 0, // No auto-hide
          showProgress: true,
        });

        commandResult = await geminiService.processCommandWithGemini(
          result.transcription,
          editorContent
        );
      }

      if (!commandResult || !commandResult.success) {
        console.error(
          "Command processing failed:",
          commandResult?.error || "Unknown error"
        );

        // If we have transcription but command processing failed,
        // we can still show the transcription to the user
        if (result.transcription) {
          showToast({
            type: "info",
            message: "Adding as text",
            duration: 2000,
          });

          // Pass a simple insert content command instead
          onCommandProcessed({
            success: true,
            action: "INSERT_CONTENT",
            content: result.transcription,
            rawTranscription: result.transcription,
          });
          return;
        }

        throw new Error(commandResult?.error || "Command processing failed");
      }

      console.log("Command processing successful:", commandResult);

      // Show success toast based on action
      showToast({
        type: "success",
        message: getSuccessMessageForAction(commandResult.action),
        duration: 2000,
      });

      // Pass the command result to the parent component
      onCommandProcessed(commandResult);
    } catch (error) {
      console.error("Error processing recording:", error);
      showToast({
        type: "error",
        message: error.message
          ? error.message.substring(0, 24)
          : "Processing failed",
        duration: 2000,
      });
    } finally {
      setIsProcessing(false);
      setIsAIMode(false);
      setIsLongPressDetected(false);
    }
  };

  // Get success message based on action type
  const getSuccessMessageForAction = (action) => {
    switch (action) {
      case "INSERT_CONTENT":
        return "Text added";
      case "INSERT_AI_ANSWER":
        return "AI answer added";
      case "DELETE_BLOCK":
        return "Content deleted";
      case "CREATE_PAGE":
        return "Page created";
      case "APPLY_FORMATTING":
        return "Formatting applied";
      case "MODIFY_BLOCK":
        return "Content modified";
      case "UNDO":
        return "Undo successful";
      case "REDO":
        return "Redo successful";
      default:
        return "Command executed";
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
      return { bottom: 100 };
    }
    return { bottom: keyboardHeight + 100 };
  };

  return (
    <View style={[styles.container, calculatePosition(), style]}>
      {isRecording || isProcessing ? (
        <View
          style={[
            styles.recordingContainer,
            {
              backgroundColor: theme.cardBackground,
              borderColor: isAIMode ? theme.primary : "transparent",
              borderWidth: isAIMode ? 2 : 0,
            },
          ]}
        >
          {isRecording ? (
            <>
              <Animated.View
                style={[
                  styles.recordingPulse,
                  {
                    backgroundColor: isAIMode
                      ? theme.primary
                      : theme.error || "red",
                    transform: [{ scale: pulseAnim }],
                  },
                ]}
              />
              <Text style={[styles.recordingText, { color: theme.text }]}>
                {isAIMode ? "AI: " : ""}
                {formatDuration(recordingDuration)}
              </Text>
              <TouchableOpacity
                style={[
                  styles.stopButton,
                  {
                    backgroundColor: isAIMode
                      ? theme.primary
                      : theme.error || "red",
                  },
                ]}
                onPress={stopRecording}
              >
                <Ionicons name="stop" size={24} color="white" />
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator
                size="small"
                color={isAIMode ? theme.primary : theme.accent}
              />
              <Text style={[styles.processingText, { color: theme.text }]}>
                {isAIMode ? "Processing AI Question..." : "Processing..."}
              </Text>
            </>
          )}
        </View>
      ) : (
        <View>
          {/* Optional AI mode indicator */}
          {isAIMode && (
            <View
              style={[
                styles.aiModeIndicator,
                { backgroundColor: theme.primary },
              ]}
            >
              <Text style={styles.aiModeText}>AI Mode</Text>
            </View>
          )}
          <TouchableOpacity
            style={[styles.micButton, { backgroundColor: theme.primary }]}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <Ionicons
              name={isAIMode ? "help-circle" : "mic"}
              size={24}
              color="white"
            />
          </TouchableOpacity>
        </View>
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
  aiModeIndicator: {
    position: "absolute",
    bottom: 70,
    right: 0,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    zIndex: 1001,
  },
  aiModeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default VoiceRecorder;
