import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

// API Key for Google Cloud Speech-to-Text
// SECURITY WARNING: For production, this should be moved to a secure backend
const GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY =
  "AIzaSyBUjmj5WK8mqBhLlhyx-5-J3blXa9v8ZzQ"; // REPLACE THIS!

const VoiceRecorder = ({
  onTranscriptionComplete,
  theme,
  isKeyboardVisible,
  keyboardHeight,
}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);

  // Handle voice record button press
  const handleVoiceRecordPress = async () => {
    try {
      // If we're already recording, stop the recording
      if (isRecording) {
        const uri = await stopRecording();
        // Process the recording for transcription
        if (uri) {
          console.log("Starting transcription of recorded audio...");
          const transcription = await transcribeAudioAlternative(uri);

          // Check if we have valid transcription text
          if (transcription) {
            console.log("Final transcription result:", transcription);
            onTranscriptionComplete(transcription);
          } else {
            console.warn("No transcription result available to insert");
          }
        }
        return;
      }

      // Otherwise check permissions and start recording
      console.log("Requesting microphone permission...");
      const { status } = await Audio.requestPermissionsAsync();
      console.log("Permission status:", status);

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone permission is needed to use voice recording features.",
          [{ text: "OK" }]
        );
        return;
      }

      // Permission is granted, start recording
      await startRecording();
    } catch (error) {
      console.error("Error in voice recording process:", error);
      Alert.alert("Error", "Failed to handle voice recording.");
    }
  };

  // Start recording function
  const startRecording = async () => {
    try {
      console.log("Starting recording...");

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

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
      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    console.log("Stopping recording...");
    if (!recording) {
      console.warn("No active recording to stop");
      return null;
    }

    try {
      // Stop the recording
      await recording.stopAndUnloadAsync();

      // Get the recorded URI
      const uri = recording.getURI();
      console.log("Recording stopped and stored at:", uri);

      // Reset recording state and save URI
      setRecording(null);
      setIsRecording(false);
      setRecordedUri(uri);

      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
      setIsRecording(false);
      setRecording(null);
      return null;
    }
  };

  // Alternative approach to transcribe audio using file URI instead of Base64
  const transcribeAudioAlternative = async (audioUri) => {
    try {
      console.log("Starting alternative transcription process for:", audioUri);

      if (!audioUri) {
        console.error("No audio URI provided for transcription");
        return null;
      }

      // For debugging - add a short delay to ensure file is fully written
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log("File info:", fileInfo);

      if (!fileInfo.exists) {
        console.error("Audio file does not exist at specified URI");
        return null;
      }

      // Get file extension from URI
      const fileExtension = audioUri.split(".").pop().toLowerCase();
      console.log("File extension:", fileExtension);

      // First, try the main approach
      const transcription = await transcribeAudio(audioUri);

      if (transcription) {
        return transcription;
      } else {
        console.log(
          "Main transcription approach failed, please check your API key and account setup"
        );
        Alert.alert(
          "Transcription Issue",
          "There was a problem with the transcription service. Please verify your Google Cloud API key and ensure the Speech-to-Text API is enabled in your Google Cloud Console."
        );
        return null;
      }
    } catch (error) {
      console.error("Error in alternative transcription method:", error);
      return null;
    }
  };

  // Transcribe audio using Google Cloud Speech-to-Text API
  const transcribeAudio = async (audioUri) => {
    try {
      console.log("Starting transcription process for:", audioUri);

      // Check if URI exists
      if (!audioUri) {
        console.error("No audio URI provided for transcription");
        return null;
      }

      // Get file extension from URI to determine encoding
      const fileExtension = audioUri.split(".").pop().toLowerCase();
      console.log("File extension detected:", fileExtension);

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

      console.log(`Using encoding: ${encoding}, sample rate: ${sampleRate}`);

      // Read the audio file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(
        `Read audio file successfully, size: ${base64Audio.length} bytes`
      );

      // Prepare request body for Google Cloud Speech-to-Text API
      const requestBody = {
        config: {
          encoding: encoding,
          sampleRateHertz: sampleRate,
          languageCode: "en-US",
          audioChannelCount: 1,
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: base64Audio,
        },
      };

      // Log the first few characters of the base64 content to verify format
      console.log(
        "Base64 content preview:",
        base64Audio.substring(0, 50) + "..."
      );

      // Make API request
      console.log(
        `Sending request to Google Cloud Speech-to-Text API with ${encoding} encoding...`
      );
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        return null;
      }

      // Parse response
      const responseData = await response.json();
      console.log(
        "Google Cloud Speech-to-Text API Raw Response:",
        JSON.stringify(responseData, null, 2)
      );

      // Extract transcription text if available
      if (
        responseData &&
        responseData.results &&
        responseData.results.length > 0 &&
        responseData.results[0].alternatives &&
        responseData.results[0].alternatives.length > 0
      ) {
        const transcription =
          responseData.results[0].alternatives[0].transcript;
        console.log("Transcription successful:", transcription);
        return transcription;
      } else {
        console.warn(
          "No transcription result returned - Try speaking more clearly or for longer"
        );
        Alert.alert(
          "No Speech Detected",
          "No speech was detected in the recording. Please try again and speak clearly."
        );
        return null;
      }
    } catch (error) {
      console.error("Error during transcription:", error);
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio: " + error.message
      );
      return null;
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.voiceButton,
        {
          backgroundColor: isRecording ? "#FF3B30" : theme.primary,
          bottom: isKeyboardVisible ? keyboardHeight + 50 : 60,
        },
      ]}
      onPress={handleVoiceRecordPress}
    >
      <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="white" />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  voiceButton: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});

export default VoiceRecorder;
