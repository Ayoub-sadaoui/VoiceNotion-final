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
              text: `You are a specialized JSON formatter that transforms transcribed speech into BlockNote.js editor blocks. First analyze the context of the transcription, then output structured blocks that match BlockNote's exact JSON format.

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

CONTEXTUAL ANALYSIS INSTRUCTIONS:
1. Analyze the transcription to determine the context and purpose (e.g., notes, list, meeting minutes)
2. Identify if there are headings, list items, tasks, or quotes implied in the text
3. Separate multiple ideas/points into appropriate blocks
4. Choose the most appropriate block type for each part of the content
5. Structure the output as blocks that best represent the intended content
6. Detect if the user wants to create a new page (see NEW PAGE DETECTION below)

SUPPORTED BLOCK TYPES:
- "paragraph" - for general text content (default for most content)
- "heading" - for titles and section headers (props must include "level": 1, 2, or 3)
- "bulletListItem" - for unordered list items (implied by phrases like "bullet points:", "items:", etc.)
- "numberedListItem" - for ordered list items (implied by "1.", "2.", "steps:", etc.)
- "checkListItem" - for tasks or to-do items (props must include "checked": false, implied by "to-do:", "tasks:", "need to", etc.)
- "quote" - for quoted speech or referenced content (implied by quotation marks or "quote:")
- "code" - for code snippets or technical content (implied by technical terms or code-like formatting)
- "pageLink" - for linking to a new page that will be created

NEW PAGE DETECTION:
If the user mentions any of these phrases, they want to create a new page:
- "create a new page"
- "add a new page"
- "make a new page"
- "start a new page"
- "create page"

When this is detected, output one pageLink block followed by content blocks:
1. First block should be of type "pageLink" with these properties:
   {
     "type": "pageLink",
     "props": {
       "pageId": "new_page", // This is a placeholder, will be replaced by the app
       "pageTitle": "Title of the new page", // Extract this from user's request
       "pageIcon": "📄" // Default icon
     },
     "content": [
       {
         "type": "text",
         "text": "Title of the new page",
         "styles": {}
       }
     ],
     "children": []
   }
2. Following blocks should contain the content the user wants on the new page.
3. Include a special property "createNewPage": true at the top level of your JSON response.

RESPONSE REQUIREMENTS:
1. ALWAYS output a valid JSON array of blocks with the EXACT structure shown above
2. DO NOT include explanations or markdown syntax in your response
3. The JSON must be properly formatted with no extra characters
4. For new page requests, the response should be a JSON object with "createNewPage": true and "blocks": [...array of blocks...]

EXAMPLES OF CONTEXT DETECTION:

Example 1 - Meeting notes with topic and points:
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

export default {
  processTranscriptionWithGemini,
  validateBlockNoteFormat,
  processGeminiResponse,
};
