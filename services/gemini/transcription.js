import axios from "axios";
import * as FileSystem from "expo-file-system";
import {
  GEMINI_API_KEY,
  GEMINI_MODEL,
  GEMINI_API_URL,
  GEMINI_CONFIG,
} from "./config";
import { processGeminiResponse } from "./utils";

/**
 * Process a voice transcription through Gemini API to get structured JSON blocks
 * @param {string} transcription - The raw text transcription from speech-to-text
 * @returns {Object} - Response containing either JSON blocks or error information
 */
export const processTranscriptionWithGemini = async (transcription) => {
  try {
    // Validate input
    if (!transcription || typeof transcription !== "string") {
      console.error("Invalid transcription input");
      return { success: false, error: "Invalid input" };
    }

    console.log("Processing transcription with Gemini:", transcription);

    // Create the prompt for Gemini
    const prompt = {
      contents: [
        {
          role: "user", // First user message acts as system instruction
          parts: [
            {
              text: `You are a specialized JSON formatter that transforms transcribed speech into BlockNote.js editor blocks. First analyze the context and intent of the voice transcription deeply, then output structured blocks that match BlockNote's exact JSON format.

REQUIRED BLOCK STRUCTURE FORMAT:
Each block must have this exact structure:
{
  "type": "paragraph", // or other block type
  "props": {
    "textColor": "default",
    "backgroundColor": "default",
    "textAlignment": "left"
    // additional props based on type
  },
  "content": [
    {
      "type": "text",
      "text": "The actual content text goes here",
      "styles": {}
    }
  ],
  "children": []
}

ENHANCED CONTEXTUAL ANALYSIS INSTRUCTIONS:
1. Analyze the transcription to determine the precise context, purpose, and intent
2. Consider the semantic meaning and natural organization of the content
3. Listen for implicit and explicit cues that suggest specific block types
4. Identify relationships between ideas to create hierarchical structure
5. Match content patterns with the most appropriate BlockNote block types
6. Pay special attention to formatting cues like "bullet points", "heading", "important", "quote", etc.
7. Convert narrative descriptions into structured content ("make a list of..." → bulletListItem blocks)
8. Break long monologues into logical paragraph blocks
9. Detect if the user wants to create a new page

ALL SUPPORTED BLOCK TYPES:
- "paragraph" - For general text content (default for most content)
- "heading" - For titles and section headers (props must include "level": 1, 2, or 3)
- "bulletListItem" - For unordered list items (phrases like "bullet points", "items", "list of", etc.)
- "numberedListItem" - For ordered list items (phrases like "steps", "numbered list", "sequence", etc.)
- "checkListItem" - For tasks or to-do items (props must include "checked": false, phrases like "task", "to-do", "checklist", etc.)
- "quote" - For quoted speech or referenced content (phrases like "quote", text in quotation marks, etc.)
- "code" - For code snippets or technical content (phrases like "code block", technical terms, etc.)
- "pageLink" - For linking to a new page that will be created

SPEECH PATTERN INTERPRETATION EXAMPLES:
- "Make a heading that says..." → heading block with level 1
- "Add a bullet point for..." → bulletListItem block
- "This is important: [content]" → paragraph with emphasis styles or heading block
- "Step one: [content]" → numberedListItem block
- "Need to remember to [task]" → checkListItem block with checked: false
- "As they said, quote, [content]" → quote block
- "Code example: [content]" → code block

NEW PAGE DETECTION:
If the user mentions any of these phrases, they want to create a new page:
- "create a new page"
- "add a new page"
- "make a new page"
- "start a new page"
- "create page"
- "new page"

When this is detected, output one pageLink block followed by content blocks:
1. First block should be of type "pageLink" with these properties:
   {
     "type": "pageLink",
     "props": {
       "pageId": "new_page", // This is a placeholder, will be replaced by the app
       "pageTitle": "Title of the new page", // Extract this from user's request
       "pageIcon": "📄" // Default icon
     },
     "content": [], // Must be empty array for pageLink blocks
     "children": []
   }
2. Following blocks should contain the content the user wants on the new page.
3. Include a special property "createNewPage": true at the top level of your JSON response.

RESPONSE REQUIREMENTS:
1. ALWAYS output valid JSON - either an array of blocks or an object with createNewPage and blocks fields
2. DO NOT include explanations or markdown syntax in your response
3. The JSON must be properly formatted with no extra characters
4. For new page requests, the response should be a JSON object with "createNewPage": true and "blocks": [...]

DETAILED EXAMPLES:

Example 1 - Meeting notes with implicit sections:
Input: "Meeting with marketing team discussed the new campaign launch for next month. Key points were budget approval by finance, creative assets ready by next week, and social media plan needs revision."
Output: [
  {
    "type": "heading",
    "props": {
      "level": 1,
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Meeting with Marketing Team",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default", 
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Discussed the new campaign launch for next month.",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "heading",
    "props": {
      "level": 2,
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Key Points",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "bulletListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Budget approval by finance",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "bulletListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Creative assets ready by next week",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "bulletListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Social media plan needs revision",
        "styles": {}
      }
    ],
    "children": []
  }
]

Example 2 - To-do list with implied tasks:
Input: "Need to remember to send the report by Friday, schedule meeting with the client, and prepare the presentation slides."
Output: [
  {
    "type": "heading",
    "props": {
      "level": 2,
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Tasks",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "checkListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left",
      "checked": false
    },
    "content": [
      {
        "type": "text",
        "text": "Send the report by Friday",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "checkListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default", 
      "textAlignment": "left",
      "checked": false
    },
    "content": [
      {
        "type": "text",
        "text": "Schedule meeting with the client",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "checkListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left",
      "checked": false
    },
    "content": [
      {
        "type": "text",
        "text": "Prepare the presentation slides",
        "styles": {}
      }
    ],
    "children": []
  }
]

Example 3 - Mixed content with a quoted reference:
Input: "The project plan has three phases. Phase 1 is research, phase 2 is development, and phase 3 is testing. As the CEO said quote we need to prioritize quality over speed end quote. Remember to document each phase carefully."
Output: [
  {
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "The project plan has three phases.",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "numberedListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Research",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "numberedListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Development",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "numberedListItem",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Testing",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "quote",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "We need to prioritize quality over speed",
        "styles": {}
      }
    ],
    "children": []
  },
  {
    "type": "paragraph",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left"
    },
    "content": [
      {
        "type": "text",
        "text": "Remember to document each phase carefully.",
        "styles": {}
      }
    ],
    "children": []
  }
]

Example 4 - Creating a new page:
Input: "Create a new page called Project Timeline with details about the quarterly milestones and key deliverables for each month"
Output: {
  "createNewPage": true,
  "blocks": [
    {
      "type": "pageLink",
      "props": {
        "pageId": "new_page",
        "pageTitle": "Project Timeline",
        "pageIcon": "📄"
      },
      "content": [],
      "children": []
    },
    {
      "type": "heading",
      "props": {
        "level": 1,
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Project Timeline",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "type": "heading",
      "props": {
        "level": 2,
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Quarterly Milestones",
          "styles": {}
        }
      ],
      "children": []
    },
    {
      "type": "paragraph",
      "props": {
        "textColor": "default",
        "backgroundColor": "default",
        "textAlignment": "left"
      },
      "content": [
        {
          "type": "text",
          "text": "Key deliverables for each month",
          "styles": {}
        }
      ],
      "children": []
    }
  ]
}`,
            },
          ],
        },
        {
          role: "user", // Second user message with the actual content to process
          parts: [
            {
              text: `Raw Transcribed Text: "${transcription}"`,
            },
          ],
        },
      ],
    };

    // Make the API request
    console.log(`Calling Gemini API at ${GEMINI_API_URL}`);
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: prompt.contents,
          generationConfig: GEMINI_CONFIG,
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Extract the response text from Gemini
      const responseText = response.data.candidates[0]?.content?.parts[0]?.text;
      console.log("Received successful response from Gemini API");

      if (!responseText) {
        console.error("Empty response from Gemini API");
        return {
          success: false,
          error: "Empty response from AI",
          rawText: transcription,
        };
      }

      console.log("Gemini response:", responseText);

      // Try to parse the response as JSON
      try {
        // Remove markdown code block delimiters if present
        let jsonText = responseText.trim();

        // Check if response is wrapped in markdown code block
        if (jsonText.startsWith("```") && jsonText.endsWith("```")) {
          // Extract content between code block markers
          jsonText = jsonText
            .substring(jsonText.indexOf("\n") + 1, jsonText.lastIndexOf("```"))
            .trim();

          // If it started with ```json, the first line needs to be removed
          if (jsonText.startsWith("json")) {
            jsonText = jsonText.substring(jsonText.indexOf("\n") + 1).trim();
          }
          console.log("Cleaned JSON text from code blocks:", jsonText);
        }

        // Check for any remaining non-JSON characters
        const nonJsonMatch = jsonText.match(/^[^[\{]+([\[{].*)/);
        if (nonJsonMatch && nonJsonMatch[1]) {
          console.log("Found non-JSON prefix, cleaning...");
          jsonText = nonJsonMatch[1];
        }

        console.log(
          "Attempting to parse JSON:",
          jsonText.substring(0, 50) + "..."
        );
        const parsedResponse = JSON.parse(jsonText);

        // Check if we have an object with createNewPage and blocks
        if (
          typeof parsedResponse === "object" &&
          !Array.isArray(parsedResponse) &&
          parsedResponse.createNewPage === true &&
          Array.isArray(parsedResponse.blocks)
        ) {
          console.log("Detected new page creation request");
          return processGeminiResponse(parsedResponse, transcription);
        }
        // Check if we have a regular blocks array
        else if (Array.isArray(parsedResponse)) {
          return processGeminiResponse(parsedResponse, transcription);
        } else {
          console.error("Gemini response has invalid format:", parsedResponse);
          return {
            success: false,
            error: "Invalid response format",
            rawText: transcription,
          };
        }
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        return {
          success: false,
          error: "Failed to parse response",
          rawText: transcription,
        };
      }
    } catch (error) {
      console.error("Error calling Gemini API:", error);

      // Check for detailed error information
      const errorMessage =
        error?.response?.data?.error?.message || error.message;
      const errorCode = error?.response?.status;
      console.error(`API Error ${errorCode}: ${errorMessage}`);

      // Handle specific error types
      if (errorMessage.includes("system role is not supported")) {
        console.error(
          "This model does not support system role - use user role instead"
        );
        return {
          success: false,
          error: "API configuration error - system role not supported",
          rawText: transcription,
        };
      }

      if (errorMessage.includes("API key")) {
        console.error(
          "API key issue - check that your key is valid and has the correct permissions"
        );
        return {
          success: false,
          error: "API key invalid or missing permissions",
          rawText: transcription,
        };
      }

      // Handle HTTP error codes
      if (errorCode === 404) {
        console.error(
          "404 error indicates the model doesn't exist or isn't accessible with your API key"
        );
        console.error(
          "Make sure the Gemini API is enabled in your Google Cloud Console"
        );
        return {
          success: false,
          error:
            "Model not found - please check that the Gemini API is enabled in your Google Cloud Console",
          rawText: transcription,
        };
      }

      if (errorCode === 403) {
        console.error(
          "403 error indicates permission issues with your API key"
        );
        return {
          success: false,
          error: "API permission error - check API key permissions",
          rawText: transcription,
        };
      }

      if (errorCode === 400) {
        console.error(
          "400 error might indicate issues with the API request format"
        );
        console.error("Error details:", error?.response?.data);
        return {
          success: false,
          error: "API request format error - check the request structure",
          rawText: transcription,
        };
      }

      return {
        success: false,
        error: `API error: ${error.message || "Unknown error"}`,
        rawText: transcription,
      };
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);

    // More helpful error messages for common errors
    if (error?.response?.status === 404) {
      console.error(
        "404 error indicates the model doesn't exist or isn't accessible with your API key"
      );
      console.error(
        "Make sure the Gemini API is enabled in your Google Cloud Console"
      );
      return {
        success: false,
        error:
          "Model not found - please check that the Gemini API is enabled in your Google Cloud Console",
        rawText: transcription,
      };
    }

    if (error?.response?.status === 403) {
      console.error("403 error indicates permission issues with your API key");
      return {
        success: false,
        error: "API permission error - check API key permissions",
        rawText: transcription,
      };
    }

    if (error?.response?.status === 400) {
      console.error(
        "400 error might indicate issues with the system instructions format"
      );
      console.error("Error details:", error?.response?.data);
      return {
        success: false,
        error:
          "API request format error - there might be an issue with the system instructions",
        rawText: transcription,
      };
    }

    return {
      success: false,
      error: `API error: ${error.message || "Unknown error"}`,
      rawText: transcription,
    };
  }
};

/**
 * Transcribe audio recording using Gemini API
 * @param {string} audioUri - URI to the audio file to transcribe
 * @returns {Object} - Response containing transcription or error information
 */
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const transcribeAudioWithGemini = async (audioUri) => {
  try {
    // Validate input
    if (!audioUri || typeof audioUri !== "string") {
      console.error("Invalid audio URI input");
      return { success: false, error: "Invalid audio URI" };
    }

    console.log("Transcribing audio with Gemini:", audioUri);

    try {
      // Get audio file info
      const audioInfo = await FileSystem.getInfoAsync(audioUri);
      console.log("Audio file info:", audioInfo);

      if (!audioInfo.exists) {
        throw new Error("Audio file does not exist");
      }

      // Read the audio file as base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Create the API request to Gemini API
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

      console.log(
        "Prompt sent to Gemini for voice command:",
        JSON.stringify(requestData, null, 2)
      );
      const requestData = {
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Please transcribe the following audio file accurately. Return only the transcribed text without any additional comments or formatting.",
              },
              {
                inline_data: {
                  mime_type: "audio/m4a", // Expo Audio uses .m4a format by default
                  data: base64Audio,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.0,
          topP: 0.1,
          topK: 16,
          maxOutputTokens: 1024,
        },
      };

      // Make the API request with retry logic
      let response;
      let lastError = null;
      const maxRetries = 3;
      let attempt = 0;

      while (attempt < maxRetries) {
        try {
          response = await axios.post(apiUrl, requestData, { timeout: 15000 }); // 15-second timeout
          break; // Success, exit loop
        } catch (error) {
          lastError = error;
          if (error.response && error.response.status === 503 && attempt < maxRetries - 1) {
            const delayTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.warn(`Attempt ${attempt + 1} failed with 503. Retrying in ${delayTime}ms...`);
            await delay(delayTime);
            attempt++;
          } else {
            throw error; // Non-503 error or max retries reached
          }
        }
      }

      if (!response) {
        console.error("API request failed after multiple retries:", lastError);
        throw lastError;
      }
      console.log(
        "Raw response from Gemini for voice command:",
        JSON.stringify(response.data, null, 2)
      );

      // Extract the transcription from the response
      let transcription = "";
      if (
        response.data &&
        response.data.candidates &&
        response.data.candidates.length > 0 &&
        response.data.candidates[0].content &&
        response.data.candidates[0].content.parts &&
        response.data.candidates[0].content.parts.length > 0
      ) {
        transcription = response.data.candidates[0].content.parts[0].text;
      } else {
        throw new Error("No transcription results returned");
      }

      console.log("Transcription successful:", transcription);

      return {
        success: true,
        transcription: transcription,
      };
    } catch (error) {
      console.error("Error processing audio file:", error);
      return {
        success: false,
        error: `Audio processing error: ${error.message || "Unknown error"}`,
      };
    }
  } catch (error) {
    console.error("Error transcribing audio:", error);
    return {
      success: false,
      error: `Transcription error: ${error.message || "Unknown error"}`,
    };
  }
};
