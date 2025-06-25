import axios from "axios";
import { GEMINI_API_KEY, GEMINI_API_URL, GEMINI_CONFIG } from "./config";
import { validateBlockNoteFormat } from "./utils";
import imageGenerationService from "../imageGenerationService";

/**
 * Process a user question through Gemini API and get an answer in BlockNote-compatible format
 * @param {string} userQuestion - The user's question to answer
 * @param {Array} pageContent - The current page content to provide as context
 * @returns {Object} - Response containing BlockNote-compatible blocks as answer
 */
export const askGeminiAI = async (userQuestion, pageContent = []) => {
  console.log("🎯 askGeminiAI called with question:", userQuestion);

  // Increase token limits for Gemini API calls
  const MAX_PROMPT_LENGTH = 1000; // Increase token limit for user input
  const MAX_RESPONSE_LENGTH = 2000; // Increase token limit for AI response

  // Validate input length
  if (userQuestion.length > MAX_PROMPT_LENGTH) {
    console.error("User question exceeds maximum allowed length.");
    return {
      success: false,
      message: "Your question is too long. Please shorten it.",
    };
  }

  try {
    // Check if this is an image generation request
    console.log("Checking if image generation request...");

    let isImageRequest = false;
    let imagePrompt = null;

    try {
      isImageRequest =
        imageGenerationService.isImageGenerationRequest(userQuestion);
      console.log("Is image generation request:", isImageRequest);

      if (isImageRequest) {
        imagePrompt = imageGenerationService.extractImagePrompt(userQuestion);
        console.log("Extracted prompt:", imagePrompt);
      }
    } catch (importError) {
      console.error("❌ Error with imageGenerationService:", importError);
      // Fall through to normal processing if there's an import error
    }

    if (isImageRequest) {
      console.log("✅ Detected image generation request");

      if (!imagePrompt) {
        console.log("❌ No prompt extracted");
        return {
          success: false,
          message: "I couldn't understand what image you want me to generate.",
        };
      }

      try {
        console.log("Generating image with prompt:", imagePrompt);
        const imageResult = await imageGenerationService.generateImage(
          imagePrompt
        );

        if (imageResult.success) {
          // Create blocks for the image generation result
          const blocks = [
            {
              type: "heading",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
                level: 3,
              },
              content: [
                {
                  type: "text",
                  text: "🎨 Generated Image",
                  styles: {
                    bold: true,
                  },
                },
              ],
              children: [],
            },
            imageGenerationService.createImageBlock(
              imageResult.imageUrl,
              imageResult.prompt
            ),
          ];

          return {
            success: true,
            action: "INSERT_AI_IMAGE",
            blocks: blocks,
            rawCommand: userQuestion,
          };
        } else {
          return {
            success: false,
            message: `Failed to generate image: ${imageResult.error}`,
          };
        }
      } catch (error) {
        console.error("Error generating image:", error);
        return {
          success: false,
          message: "Sorry, I had trouble generating that image.",
        };
      }
    }

    // Extract text content from page blocks for context
    let pageTextContent = "";
    if (Array.isArray(pageContent) && pageContent.length > 0) {
      // Function to extract text from a block and its children recursively
      const extractTextFromBlock = (block) => {
        let text = "";

        // Extract text from content array
        if (block.content && Array.isArray(block.content)) {
          block.content.forEach((item) => {
            if (item.type === "text" && item.text) {
              text += item.text + " ";
            }
          });
        }

        // Extract text from children blocks recursively
        if (block.children && Array.isArray(block.children)) {
          block.children.forEach((child) => {
            text += extractTextFromBlock(child) + " ";
          });
        }

        return text;
      };

      // Process all blocks
      pageTextContent = pageContent
        .map((block) => extractTextFromBlock(block))
        .join("\n");
      console.log(
        "Providing page context to AI:",
        pageTextContent.substring(0, 100) + "..."
      );
    }

    // Detect specific AI operations
    const isSummarizeRequest =
      /^(?:summarize|summary|summarization|sum up|recap)\b/i.test(userQuestion);
    const isAutocompleteRequest =
      /^(?:complete|autocomplete|continue|finish)\b/i.test(userQuestion);
    const isRewriteRequest = /^(?:rewrite|rephrase|reword|paraphrase)\b/i.test(
      userQuestion
    );

    // Build the appropriate prompt based on the request type
    let promptText = "";

    if (isSummarizeRequest) {
      promptText = `You are an AI assistant that summarizes content. Format your response as BlockNote-compatible blocks that can be directly inserted into the editor.

Your task is to summarize the following content:
${pageTextContent}

Create a concise summary using the BlockNote format described below. Focus on the key points and main ideas.`;
    } else if (isAutocompleteRequest) {
      promptText = `You are an AI assistant that completes or continues text. Format your response as BlockNote-compatible blocks that can be directly inserted into the editor.

Here is the content to continue or complete:
${pageTextContent}

Continue this content in a natural way that matches the style, tone, and context. Use the BlockNote format described below.`;
    } else if (isRewriteRequest) {
      promptText = `You are an AI assistant that rewrites or rephrases content. Format your response as BlockNote-compatible blocks that can be directly inserted into the editor.

Here is the content to rewrite:
${pageTextContent}

Rewrite this content while preserving its meaning, but improving clarity, flow, and style. Use the BlockNote format described below.`;
    } else {
      // General question answering with context
      promptText = `You are an AI assistant answering user questions. Format your response as BlockNote-compatible blocks that can be directly inserted into the editor.

User Question: ${userQuestion}

${
  pageTextContent
    ? `Context from the current page:\n${pageTextContent}\n\nAnswer the question based on this context when relevant.`
    : ""
}`;
    }

    // Add BlockNote format instructions
    promptText += `

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

Respond with ONLY the JSON array of blocks. Do not include any other text or explanation outside the JSON array.`;

    const prompt = {
      contents: [
        {
          role: "user",
          parts: [
            {
              text: promptText,
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

      // Create an appropriate action type based on the request
      let actionType = "INSERT_AI_ANSWER";
      if (isSummarizeRequest) {
        actionType = "INSERT_AI_SUMMARY";
      } else if (isAutocompleteRequest) {
        actionType = "INSERT_AI_COMPLETION";
      } else if (isRewriteRequest) {
        actionType = "INSERT_AI_REWRITE";
      }

      return {
        success: true,
        action: actionType,
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
