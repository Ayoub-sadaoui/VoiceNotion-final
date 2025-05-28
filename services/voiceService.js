/**
 * Voice Service
 *
 * Handles voice input, recognition and intent parsing.
 * Currently using mock implementation - will be replaced with Gemini API integration.
 */

import { Audio } from "expo-av";
import Toast from "react-native-toast-message";

// Mock responses for demonstration purposes
const mockResponses = {
  addText: {
    type: "ADD_TEXT",
    text: "This is a test of the voice input feature.",
  },
  formatText: {
    type: "FORMAT_TEXT",
    format: "bold",
    value: true,
  },
  createHeading: {
    type: "CREATE_BLOCK",
    blockType: "heading",
    level: 2,
    text: "New Section Heading",
  },
  createBulletList: {
    type: "CREATE_BLOCK",
    blockType: "bulletList",
    text: "First bullet point",
  },
};

/**
 * Voice recording service for handling audio recording and processing
 */
class VoiceService {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.isRecording = false;
    this.audioUri = null;
  }

  /**
   * Starts a new voice recording
   * @returns {Promise<boolean>} Success status
   */
  async startRecording() {
    try {
      // Request permission
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== "granted") {
        Toast.show({
          type: "error",
          text1: "Microphone permission not granted",
          text2: "Please enable microphone access in settings",
          position: "top",
        });
        return false;
      }

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create recording instance
      console.log("Creating recording...");
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      this.recording = recording;
      this.isRecording = true;
      console.log("Recording started");
      return true;
    } catch (error) {
      console.error("Failed to start recording:", error);
      Toast.show({
        type: "error",
        text1: "Recording Error",
        text2: `Failed to start recording: ${error.message || "Unknown error"}`,
        position: "top",
      });
      return false;
    }
  }

  /**
   * Stops the current voice recording
   * @returns {Promise<string|null>} URI of recorded audio or null if failed
   */
  async stopRecording() {
    try {
      if (!this.recording) {
        console.warn("No active recording to stop");
        return null;
      }

      console.log("Stopping recording...");
      await this.recording.stopAndUnloadAsync();

      // Get recording URI
      const uri = this.recording.getURI();
      this.audioUri = uri;
      this.isRecording = false;
      this.recording = null;

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
      });

      console.log("Recording stopped, URI:", uri);
      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      this.isRecording = false;
      this.recording = null;
      return null;
    }
  }

  /**
   * Process recorded audio with Gemini API
   * @returns {Promise<Object|null>} Processed result or null if failed
   */
  async processRecording() {
    try {
      if (!this.audioUri) {
        console.warn("No recorded audio to process");
        return null;
      }

      // Here we would typically:
      // 1. Convert the audio to the correct format if needed
      // 2. Upload/send the audio to Gemini API
      // 3. Process the response

      // For now, this is just a placeholder that returns simulated data
      console.log("Processing recording...");

      // Simulate API processing time
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Simulated response from Gemini API
      const simulatedResponse = {
        text: "This is simulated voice transcription. In a real implementation, this would be the text transcribed by Gemini API.",
        intent: {
          type: "TEXT_INPUT",
          parameters: {
            format: "paragraph",
          },
        },
        confidence: 0.92,
      };

      console.log("Processing complete:", simulatedResponse);
      return simulatedResponse;
    } catch (error) {
      console.error("Failed to process recording:", error);
      return null;
    }
  }

  /**
   * Process voice input with a specific text
   * @param {string} text - The text to process
   * @returns {Promise<Object>} A promise that resolves with the parsed intent
   */
  async processVoiceInput(text) {
    console.log("Processing voice input text:", text);

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // For demo, just return a random mock response
    const responseTypes = Object.keys(mockResponses);
    const randomType =
      responseTypes[Math.floor(Math.random() * responseTypes.length)];

    console.log(`Returning mock response of type: ${randomType}`);
    return mockResponses[randomType];
  }

  /**
   * Handle voice command execution
   * @param {Object} intent - The parsed intent from voice
   * @param {Object} editor - The editor instance
   * @returns {Promise<boolean>} Success status
   */
  async handleVoiceCommand(intent, editor) {
    if (!intent || !intent.type) {
      console.error("Invalid intent:", intent);
      return false;
    }

    console.log("Handling voice command:", intent);

    // In a real implementation, this would execute the command on the editor
    // For now, just log it
    switch (intent.type) {
      case "ADD_TEXT":
        console.log(`Would add text: "${intent.text}"`);
        break;
      case "FORMAT_TEXT":
        console.log(`Would format text: ${intent.format} = ${intent.value}`);
        break;
      case "CREATE_BLOCK":
        console.log(
          `Would create ${intent.blockType} block with text: "${intent.text}"`
        );
        break;
      default:
        console.warn(`Unknown intent type: ${intent.type}`);
        return false;
    }

    return true;
  }

  /**
   * Cleans up recording resources
   */
  async cleanup() {
    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch (error) {
        console.warn("Error cleaning up recording:", error);
      }
      this.recording = null;
    }

    this.isRecording = false;
    this.audioUri = null;
  }
}

// Create a singleton instance
const voiceService = new VoiceService();

// Export the instance as default
export default voiceService;
