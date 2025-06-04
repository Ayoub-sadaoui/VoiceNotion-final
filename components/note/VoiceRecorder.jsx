import React, { useState } from "react";
import { TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

// API Key for Google Cloud Speech-to-Text
// SECURITY NOTE: In production, this should be moved to a secure backend
// and never exposed in client-side code. Consider using environment variables
// or a backend proxy for API requests.
const GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY =
  "AIzaSyBUjmj5WK8mqBhLlhyx-5-J3blXa9v8ZzQ"; // REPLACE WITH YOUR API KEY

const VoiceRecorder = ({
  onTranscriptionComplete,
  theme,
  isKeyboardVisible,
  keyboardHeight,
}) => {
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);

  // Handle voice record button press
  const handleVoiceRecordPress = async () => {
    try {
      // If we're already recording, stop the recording
      if (isRecording) {
        const uri = await stopRecording();
        // Process the recording for transcription
        if (uri) {
          const transcription = await transcribeAudio(uri);

          // Check if we have valid transcription text
          if (transcription) {
            onTranscriptionComplete(transcription);
          }
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
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
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
        },
        audio: {
          content: base64Audio,
        },
      };

      // Make API request
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
        Alert.alert(
          "Transcription Issue",
          "There was a problem with the transcription service. Please verify your Google Cloud API key and ensure the Speech-to-Text API is enabled in your Google Cloud Console."
        );
        return null;
      }

      // Parse response
      const responseData = await response.json();

      // Extract transcription text if available
      if (
        responseData?.results?.length > 0 &&
        responseData.results[0]?.alternatives?.length > 0
      ) {
        return responseData.results[0].alternatives[0].transcript;
      } else {
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
