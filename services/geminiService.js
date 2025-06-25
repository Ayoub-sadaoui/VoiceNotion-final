import {
  processTranscriptionWithGemini,
  transcribeAudioWithGemini,
} from "./gemini/transcription";
import { processVoiceCommandWithGemini } from "./gemini/commands";
import { askGeminiAI } from "./gemini/ai";
import { validateBlockNoteFormat, processGeminiResponse } from "./gemini/utils";

/**
 * Process a voice command with Gemini API
 * This is an alias for processVoiceCommandWithGemini to fix the function name mismatch
 */
const processCommandWithGemini = processVoiceCommandWithGemini;

export {
  processTranscriptionWithGemini,
  validateBlockNoteFormat,
  processGeminiResponse,
  processVoiceCommandWithGemini,
  processCommandWithGemini,
  transcribeAudioWithGemini,
  askGeminiAI,
};

export default {
  processTranscriptionWithGemini,
  validateBlockNoteFormat,
  processGeminiResponse,
  processVoiceCommandWithGemini,
  processCommandWithGemini,
  transcribeAudioWithGemini,
  askGeminiAI,
};
