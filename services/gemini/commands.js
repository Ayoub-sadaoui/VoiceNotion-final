import axios from "axios";
import { GEMINI_API_KEY, GEMINI_API_URL, GEMINI_CONFIG } from "./config";
import { askGeminiAI } from "./ai";

/**
 * Fast detection for simple commands that don't require full content analysis
 * This significantly improves performance for common commands
 * @param {string} voiceCommand - The voice command to analyze
 * @returns {Object|null} - Command object if detected, null otherwise
 */
const detectSimpleCommands = (voiceCommand) => {
  const command = voiceCommand.toLowerCase().trim();

  // Delete all patterns
  const deleteAllPatterns = [
    /^(?:delete|remove|clear|erase)\s+(?:all|everything)(?:\s+(?:content|blocks|text))?$/i,
    /^(?:clear|delete)\s+(?:the\s+)?(?:entire\s+)?(?:page|note|document)$/i,
    /^(?:delete|remove)\s+(?:all\s+)?(?:the\s+)?(?:content|blocks|text)$/i,
    /^clear\s+(?:all|everything)$/i,
  ];

  // Undo patterns
  const undoPatterns = [
    /^undo$/i,
    /^undo\s+(?:that|last|previous)$/i,
    /^ctrl\s*z$/i,
  ];

  // Redo patterns
  const redoPatterns = [/^redo$/i, /^redo\s+(?:that|last)$/i, /^ctrl\s*y$/i];

  // Create page patterns
  const createPagePatterns = [
    /^create\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^(?:new|add)\s+page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^start\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^make\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
  ];

  // Check delete all patterns
  for (const pattern of deleteAllPatterns) {
    if (pattern.test(command)) {
      return { action: "DELETE_ALL" };
    }
  }

  // Check undo patterns
  for (const pattern of undoPatterns) {
    if (pattern.test(command)) {
      return { action: "UNDO" };
    }
  }

  // Check redo patterns
  for (const pattern of redoPatterns) {
    if (pattern.test(command)) {
      return { action: "REDO" };
    }
  }

  // Check create page patterns
  for (const pattern of createPagePatterns) {
    const match = command.match(pattern);
    if (match) {
      const pageTitle = match[1] ? match[1].trim() : "New Page";
      return {
        action: "CREATE_PAGE",
        pageTitle: pageTitle,
        pageContent: [],
      };
    }
  }

  return null;
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

    console.log("Processing voice command:", voiceCommand);

    // First check if this is an image generation request
    try {
      const imageGenerationService =
        require("../imageGenerationService").default;
      if (imageGenerationService.isImageGenerationRequest(voiceCommand)) {
        console.log("✅ Detected image generation command");
        const imagePrompt =
          imageGenerationService.extractImagePrompt(voiceCommand);
        return {
          success: true,
          action: "GENERATE_IMAGE",
          prompt: imagePrompt,
          rawCommand: voiceCommand,
        };
      }
    } catch (error) {
      console.error("❌ Error checking for image generation:", error);
      // Continue with normal processing if there's an error
    }

    // Fast-path optimization for common commands that don't need full content analysis
    const simplifiedCommands = detectSimpleCommands(voiceCommand);
    if (simplifiedCommands) {
      console.log(
        "✅ Using fast-path for simple command:",
        simplifiedCommands.action
      );
      return {
        success: true,
        rawTranscription: voiceCommand,
        ...simplifiedCommands,
      };
    }

    // Special handling for AI answer deletion commands
    const aiAnswerDeletePatterns = [
      /delete\s+(?:the|this)?\s*ai\s+answer/i,
      /remove\s+(?:the|this)?\s*ai\s+answer/i,
      /clear\s+(?:the|this)?\s*ai\s+answer/i,
      /erase\s+(?:the|this)?\s*ai\s+answer/i,
    ];

    // Check if the command is specifically about deleting an AI answer
    const isAiAnswerDeleteCommand = aiAnswerDeletePatterns.some((pattern) =>
      pattern.test(voiceCommand)
    );

    if (isAiAnswerDeleteCommand) {
      console.log("Detected AI answer deletion command");

      // Find AI Answer heading blocks and their content
      const aiAnswerBlocks = [];
      let foundAiAnswer = false;
      let collectingAiAnswerBlocks = false;

      // Look through all blocks to find AI Answer sections
      editorContent.forEach((block, index) => {
        // Check if this is an AI Answer heading
        if (
          block.type === "heading" &&
          block.content &&
          block.content.some(
            (item) =>
              item.type === "text" &&
              item.text &&
              item.text.includes("AI Answer")
          )
        ) {
          foundAiAnswer = true;
          collectingAiAnswerBlocks = true;
          aiAnswerBlocks.push(block.id);
        }
        // If we're collecting AI answer blocks, add this block
        else if (collectingAiAnswerBlocks) {
          // If we encounter another heading, stop collecting
          if (block.type === "heading") {
            collectingAiAnswerBlocks = false;
          } else {
            aiAnswerBlocks.push(block.id);
          }
        }
      });

      if (foundAiAnswer && aiAnswerBlocks.length > 0) {
        console.log(
          `Found ${aiAnswerBlocks.length} AI answer blocks to delete:`,
          aiAnswerBlocks
        );
        return {
          success: true,
          action: "DELETE_BLOCK",
          targetBlockIds: aiAnswerBlocks,
          rawCommand: voiceCommand,
          rawTranscription: voiceCommand,
        };
      } else {
        console.log("No AI answer blocks found to delete");
        return {
          success: false,
          action: "CLARIFICATION",
          message: "I couldn't find any AI answer blocks to delete.",
          rawCommand: voiceCommand,
        };
      }
    }

    // Enhanced block deletion patterns
    const deletePatterns = {
      lastBlock: [
        /delete\s+(?:the)?\s*last\s+block/i,
        /remove\s+(?:the)?\s*last\s+block/i,
        /erase\s+(?:the)?\s*last\s+block/i,
      ],
      lastParagraph: [
        /delete\s+(?:the)?\s*last\s+paragraph/i,
        /remove\s+(?:the)?\s*last\s+paragraph/i,
        /erase\s+(?:the)?\s*last\s+paragraph/i,
      ],
      firstBlock: [
        /delete\s+(?:the)?\s*first\s+block/i,
        /remove\s+(?:the)?\s*first\s+block/i,
        /erase\s+(?:the)?\s*first\s+block/i,
      ],
      firstParagraph: [
        /delete\s+(?:the)?\s*first\s+paragraph/i,
        /remove\s+(?:the)?\s*first\s+paragraph/i,
        /erase\s+(?:the)?\s*first\s+paragraph/i,
      ],
      firstHeading: [
        /delete\s+(?:the)?\s*first\s+heading/i,
        /remove\s+(?:the)?\s*first\s+heading/i,
        /erase\s+(?:the)?\s*first\s+heading/i,
      ],
      lastHeading: [
        /delete\s+(?:the)?\s*last\s+heading/i,
        /remove\s+(?:the)?\s*last\s+heading/i,
        /erase\s+(?:the)?\s*last\s+heading/i,
      ],
    };

    // Enhanced block finding utility
    const findBlocksToDelete = (editorContent, deleteStrategy) => {
      console.log("[Block Deletion] Editor content structure:", {
        blockCount: editorContent?.length,
        firstBlockType: editorContent?.[0]?.type,
        lastBlockType: editorContent?.[editorContent?.length - 1]?.type,
      });
      console.log("[Block Deletion] Delete strategy:", deleteStrategy);
      console.log(
        `[Block Deletion] Finding blocks with strategy: ${deleteStrategy}`
      );

      // Validate input
      if (!Array.isArray(editorContent) || editorContent.length === 0) {
        console.warn("[Block Deletion] No editor content available");
        return [];
      }

      // Detailed block type logging
      const blockTypeCounts = editorContent.reduce((counts, block) => {
        counts[block.type] = (counts[block.type] || 0) + 1;
        return counts;
      }, {});
      console.log("[Block Deletion] Block type distribution:", blockTypeCounts);

      // Enhanced block finding logic
      switch (deleteStrategy) {
        case "LAST_BLOCK":
          const lastBlock = editorContent[editorContent.length - 1];
          console.log("[Block Deletion] Last block details:", {
            type: lastBlock?.type,
            id: lastBlock?.id,
            content: lastBlock?.content?.[0]?.text,
          });
          return lastBlock?.id ? [lastBlock.id] : [];

        case "LAST_PARAGRAPH":
          // Traverse backwards until we find a paragraph with an id
          for (let i = editorContent.length - 1; i >= 0; i--) {
            const block = editorContent[i];
            if (block.type === "paragraph" && block.id) {
              return [block.id];
            }
          }
          return [];

        case "FIRST_BLOCK":
          const firstBlock = editorContent[0];
          console.log("[Block Deletion] First block details:", {
            type: firstBlock?.type,
            id: firstBlock?.id,
            content: firstBlock?.content?.[0]?.text,
          });
          return firstBlock?.id ? [firstBlock.id] : [];

        case "FIRST_PARAGRAPH":
          const firstParagraphBlock = editorContent.find(
            (block) => block.type === "paragraph"
          );
          console.log("[Block Deletion] First paragraph details:", {
            type: firstParagraphBlock?.type,
            id: firstParagraphBlock?.id,
            content: firstParagraphBlock?.content?.[0]?.text,
          });
          return firstParagraphBlock?.id ? [firstParagraphBlock.id] : [];

        case "FIRST_HEADING":
          const firstHeadingBlock = editorContent.find(
            (block) => block.type === "heading"
          );
          console.log("[Block Deletion] First heading details:", {
            type: firstHeadingBlock?.type,
            id: firstHeadingBlock?.id,
            level: firstHeadingBlock?.props?.level,
            content: firstHeadingBlock?.content?.[0]?.text,
          });
          return firstHeadingBlock?.id ? [firstHeadingBlock.id] : [];

        case "LAST_HEADING":
          const headingBlocks = editorContent.filter(
            (block) => block.type === "heading"
          );
          const lastHeading = headingBlocks[headingBlocks.length - 1];
          console.log("[Block Deletion] Last heading details:", {
            type: lastHeading?.type,
            id: lastHeading?.id,
            level: lastHeading?.props?.level,
            content: lastHeading?.content?.[0]?.text,
          });
          return lastHeading?.id ? [lastHeading.id] : [];

        default:
          console.warn(
            `[Block Deletion] Unknown deletion strategy: ${deleteStrategy}`
          );
          return [];
      }
    };

    // Enhanced block deletion detection
    const deleteStrategies = [
      { patterns: deletePatterns.lastBlock, strategy: "LAST_BLOCK" },
      { patterns: deletePatterns.lastParagraph, strategy: "LAST_PARAGRAPH" },
      { patterns: deletePatterns.firstBlock, strategy: "FIRST_BLOCK" },
      { patterns: deletePatterns.firstParagraph, strategy: "FIRST_PARAGRAPH" },
      { patterns: deletePatterns.firstHeading, strategy: "FIRST_HEADING" },
      { patterns: deletePatterns.lastHeading, strategy: "LAST_HEADING" },
    ];

    // Check for block deletion commands
    for (const { patterns, strategy } of deleteStrategies) {
      if (patterns.some((pattern) => pattern.test(voiceCommand))) {
        console.log(`[Block Deletion] Detected ${strategy} deletion command`);

        const targetBlockIds = findBlocksToDelete(editorContent, strategy);

        if (targetBlockIds.length > 0) {
          console.log(
            `[Block Deletion] Found ${targetBlockIds.length} block(s) to delete:`,
            targetBlockIds
          );
          return {
            success: true,
            action: "DELETE_BLOCK",
            targetBlockIds: targetBlockIds,
            rawCommand: voiceCommand,
            rawTranscription: voiceCommand,
          };
        } else {
          console.warn(
            `[Block Deletion] No blocks found for strategy: ${strategy}`
          );
          return {
            success: false,
            action: "CLARIFICATION",
            message: `I couldn't find any blocks to delete for the command: ${voiceCommand}`,
            rawCommand: voiceCommand,
          };
        }
      }
    }

    // Special handling for "delete paragraph containing X" commands
    const deleteParagraphWithContentPatterns = [
      /delete\s+(?:the)?\s*paragraph\s+(?:that|which|with|containing)\s+(?:has|contains|says|saying|with|containing)\s+(.+)/i,
      /remove\s+(?:the)?\s*paragraph\s+(?:that|which|with|containing)\s+(?:has|contains|says|saying|with|containing)\s+(.+)/i,
      /erase\s+(?:the)?\s*paragraph\s+(?:that|which|with|containing)\s+(?:has|contains|says|saying|with|containing)\s+(.+)/i,
    ];

    // Check if the command is about deleting a paragraph with specific content
    let contentToFind = null;
    for (const pattern of deleteParagraphWithContentPatterns) {
      const match = voiceCommand.match(pattern);
      if (match && match[1]) {
        contentToFind = match[1].trim();
        break;
      }
    }

    if (contentToFind && editorContent && editorContent.length > 0) {
      console.log(
        `Detected command to delete paragraph containing: "${contentToFind}"`
      );

      // Find blocks containing the specified content
      const matchingBlockIds = [];

      editorContent.forEach((block) => {
        if (block.content && Array.isArray(block.content)) {
          // Get the full text content of this block
          const blockText = block.content
            .filter((item) => item.type === "text")
            .map((item) => item.text)
            .join(" ")
            .toLowerCase();

          // Check if this block contains the content we're looking for
          if (blockText.includes(contentToFind.toLowerCase())) {
            matchingBlockIds.push(block.id);
          }
        }
      });

      if (matchingBlockIds.length > 0) {
        console.log(
          `Found ${matchingBlockIds.length} blocks containing "${contentToFind}":`,
          matchingBlockIds
        );
        return {
          success: true,
          action: "DELETE_BLOCK",
          targetBlockIds: matchingBlockIds,
          rawCommand: voiceCommand,
          rawTranscription: voiceCommand,
        };
      } else {
        console.log(`No blocks found containing "${contentToFind}"`);
        return {
          success: false,
          action: "CLARIFICATION",
          message: `I couldn't find any paragraphs containing "${contentToFind}".`,
          rawCommand: voiceCommand,
        };
      }
    }

    // Perform a quick pre-check for command words before calling the API
    const commandWords = [
      // Existing command words
      "delete",
      "remove",
      "create",
      "make",
      "generate", // Image generation
      "draw", // Image generation
      "visualize", // Image generation
      "illustrate", // Image generation
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
      "check",
      "task",
      "quote",
      "code",
      // Image generation commands
      "image",
      "picture",
      "photo",
      "avatar",
      "portrait",
      "character",
      "illustration",
      "artwork",
      "drawing",
      "sketch",
      "design",
      "graphic",
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

    // Pre-process the voice command to normalize to-do list references
    let processedCommand = voiceCommand;

    // Check for to-do list related phrases and normalize them
    const todoPatterns = [
      /to-do list/i,
      /todo list/i,
      /to do list/i,
      /task list/i,
      /checklist/i,
      /check list/i,
      /check item/i,
    ];

    // Special pattern for converting to a to-do list
    const convertToTodoPatterns = [
      /convert.*(?:to|into).*(?:to-do|todo|task|check) list/i,
      /change.*(?:to|into).*(?:to-do|todo|task|check) list/i,
      /make.*(?:a|the).*(?:to-do|todo|task|check) list/i,
      /transform.*(?:to|into).*(?:to-do|todo|task|check) list/i,
    ];

    // Special pattern for AI questions
    const askAIPatterns = [
      /^ask\s+(?:the)?\s*ai\s+(.+)/i,
      /^(?:hey|hi|hello)\s+(?:ai|assistant|gemini)\s+(.+)/i,
      /^(?:ai|assistant|gemini)[,:]?\s+(.+)/i,
      /^tell\s+me\s+(?:about|what|who|when|where|why|how)\s+(.+)/i,
      /^what\s+(?:is|are|was|were)\s+(.+)/i,
      /^who\s+(?:is|are|was|were)\s+(.+)/i,
      /^when\s+(?:is|are|was|were)\s+(.+)/i,
      /^where\s+(?:is|are|was|were)\s+(.+)/i,
      /^why\s+(?:is|are|was|were)\s+(.+)/i,
      /^how\s+(?:to|do|does|did)\s+(.+)/i,
      /^can\s+you\s+(?:tell|explain|describe)\s+(.+)/i,
    ];

    // Check if the command is an AI question
    let questionMatch = null;
    let question = null;

    for (const pattern of askAIPatterns) {
      const match = voiceCommand.match(pattern);
      if (match && match[1]) {
        questionMatch = match;
        question = match[1].trim();
        break;
      }
    }

    if (question) {
      console.log("Detected AI question:", question);

      try {
        // Process the question with Gemini
        const aiResponse = await askGeminiAI(question, editorContent);

        if (aiResponse.success && aiResponse.blocks) {
          console.log("Got AI answer with blocks:", aiResponse.blocks.length);
          return {
            success: true,
            action: "INSERT_AI_ANSWER",
            blocks: aiResponse.blocks,
            rawCommand: voiceCommand,
            rawTranscription: voiceCommand,
          };
        } else {
          console.error("Failed to get AI answer:", aiResponse.message);
          return {
            success: false,
            action: "CLARIFICATION",
            message: aiResponse.message || "I couldn't answer that question.",
            rawCommand: voiceCommand,
          };
        }
      } catch (error) {
        console.error("Error processing AI question:", error);
        return {
          success: false,
          action: "CLARIFICATION",
          message: "Sorry, I had trouble answering that question.",
          rawCommand: voiceCommand,
        };
      }
    }

    // Direct handling for to-do list conversion commands
    const isConvertToTodoCommand = convertToTodoPatterns.some((pattern) =>
      pattern.test(voiceCommand)
    );

    if (isConvertToTodoCommand) {
      console.log("Detected direct to-do list conversion command");

      // Find all bullet list items to convert
      const bulletListItems = editorContent
        ? editorContent
            .filter((block) => block.type === "bulletListItem")
            .map((block) => block.id)
        : [];

      if (bulletListItems.length > 0) {
        console.log(
          `Found ${bulletListItems.length} bullet list items to convert to check list items`
        );
        return {
          success: true,
          action: "MODIFY_BLOCK",
          modificationType: "CONVERT_TO_LIST",
          newType: "checkListItem",
          listType: "todo",
          targetBlockType: "bulletListItem",
          targetBlockIds: bulletListItems,
          rawCommand: voiceCommand,
          rawTranscription: voiceCommand,
        };
      }
    }

    // If the command contains any to-do list references, make it explicit
    if (todoPatterns.some((pattern) => pattern.test(voiceCommand))) {
      console.log("Detected to-do list reference in command, normalizing");
      // Add an explicit reference to checkListItem for the AI to understand
      processedCommand += " (convert to checkListItem type)";
    }

    console.log("Processing voice command with Gemini:", processedCommand);

    // Pre-process the editor content to add block indices for easier reference
    const processedContent = editorContent
      ? editorContent.map((block, index) => ({
          ...block,
          _index: index, // Add index for reference in the prompt
        }))
      : [];

    // Log content summary for debugging
    console.log(`Editor has ${processedContent.length} blocks to analyze`);

    // Optimize content for API call - limit size for performance
    let contentForPrompt;
    const MAX_CONTENT_LENGTH = 5000; // Limit content size for performance

    if (processedContent.length === 0) {
      contentForPrompt = "[]";
    } else if (processedContent.length > 50) {
      // For large notes, provide summary instead of full content
      contentForPrompt = `[Large note with ${
        processedContent.length
      } blocks. First 10 blocks: ${JSON.stringify(
        processedContent.slice(0, 10),
        null,
        2
      )}, ... and ${processedContent.length - 10} more blocks]`;
    } else {
      const contentString = JSON.stringify(processedContent, null, 2);
      if (contentString.length > MAX_CONTENT_LENGTH) {
        // Truncate if too long
        contentForPrompt =
          contentString.substring(0, MAX_CONTENT_LENGTH) +
          "... [truncated for performance]";
      } else {
        contentForPrompt = contentString;
      }
    }

    // Enhanced system prompt with DELETE_ALL command
    const prompt = `You are an AI that processes voice commands for a note-taking app. The user said: "${processedCommand}"

# Available Actions
- INSERT_CONTENT: Add content to the note
- DELETE_BLOCK: Delete specific blocks
- FORMAT_BLOCK: Apply formatting to blocks
- DELETE_ALL: Delete all content in the current note (use when user says "delete everything", "clear all", "remove all", "delete all", "clear the page")

# Rules
1. Always return a JSON array of command objects
2. Each command must have "action" and other required fields
3. For DELETE_BLOCK, provide the block id(s) in "targetBlockIds" OR the content to match in "targetContent"
4. For content-based deletion, use: { "action": "DELETE_BLOCK", "targetContent": "exact text to match" }
5. For DELETE_ALL, use: { "action": "DELETE_ALL" }
6. If the user repeats a command or says it multiple times, still return a single command
7. If the command is ambiguous, try to interpret it based on context

# Examples
1. User says: "Delete the block that says 'Buy groceries'"
   Response: [{"action": "DELETE_BLOCK", "targetContent": "Buy groceries"}]

2. User says: "Remove the heading 'To-Do List for Today'"
   Response: [{"action": "DELETE_BLOCK", "targetContent": "To-Do List for Today"}]

# Current Note Content (as context)
${contentForPrompt}

# Response Format
[{"action": "...", ...}]`;

    // Log the prompt we are sending to Gemini for command processing
    console.log(`Sending prompt to Gemini for command processing:\n${prompt}`);

    let retryCount = 0;
    const maxRetries = 2;

    while (retryCount < maxRetries) {
      try {
        // Make the API request
        console.log(`Calling Gemini API for voice command processing`);
        const response = await axios.post(
          `${GEMINI_API_URL}?key=${GEMINI_API_KEY}`,
          {
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            generationConfig: {
              ...GEMINI_CONFIG,
              temperature: 0.0, // Keep deterministic for command interpretation
              maxOutputTokens: 1024,
            },
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
            timeout: 15000, // 15 second timeout to prevent hanging
          }
        );

        // Log the raw response
        console.log(
          `Received response from Gemini API for voice command: ${JSON.stringify(
            response.data,
            null,
            2
          )}`
        );

        // Extract the text response
        const responseText =
          response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) {
          console.error("No text in Gemini response", response.data);
          throw new Error("No text in Gemini response");
        }

        // Clean the response text to extract JSON
        const cleanedText = responseText
          .replace(/```json/g, "")
          .replace(/```/g, "");

        // Attempt to parse the JSON
        console.log(`Attempting to parse JSON: ${cleanedText}...`);
        const parsedCommands = JSON.parse(cleanedText);

        // Handle empty response
        if (!Array.isArray(parsedCommands) || parsedCommands.length === 0) {
          console.error("Gemini returned empty or invalid command array");
          throw new Error("No valid commands found in Gemini response");
        }

        // Extract the first command from the array. Gemini is instructed to return a JSON array.
        const command = parsedCommands[0];

        console.log("Successfully parsed command from Gemini:", command);
        // Return a structured success object that the rest of the app expects
        return {
          success: true,
          rawTranscription: voiceCommand,
          ...command, // Spread the action and any other properties from the command
        };
      } catch (error) {
        console.error(
          `Command processing attempt ${retryCount + 1} failed:`,
          error
        );
        retryCount++;

        if (retryCount >= maxRetries) {
          throw error;
        }
      }
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
