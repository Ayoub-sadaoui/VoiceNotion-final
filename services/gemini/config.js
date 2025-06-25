// In production, this should be handled server-side to protect the API key
const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
console.log("Gemini API Key available:", !!GEMINI_API_KEY);

// Use the latest Gemini 1.5 Pro model with improved instruction following
const GEMINI_MODEL = "gemini-1.5-pro"; // Other options: "gemini-1.5-flash", "gemini-pro"
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent`;

// Configuration for the Gemini API request
const GEMINI_CONFIG = {
  temperature: 0.0, // Low temperature for more deterministic responses
  topP: 0.1, // Low top_p for more focused output
  topK: 16, // Limited vocabulary diversity
  maxOutputTokens: 8192, // Increased token limit to handle large JSON responses
};

export { GEMINI_API_KEY, GEMINI_MODEL, GEMINI_API_URL, GEMINI_CONFIG };
