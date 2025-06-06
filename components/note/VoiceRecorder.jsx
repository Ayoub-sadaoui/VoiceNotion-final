import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  View,
  ActivityIndicator,
  Animated,
  Easing,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import geminiService from "../../services/geminiService";

// API Key for Google Cloud Speech-to-Text
// SECURITY NOTE: In production, this should be moved to a secure backend
// and never exposed in client-side code. Consider using environment variables
// or a backend proxy for API requests.
const GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_SPEECH_API_KEY;
console.log("Speech API Key available:", !!GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY);

const VoiceRecorder = ({
  onCommandProcessed,
  editorContent,
  theme,
  isKeyboardVisible,
  keyboardHeight,
  style = {},
}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandState, setCommandState] = useState("idle"); // idle, recording, processing, success, error

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  // Reset recording when component unmounts
  useEffect(() => {
    return () => {
      // Clean up recording on unmount
      if (recording) {
        try {
          recording.stopAndUnloadAsync();
        } catch (err) {
          console.error("Error cleaning up recording:", err);
        }
      }
    };
  }, [recording]);

  // Animation effects based on command state
  useEffect(() => {
    if (isRecording) {
      setCommandState("recording");
      // Pulse animation for recording state
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
    } else if (isProcessing) {
      setCommandState("processing");
      // Pulse animation for processing state instead of rotation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 0.9,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations when idle
      setCommandState("idle");
      pulseAnim.setValue(1);
      rotateAnim.setValue(0);
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }
  }, [isRecording, isProcessing]);

  // Success animation function
  const animateSuccess = () => {
    setCommandState("success");
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setCommandState("idle");
      }, 1000);
    });
  };

  // Error animation function
  const animateError = () => {
    setCommandState("error");
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1.2,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setTimeout(() => {
        setCommandState("idle");
      }, 1000);
    });
  };

  // Handle voice record button press
  const handleVoiceRecordPress = async () => {
    try {
      // If we're already recording, stop the recording
      if (isRecording) {
        const uri = await stopRecording();
        // Process the recording for transcription
        if (uri) {
          setIsProcessing(true);
          const rawTranscription = await transcribeAudio(uri);

          // Check if we have valid transcription text
          if (rawTranscription) {
            try {
              // Process as a voice command using the unified approach
              console.log("Processing voice input:", rawTranscription);

              // Log editor content information for debugging
              if (editorContent && Array.isArray(editorContent)) {
                console.log(
                  `VoiceRecorder received ${editorContent.length} blocks to analyze`
                );
                if (editorContent.length > 0) {
                  // Log a summary of blocks for debugging
                  const contentSummary = editorContent
                    .slice(0, 3)
                    .map((block, idx) => {
                      const blockText =
                        block.content && block.content[0]
                          ? block.content[0].text.substring(0, 20) +
                            (block.content[0].text.length > 20 ? "..." : "")
                          : "[empty]";
                      return `${idx}: ${block.type} - "${blockText}"`;
                    });
                  console.log("Editor content sample:", contentSummary);
                  if (editorContent.length > 3) {
                    console.log(
                      `...and ${editorContent.length - 3} more blocks`
                    );
                  }
                }
              } else {
                console.warn(
                  "VoiceRecorder received empty or invalid editor content"
                );
              }

              // Process with Gemini to determine intent and action
              const commandResult =
                await geminiService.processVoiceCommandWithGemini(
                  rawTranscription,
                  editorContent || []
                );
              console.log("Voice command processing result:", commandResult);

              // Send the result to parent component
              if (onCommandProcessed) {
                onCommandProcessed({
                  ...commandResult,
                  rawTranscription,
                });
              }
            } catch (commandError) {
              console.error(
                "Error processing voice command with Gemini:",
                commandError
              );
              // Notify parent of the error
              if (onCommandProcessed) {
                onCommandProcessed({
                  success: false,
                  action: "CLARIFICATION",
                  message:
                    "I had trouble understanding your input. Please try again.",
                  rawTranscription,
                });
              }
            }
          }
          setIsProcessing(false);
        }
        return;
      }

      // Otherwise check permissions and start recording
      const { status } = await Audio.requestPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone permission is needed to use voice recording features.",
          [{ text: "OK" }]
        );
        return;
      }

      // Ensure no active recordings exist before starting a new one
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          staysActiveInBackground: false,
        });

        // Check for any existing recordings in the system
        if (recording) {
          console.log("Found existing recording, stopping it first");
          await recording.stopAndUnloadAsync();
          setRecording(null);
        }

        // Permission is granted, start recording
        await startRecording();
      } catch (error) {
        console.error("Error preparing for recording:", error);
        Alert.alert(
          "Recording Error",
          "Could not start recording. Please try again in a moment."
        );

        // Reset recording state to ensure we can try again
        setIsRecording(false);
        setRecording(null);
      }
    } catch (error) {
      console.error("Error in voice recording process:", error);
      Alert.alert(
        "Error",
        "Failed to handle voice recording: " + error.message
      );
      setIsProcessing(false);
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Start recording function
  const startRecording = async () => {
    try {
      // Use AMR format which is well-supported by Google Speech-to-Text
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: ".amr",
          outputFormat: Audio.AndroidOutputFormat.AMR_NB,
          audioEncoder: Audio.AndroidAudioEncoder.AMR_NB,
          sampleRate: 8000, // AMR_NB uses 8kHz
          numberOfChannels: 1,
          bitRate: 12200, // Standard for AMR_NB
        },
        ios: {
          extension: ".m4a", // iOS doesn't support AMR natively, fallback to AAC
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: "audio/mp4",
          bitsPerSecond: 128000,
        },
      });

      // Update state
      setRecording(newRecording);
      setIsRecording(true);
      console.log("Recording started successfully");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");

      // Reset recording state
      setIsRecording(false);
      setRecording(null);
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    if (!recording) {
      return null;
    }

    try {
      // Stop the recording
      await recording.stopAndUnloadAsync();
      console.log("Recording stopped successfully");

      // Get the recorded URI
      const uri = recording.getURI();

      // Reset recording state
      setRecording(null);
      setIsRecording(false);

      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
      setIsRecording(false);
      setRecording(null);
      animateError(); // Trigger error animation
      return null;
    }
  };

  // Transcribe audio using Google Cloud Speech-to-Text API
  const transcribeAudio = async (audioUri) => {
    try {
      if (!audioUri) {
        return null;
      }

      // Small delay to ensure file is fully written
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        return null;
      }

      // Get file extension from URI to determine encoding
      const fileExtension = audioUri.split(".").pop().toLowerCase();

      // Set encoding based on file extension
      let encoding = "AMR";
      let sampleRate = 8000;

      if (fileExtension === "m4a") {
        encoding = "AMR"; // Using AMR for m4a as it's more compatible
        sampleRate = 44100;
      } else if (fileExtension === "amr") {
        encoding = "AMR";
        sampleRate = 8000;
      }

      // Read the audio file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Prepare request body for Google Cloud Speech-to-Text API
      const requestBody = {
        config: {
          encoding: encoding,
          sampleRateHertz: sampleRate,
          languageCode: "en-US",
          audioChannelCount: 1,
          enableAutomaticPunctuation: true,
          model: "default", // Use default model for better accuracy
          useEnhanced: true, // Enable enhanced models
          maxAlternatives: 1, // We only need the best alternative
        },
        audio: {
          content: base64Audio,
        },
      };

      // Make API request
      console.log(
        "Making Speech-to-Text API request with key available:",
        !!GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY
      );
      const apiUrl = `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY}`;
      console.log("Using API URL:", apiUrl);

      try {
        const response = await fetch(apiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        // Check response status
        if (!response.ok) {
          const errorText = await response.text();
          console.error("API Error:", response.status, errorText);
          Alert.alert(
            "Transcription Issue",
            "There was a problem with the transcription service. Please verify your Google Cloud API key and ensure the Speech-to-Text API is enabled in your Google Cloud Console."
          );
          animateError(); // Trigger error animation
          return null;
        }

        // Parse response
        const responseData = await response.json();

        // Extract transcription text from all available results
        if (responseData?.results?.length > 0) {
          // Combine all results instead of just taking the first one
          let fullTranscript = "";

          responseData.results.forEach((result) => {
            if (result.alternatives && result.alternatives.length > 0) {
              // Add each transcript with a space
              fullTranscript += result.alternatives[0].transcript + " ";
            }
          });

          // Trim the final result to remove extra spaces
          fullTranscript = fullTranscript.trim();

          if (fullTranscript) {
            animateSuccess(); // Trigger success animation
            return fullTranscript;
          }
        }

        Alert.alert(
          "No Speech Detected",
          "No speech was detected in the recording. Please try again and speak clearly."
        );
        animateError(); // Trigger error animation
        return null;
      } catch (error) {
        console.error("Error during transcription:", error);
        Alert.alert(
          "Transcription Error",
          "Failed to transcribe audio: " + error.message
        );
        animateError(); // Trigger error animation
        return null;
      }
    } catch (error) {
      console.error("Error during transcription:", error);
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio: " + error.message
      );
      animateError(); // Trigger error animation
      return null;
    }
  };

  // Get button color based on state
  const getButtonColor = () => {
    switch (commandState) {
      case "recording":
        return "#ff6b6b"; // Red when recording
      case "processing":
        return "#f9a826"; // Orange when processing
      case "success":
        return "#2ecc71"; // Green for success
      case "error":
        return "#e74c3c"; // Red for error
      default:
        return "#3498db"; // Blue when idle (default)
    }
  };

  return (
    <Animated.View
      style={[
        styles.buttonContainer,
        {
          transform: [
            { scale: commandState === "recording" ? pulseAnim : scaleAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={0.6}
        onPress={handleVoiceRecordPress}
        style={[
          styles.voiceButton,
          {
            backgroundColor: getButtonColor(),
            bottom: isKeyboardVisible ? keyboardHeight + 16 : 16,
          },
          style, // Apply custom styles
        ]}
        disabled={isProcessing}
      >
        <Ionicons
          name={
            commandState === "recording"
              ? "stop"
              : commandState === "success"
              ? "checkmark"
              : commandState === "error"
              ? "alert-circle"
              : commandState === "processing"
              ? "mic"
              : "mic"
          }
          size={28}
          color="white"
        />
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: "absolute",
    right: 6,
    bottom: 60, // Add margin bottom to avoid phone navigation buttons
    zIndex: 100,
  },
  voiceButton: {
    width: 65,
    height: 65,
    borderRadius: 999,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  processingIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default VoiceRecorder;
