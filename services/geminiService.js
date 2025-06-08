import axios from "axios";

// Replace this with your actual Gemini API key or use environment variable
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
  maxOutputTokens: 1024, // Limit output size
};

// If still having issues, you can try these alternative models:
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent";
// const GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1/models/gemini-pro-latest:generateContent";

/**
 * Validate that blocks match BlockNote's expected structure
 * @param {Array} blocks - The blocks to validate
 * @returns {boolean} - Whether the blocks match BlockNote's format
 */
const validateBlockNoteFormat = (blocks) => {
  if (!Array.isArray(blocks)) return false;

  // Allowed block types and their required properties
  const allowedTypes = {
    paragraph: {},
    heading: { level: [1, 2, 3] },
    bulletListItem: {},
    numberedListItem: {},
    checkListItem: { checked: [true, false] },
    quote: {},
    code: {},
    pageLink: {}, // We'll do custom validation for this type below
  };

  // Standard props all blocks should have
  const standardProps = ["textColor", "backgroundColor", "textAlignment"];

  // Check each block for required properties and structure
  return blocks.every((block) => {
    // Must have type, props, content, and children
    if (
      !block.type ||
      !block.props ||
      !Array.isArray(block.content) ||
      !Array.isArray(block.children)
    ) {
      console.error("Block is missing required fields", block);
      return false;
    }

    // Check if block type is allowed
    if (!allowedTypes[block.type]) {
      console.error(`Invalid block type: ${block.type}`);
      return false;
    }

    // Special validation for pageLink blocks
    if (block.type === "pageLink") {
      // For pageLink, we need pageId, pageTitle, and pageIcon
      const requiredProps = ["pageId", "pageTitle"];
      for (const prop of requiredProps) {
        if (typeof block.props[prop] !== "string") {
          console.error(
            `PageLink block missing required string property: ${prop}`
          );
          return false;
        }
      }

      // pageIcon is optional and defaults to 📄
      if (block.props.pageIcon && typeof block.props.pageIcon !== "string") {
        console.error("PageLink pageIcon must be a string");
        return false;
      }

      // Skip standard props validation for pageLink blocks
      return (
        block.content.length > 0 &&
        typeof block.content[0].type === "string" &&
        typeof block.content[0].text === "string" &&
        typeof block.content[0].styles === "object"
      );
    }

    // Check required properties for specific block types (except pageLink which was handled above)
    const typeProps = allowedTypes[block.type];
    for (const [prop, allowedValues] of Object.entries(typeProps)) {
      if (block.props[prop] === undefined) {
        console.error(
          `Block type ${block.type} is missing required property ${prop}`
        );
        return false;
      }

      // If we have allowed values for this property, check them
      if (
        Array.isArray(allowedValues) &&
        !allowedValues.includes(block.props[prop])
      ) {
        console.error(
          `Invalid value for ${prop} in ${block.type}: ${block.props[prop]}`
        );
        return false;
      }

      // If we have a type requirement, check it
      if (allowedValues === "string" && typeof block.props[prop] !== "string") {
        console.error(`${prop} must be a string in ${block.type}`);
        return false;
      }
    }

    // For all blocks except pageLink, check standard props
    if (block.type !== "pageLink") {
      for (const prop of standardProps) {
        if (block.props[prop] === undefined) {
          console.error(`Block is missing standard property: ${prop}`);
          return false;
        }
      }
    }

    // Validate content format
    if (block.content.length === 0) {
      console.error("Block has empty content array");
      return false;
    }

    // Check content items
    return block.content.every((contentItem) => {
      if (
        !contentItem ||
        typeof contentItem.type !== "string" ||
        typeof contentItem.text !== "string" ||
        typeof contentItem.styles !== "object"
      ) {
        console.error("Invalid content item structure", contentItem);
        return false;
      }
      return true;
    });
  });
};

/**
 * Process the response from Gemini and validate format
 * @param {Array|Object} parsedResponse - The response from Gemini (blocks array or object with createNewPage)
 * @param {string} transcription - The original transcription
 * @returns {Object} - The processed result
 */
const processGeminiResponse = (parsedResponse, transcription) => {
  // Handle new page creation format
  if (
    typeof parsedResponse === "object" &&
    !Array.isArray(parsedResponse) &&
    parsedResponse.createNewPage === true
  ) {
    // This is a create new page request
    if (
      !Array.isArray(parsedResponse.blocks) ||
      parsedResponse.blocks.length === 0
    ) {
      console.error("Invalid new page format - blocks missing or empty");
      return {
        success: false,
        error: "Invalid new page format",
        rawText: transcription,
      };
    }

    const blocks = parsedResponse.blocks;

    // Validate blocks
    if (!validateBlockNoteFormat(blocks)) {
      console.error("Invalid blocks in new page request");
      return {
        success: false,
        error: "Invalid block format in new page request",
        rawText: transcription,
      };
    }

    // Check if first block is pageLink
    if (blocks[0].type !== "pageLink") {
      console.error("New page request must start with pageLink block");
      return {
        success: false,
        error: "Invalid new page format - missing pageLink",
        rawText: transcription,
      };
    }

    // Get page title and icon
    const pageTitle = blocks[0].props.pageTitle || "New Page";
    const pageIcon = blocks[0].props.pageIcon || "📄";

    console.log("Valid new page request detected with title:", pageTitle);

    // Return success with createNewPage flag and all the blocks
    return {
      success: true,
      createNewPage: true,
      pageTitle: pageTitle,
      pageIcon: pageIcon,
      blocks: blocks,
      rawText: transcription,
    };
  }

  // Regular blocks array processing
  if (!Array.isArray(parsedResponse)) {
    console.error("Response is not an array or new page format");
    return {
      success: false,
      error: "Invalid response format",
      rawText: transcription,
    };
  }

  // Check if the format matches BlockNote's requirements
  if (!validateBlockNoteFormat(parsedResponse)) {
    console.warn(
      "Response doesn't match BlockNote format, would need conversion"
    );
    console.log(
      "Sample block structure:",
      JSON.stringify(parsedResponse[0], null, 2)
    );

    // Return error with raw text for fallback
    return {
      success: false,
      error: "Invalid block format",
      rawText: transcription,
    };
  }

  // All good!
  return {
    success: true,
    blocks: parsedResponse,
    rawText: transcription,
  };
};

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
 * Process a voice command through Gemini API to identify action and target blocks
 * @param {string} voiceCommand - The raw text transcription of the voice command
 * @param {Array} editorContent - The current editor content with blocks
 * @returns {Object} - Response containing action, targetBlockIds, and other necessary data
 */
export const processVoiceCommandWithGemini = async (
  voiceCommand,
  editorContent
) => {
  try {
    // Validate input
    if (!voiceCommand || typeof voiceCommand !== "string") {
      console.error("Invalid voice command input");
      return {
        success: false,
        action: "CLARIFICATION",
        message: "Sorry, I couldn't understand your command.",
      };
    }

    // Perform a quick pre-check for command words before calling the API
    const commandWords = [
      // Existing command words
      "delete",
      "remove",
      "create",
      "make",
      "new page",
      "erase",
      // Text formatting command words
      "bold",
      "italic",
      "underline",
      "formatting",
      // Selection command words
      "select",
      // Block transformation words
      "convert",
      "change",
      // Undo/redo commands
      "undo",
      "redo",
      // Content modification
      "replace",
      "substitute",
      "append",
      "prepend",
      // Color commands
      "color",
      "blue",
      "red",
      "green",
      // Block type commands
      "heading",
      "paragraph",
      "list",
      "bullet",
      "numbered",
      "todo",
      "quote",
      "code",
      // Target specifiers
      "all",
      "every",
      "each",
    ];
    const isLikelyCommand = commandWords.some((word) =>
      voiceCommand.toLowerCase().includes(word)
    );

    // If no command words are present, treat it as simple text input
    if (!isLikelyCommand) {
      console.log("No command words detected - treating as simple text input");
      return {
        action: "INSERT_CONTENT",
        content: voiceCommand,
        success: true,
        rawCommand: voiceCommand,
      };
    }

    console.log("Processing voice command with Gemini:", voiceCommand);

    // Pre-process the editor content to add block indices for easier reference
    const processedContent = editorContent
      ? editorContent.map((block, index) => ({
          ...block,
          _index: index, // Add index for reference in the prompt
        }))
      : [];

    // Log content summary for debugging
    console.log(`Editor has ${processedContent.length} blocks to analyze`);

    const prompt = {
      contents: [
        {
          role: "user", // First user message acts as system instruction
          parts: [
            {
              text: `You are an AI assistant specialized in parsing voice commands for a block-based note editor called VoiceNotion. Your task is to analyze a voice command and the current editor content, then return a structured JSON response with the appropriate action to take.

AVAILABLE COMMAND TYPES:

1. DELETE_BLOCK - Delete one or more blocks
2. INSERT_CONTENT - Insert new text content as blocks
3. CREATE_PAGE - Create a new page
4. CLARIFICATION - When the command is unclear
5. APPLY_FORMATTING - Apply formatting to selected text or blocks
6. SELECT_TEXT - Select text or blocks
7. REPLACE_TEXT - Replace text or content in blocks
8. MODIFY_BLOCK - Change block type, properties, or color
9. UNDO - Undo previous actions
10. REDO - Redo previously undone actions

For each command type, return a different JSON structure:

For DELETE_BLOCK:
{
  "action": "DELETE_BLOCK",
  "targetBlockIds": ["block-id-1", "block-id-2"],
  "success": true
}

For INSERT_CONTENT:
{
  "action": "INSERT_CONTENT",
  "content": "raw text to insert",
  "success": true
}

For CREATE_PAGE:
{
  "action": "CREATE_PAGE",
  "pageTitle": "New Page Title",
  "pageContent": "Initial content for the page",
  "success": true
}

For APPLY_FORMATTING:
{
  "action": "APPLY_FORMATTING",
  "formattingType": "BOLD|ITALIC|UNDERLINE|REMOVE_FORMATTING",
  "targetText": "text to format",
  "targetBlockIds": ["block-id-1"], // If applying to entire blocks
  "selectionRange": { // If applying to specific text range
    "blockId": "block-id",
    "startOffset": 5,
    "endOffset": 10
  },
  "success": true
}

For SELECT_TEXT:
{
  "action": "SELECT_TEXT",
  "selectionType": "BLOCK|TEXT|RANGE|ALL",
  "targetText": "text to select",
  "targetBlockIds": ["block-id-1"], // If selecting entire blocks
  "selectionRange": { // If selecting specific text range
    "blockId": "block-id",
    "startOffset": 5,
    "endOffset": 10
  },
  "success": true
}

For REPLACE_TEXT:
{
  "action": "REPLACE_TEXT",
  "findText": "text to replace",
  "replaceWith": "replacement text",
  "targetBlockIds": ["block-id-1"], // Optional, if replacing in specific blocks
  "selectionRange": { // Optional, if replacing in specific range
    "blockId": "block-id",
    "startOffset": 5,
    "endOffset": 10
  },
  "success": true
}

For MODIFY_BLOCK:
{
  "action": "MODIFY_BLOCK",
  "modificationType": "CHANGE_TYPE|CHANGE_HEADING_LEVEL|CONVERT_TO_LIST|CHANGE_COLOR|CHANGE_TEXT_COLOR",
  "targetBlockIds": ["block-id-1"], // Optional, specific blocks to modify
  "targetBlockType": "heading|paragraph", // Optional, to target all blocks of a type (e.g., "all headings")
  "targetPosition": "last|first", // Optional, to target the last or first block of a certain type
  "newType": "heading|paragraph|bulletListItem|numberedListItem|checkListItem|quote|code",
  "headingLevel": 1, // Only for heading blocks, 1-6
  "listType": "bullet|numbered|todo", // Only for list conversions
  "textColor": "blue|red|green|yellow|purple|default", // For color changes
  "newColor": "blue|red|green|yellow|purple|default", // Alternative name for color
  "formatType": "bold|italic|underline", // For applying formatting to blocks
  "success": true
}

For UNDO:
{
  "action": "UNDO",
  "steps": 1, // Number of steps to undo
  "success": true
}

For REDO:
{
  "action": "REDO",
  "steps": 1, // Number of steps to redo
  "success": true
}

For CLARIFICATION:
{
  "action": "CLARIFICATION",
  "message": "I'm not sure what you want to do. Could you be more specific?",
  "success": false
}

SPECIAL HANDLING FOR MULTI-BLOCK OPERATIONS:

1. When the command refers to "all headings", set targetBlockType: "heading" instead of listing individual block IDs
2. When the command refers to "all paragraphs", set targetBlockType: "paragraph"
3. When the command refers to "all blocks" or "everything", include all block IDs in targetBlockIds

HANDLING CURRENT SELECTION:

IMPORTANT: When the command refers to ANY of these phrases, ALWAYS set "useCurrentSelection": true
- "this block"
- "current block"
- "selected block"
- "the block"
- "this paragraph"
- "current paragraph"
- "selected paragraph"
- "the paragraph"
- "this heading"
- "current heading"
- "selected heading"
- "the heading"
- "this"
- "here"
- "convert this"
- "delete this"
- "change this"

Examples:
- "convert this to heading" → set useCurrentSelection: true
- "delete this block" → set useCurrentSelection: true
- "make this bold" → set useCurrentSelection: true
- "change this paragraph to a heading" → set useCurrentSelection: true

For text selection within the current block:
- "this text"
- "selected text"
- "current selection"
Set both "useCurrentSelection": true AND "selectionType": "TEXT"

HANDLING POSITIONAL REFERENCES:

1. When the command refers to "last paragraph", "last block", "latest block", etc., set:
   "targetPosition": "last"
   If it specifies a block type like "last heading", also set:
   "targetBlockType": "heading"

2. When the command refers to "first paragraph", "first block", etc., set:
   "targetPosition": "first"
   If it specifies a block type, also set the appropriate targetBlockType.

CONTEXT RULES:
1. If the command is to delete blocks, you must specify at least one valid block ID from the editor content.
2. For references like "first paragraph", "last heading", etc., use the block IDs from the content.
3. For text selection or formatting, try to identify the specific text or blocks being referenced.
4. For unclear commands, use the CLARIFICATION action with a helpful message.
5. If the command is to insert simple text without specific formatting, use INSERT_CONTENT.

BLOCK TYPE CONVERSION MAPPING:
- "bullet list" or "bulleted list" → "bulletListItem"
- "numbered list" or "ordered list" → "numberedListItem"
- "todo list" or "checklist" or "task list" → "checkListItem"
- "quote" or "quotation" → "quote"
- "code block" or "code" → "code"
- "paragraph" → "paragraph"
- "heading" → "heading" (with appropriate level)

COLOR MAPPING:
Map color names to their standard values:
- blue, red, green, yellow, purple, black, white, gray/grey, orange, pink, brown, cyan, magenta, teal, lime, violet, indigo, maroon, navy, olive, silver, gold

Return only the JSON object with no preamble or explanation.`,
            },
          ],
        },
        {
          role: "user", // Second user message with the actual content to process
          parts: [
            {
              text: `Voice Command: "${voiceCommand}"
              
Editor Content: ${JSON.stringify(processedContent)}`,
            },
          ],
        },
      ],
    };

    // Make the API request
    console.log(`Calling Gemini API for voice command processing`);
    try {
      const response = await axios.post(
        `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
        {
          contents: prompt.contents,
          generationConfig: {
            ...GEMINI_CONFIG,
            temperature: 0.0, // Keep deterministic for command interpretation
          },
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Extract the response text from Gemini
      const responseText = response.data.candidates[0]?.content?.parts[0]?.text;
      console.log("Received response from Gemini API for voice command");

      if (!responseText) {
        console.error("Empty response from Gemini API");
        // Default to INSERT_CONTENT for empty responses
        return {
          success: true,
          action: "INSERT_CONTENT",
          content: voiceCommand,
          rawCommand: voiceCommand,
        };
      }

      // Try to parse the response as JSON
      try {
        // Clean up the response if needed (similar to other function)
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
          console.log("Cleaned JSON text from code blocks");
        }

        // Check for any remaining non-JSON characters
        const nonJsonMatch = jsonText.match(/^[^{\[]+([\[{].*)/);
        if (nonJsonMatch && nonJsonMatch[1]) {
          console.log("Found non-JSON prefix, cleaning...");
          jsonText = nonJsonMatch[1];
        }

        console.log("Parsing voice command response as JSON");
        const parsedResponse = JSON.parse(jsonText);

        // Validate response has required fields
        if (!parsedResponse.action) {
          console.error("Invalid response format - missing action field");
          // Default to INSERT_CONTENT for invalid responses
          return {
            success: true,
            action: "INSERT_CONTENT",
            content: voiceCommand,
            rawCommand: voiceCommand,
          };
        }

        // For DELETE_BLOCK actions, verify we have target blocks
        if (parsedResponse.action === "DELETE_BLOCK") {
          if (
            !Array.isArray(parsedResponse.targetBlockIds) ||
            parsedResponse.targetBlockIds.length === 0
          ) {
            console.warn(
              "DELETE_BLOCK action received with empty targetBlockIds"
            );
            return {
              success: false,
              action: "CLARIFICATION",
              message:
                "I couldn't determine which block to delete. Please be more specific.",
              rawCommand: voiceCommand,
            };
          }
        }

        // Return the parsed response
        return {
          ...parsedResponse,
          rawCommand: voiceCommand, // Include original command for reference
          rawTranscription: voiceCommand, // For backward compatibility
        };
      } catch (parseError) {
        console.error("Failed to parse Gemini response as JSON:", parseError);
        // Default to INSERT_CONTENT for JSON parse errors
        return {
          success: true,
          action: "INSERT_CONTENT",
          content: voiceCommand,
          rawCommand: voiceCommand,
        };
      }
    } catch (error) {
      console.error("Error calling Gemini API for voice command:", error);
      // Default to INSERT_CONTENT for API errors
      return {
        success: true,
        action: "INSERT_CONTENT",
        content: voiceCommand,
        rawCommand: voiceCommand,
      };
    }
  } catch (error) {
    console.error("Unexpected error in voice command processing:", error);
    // Default to INSERT_CONTENT for unexpected errors
    return {
      success: true,
      action: "INSERT_CONTENT",
      content: voiceCommand,
      rawCommand: voiceCommand,
    };
  }
};

/**
 * Process a user question through Gemini API and get an answer in BlockNote-compatible format
 * @param {string} userQuestion - The user's question to answer
 * @returns {Object} - Response containing BlockNote-compatible blocks as answer
 */
export const askGeminiAI = async (userQuestion) => {
  try {
    // Validate input
    if (!userQuestion || typeof userQuestion !== "string") {
      console.error("Invalid question input");
      return {
        success: false,
        message: "Sorry, I couldn't understand your question.",
      };
    }

    console.log("Processing AI question with Gemini:", userQuestion);

    const prompt = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `You are an AI assistant answering user questions. Format your response as BlockNote-compatible blocks that can be directly inserted into the editor.

Your response should be a JSON array of blocks following this structure:
[
  {
    "type": "paragraph|heading|bulletListItem|numberedListItem|quote|code",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left",
      "level": 1 // Only for headings (1-3)
    },
    "content": [
      {
        "type": "text",
        "text": "Your content here",
        "styles": {} // Can include "bold": true, "italic": true, "underline": true
      }
    ],
    "children": []
  }
]

For example, a simple answer might look like:
[
  {
    "type": "heading",
    "props": {
      "textColor": "default",
      "backgroundColor": "default",
      "textAlignment": "left",
      "level": 2
    },
    "content": [
      {
        "type": "text",
        "text": "Answer to your question",
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
        "text": "Here is the detailed explanation...",
        "styles": {}
      }
    ],
    "children": []
  }
]

User Question: ${userQuestion}

Respond with ONLY the JSON array of blocks. Do not include any other text or explanation outside the JSON array.`,
            },
          ],
        },
      ],
      generationConfig: {
        ...GEMINI_CONFIG,
        temperature: 0.2, // Slightly higher temperature for more natural answers
        maxOutputTokens: 2048, // Allow longer answers
      },
    };

    const apiUrl = `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`;
    const response = await axios.post(apiUrl, prompt);

    // Extract the response text
    const responseText = response.data.candidates[0].content.parts[0].text;

    // Try to parse the JSON response
    try {
      // Extract JSON array from the response if it contains other text
      const jsonMatch = responseText.match(/\[\s*\{.*\}\s*\]/s);
      const jsonText = jsonMatch ? jsonMatch[0] : responseText;

      const blocks = JSON.parse(jsonText);

      // Validate the blocks format
      if (!validateBlockNoteFormat(blocks)) {
        console.error("Invalid block format in AI answer");
        return {
          success: false,
          message: "The AI response couldn't be formatted correctly.",
          rawText: responseText,
        };
      }

      return {
        success: true,
        action: "INSERT_AI_ANSWER",
        blocks: blocks,
        rawText: responseText,
      };
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      return {
        success: false,
        message: "Failed to parse the AI response.",
        rawText: responseText,
      };
    }
  } catch (error) {
    console.error("Error asking Gemini AI:", error);

    // Handle specific API errors
    if (error?.response?.status === 404) {
      return {
        success: false,
        message:
          "Model not found - please check that the Gemini API is enabled in your Google Cloud Console",
      };
    }

    if (error?.response?.status === 403) {
      return {
        success: false,
        message: "API permission error - check API key permissions",
      };
    }

    return {
      success: false,
      message: `API error: ${error.message || "Unknown error"}`,
    };
  }
};

export default {
  processTranscriptionWithGemini,
  validateBlockNoteFormat,
  processGeminiResponse,
  processVoiceCommandWithGemini,
  askGeminiAI,
};
