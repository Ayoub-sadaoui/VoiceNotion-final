import React, { useState, useEffect, useRef } from "react";
import {
  TouchableOpacity,
  StyleSheet,
  Alert,
  View,
  ActivityIndicator,
  Animated,
  Easing,
  Text,
  Pressable,
} from "react-native";
import { Ionicons, MaterialIcons, FontAwesome5 } from "@expo/vector-icons";
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
  const [isAskAIMode, setIsAskAIMode] = useState(false); // New state for Ask AI mode
  const [longPressTimer, setLongPressTimer] = useState(null); // Timer for long press
  const [showHint, setShowHint] = useState(true); // State to control hint visibility

  // Animation values
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const hintOpacity = useRef(new Animated.Value(1)).current;

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

      // Clear any pending timers
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [recording, longPressTimer]);

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

  // Effect to handle hint animation and auto-hide
  useEffect(() => {
    if (showHint) {
      // Fade in the hint
      Animated.timing(hintOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      // Set a timeout to hide the hint after 5 seconds
      const hintTimer = setTimeout(() => {
        Animated.timing(hintOpacity, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }).start(() => {
          setShowHint(false);
        });
      }, 5000);

      return () => clearTimeout(hintTimer);
    }
  }, [showHint]);

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
        // Safely stop recording and get URI
        const uri = await stopRecording();

        // Process the recording for transcription if we have a valid URI
        if (uri) {
          setIsProcessing(true);
          const rawTranscription = await transcribeAudio(uri);

          // Check if we have valid transcription text
          if (rawTranscription) {
            try {
              console.log("Processing voice input:", rawTranscription);

              if (isAskAIMode) {
                // Process as an AI question
                console.log("Processing in Ask AI mode");
                const aiResponse = await geminiService.askGeminiAI(
                  rawTranscription,
                  editorContent
                );

                // Reset Ask AI mode
                setIsAskAIMode(false);

                // Send the AI response to parent component
                if (onCommandProcessed) {
                  onCommandProcessed({
                    ...aiResponse,
                    rawTranscription,
                  });
                }
              } else {
                // Process as a voice command using the unified approach
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

        // Start recording
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
      // Make sure we don't have an existing recording
      if (recording !== null) {
        console.log("Cleaning up existing recording before starting a new one");
        try {
          await recording.stopAndUnloadAsync();
        } catch (err) {
          console.log("Recording was already unloaded or never started");
        }
        setRecording(null);
      }

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
      console.log("No active recording to stop");
      return null;
    }

    try {
      console.log("Stopping recording...");

      // Get the URI before stopping (in case we need it)
      const uri = recording.getURI();

      // Safely stop the recording
      try {
        await recording.stopAndUnloadAsync();
        console.log("Recording stopped successfully");
      } catch (stopError) {
        console.log(
          "Error stopping recording (may already be stopped):",
          stopError.message
        );
        // Continue with the flow even if there was an error stopping
      }

      // Reset recording state
      setRecording(null);
      setIsRecording(false);

      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      // Don't show an alert here, just log the error

      // Reset recording state
      setIsRecording(false);
      setRecording(null);
      return null;
    }
  };

  // Handle long press to activate Ask AI mode
  const handleLongPress = () => {
    console.log("Long press detected - activating Ask AI mode");

    // If we're already recording, stop it first
    if (isRecording && recording) {
      try {
        recording.stopAndUnloadAsync();
      } catch (err) {
        console.log("Error stopping existing recording:", err.message);
      }
      setRecording(null);
      setIsRecording(false);
    }

    // Now set Ask AI mode and start a new recording
    setIsAskAIMode(true);

    // Hide the hint when user successfully uses long press
    setShowHint(false);

    // Start the voice recording process
    handleVoiceRecordPress();
  };

  // Handle press in to start timer for long press
  const handlePressIn = () => {
    // Set a timer for 1 second
    const timer = setTimeout(() => {
      handleLongPress();
    }, 1000);
    setLongPressTimer(timer);
  };

  // Handle press out to clear timer if released before long press threshold
  const handlePressOut = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
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

  // Get button color based on state and mode
  const getButtonColor = () => {
    if (isAskAIMode) {
      // Different colors for Ask AI mode
      switch (commandState) {
        case "recording":
          return "#7C4DFF"; // Deeper purple when recording in Ask AI mode
        case "processing":
          return "#673ab7"; // Deep purple when processing in Ask AI mode
        case "success":
          return "#2ecc71"; // Green for success
        case "error":
          return "#e74c3c"; // Red for error
        default:
          return "#7C4DFF"; // Purple when idle in Ask AI mode
      }
    } else {
      // Original colors for normal mode
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
      {/* Hint tooltip */}
      {showHint && (
        <Animated.View
          style={[
            styles.hintContainer,
            {
              opacity: hintOpacity,
            },
          ]}
        >
          <Text style={styles.hintText}>Long press to Ask AI</Text>
        </Animated.View>
      )}

      {isAskAIMode && isRecording && (
        <View
          style={[
            styles.askAIModeIndicator,
            { backgroundColor: "rgba(124, 77, 255, 0.9)" },
          ]}
        >
          <Ionicons
            name="sparkles"
            size={16}
            color="white"
            style={styles.askAIIcon}
          />
          <Text style={styles.askAIModeText}>Listening for Question...</Text>
        </View>
      )}
      <Pressable
        onPress={handleVoiceRecordPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.voiceButton,
          {
            backgroundColor: getButtonColor(),
            bottom: isKeyboardVisible ? keyboardHeight + 16 : 16,
            shadowColor: isAskAIMode ? "#7C4DFF" : "#000",
            shadowOpacity: isAskAIMode ? 0.4 : 0.3,
          },
          style, // Apply custom styles
        ]}
        disabled={isProcessing}
      >
        {isAskAIMode ? (
          // AI mode icon - using sparkle icon instead of robot
          <Ionicons name="sparkles" size={28} color="white" />
        ) : (
          // Regular voice mode icon
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
        )}
        {isProcessing && (
          <View style={styles.processingIndicator}>
            <ActivityIndicator size="small" color="white" />
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    position: "absolute",
    right: 6,
    bottom: 60, // Add margin bottom to avoid phone navigation buttons
    zIndex: 100,
    alignItems: "flex-end",
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
    shadowRadius: 5,
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
  askAIModeIndicator: {
    position: "absolute",
    bottom: 75,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  askAIIcon: {
    marginRight: 6,
  },
  askAIModeText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 13,
  },
  hintContainer: {
    position: "absolute",
    bottom: 85,
    right: 0,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    width: 150,
    maxWidth: 200,
  },
  hintText: {
    fontSize: 12,
    fontWeight: "400",
    color: "#EEEEEE",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});

export default VoiceRecorder;
