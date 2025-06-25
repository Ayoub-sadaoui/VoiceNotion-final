/**
 * Test Script for Voice Command Fixes
 *
 * This script tests the fixes made to:
 * 1. Image generation command detection
 * 2. Create page command detection
 */

// Manual implementation of key functions for testing purposes
// (to avoid ESM import issues)

const extractImagePrompt = (command) => {
  const imagePatterns = [
    // "generate an image of..." or "generate a picture..." or "generate a photo..."
    /^(?:generate|create|make|draw)(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "generate [anything] picture/image/photo" (like "profile picture", "landscape image", etc.)
    /^(?:generate|create|make|draw)\s+(.+?(?:picture|image|photo).*)/i,
    // "generate" followed by descriptive content (avatar, portrait, etc.)
    /^(?:generate|create|make|draw)\s+(?:a|an|some)?\s*(avatar|portrait|profile|character|illustration|artwork|drawing|sketch|painting|logo|icon|design|graphic|visual|scene|landscape|background|wallpaper|banner|thumbnail)\s+(.+)/i,
    // "show me an image of..."
    /^(?:show|display)(?:\s+me)?(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "I want an image of..."
    /^(?:I\s+want|I\s+need)(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "image of..." or standalone image requests
    /^(?:image|picture|photo)(?:\s+of)?\s+(.+)/i,
    // "visualize..." or "illustrate..."
    /^(?:visualize|illustrate)\s+(.+)/i,
  ];

  for (const pattern of imagePatterns) {
    const match = command.match(pattern);
    if (match) {
      const extracted = match[match.length - 1].trim();
      return extracted;
    }
  }
  return null;
};

const isImageGenerationRequest = (command) => {
  return extractImagePrompt(command) !== null;
};

const imageGenerationService = {
  isImageGenerationRequest,
  extractImagePrompt,
};

const detectSimpleCommands = (voiceCommand) => {
  const command = voiceCommand.toLowerCase().trim();

  // Create page patterns
  const createPagePatterns = [
    /^create\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^(?:new|add)\s+page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^start\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
    /^make\s+(?:a\s+)?(?:new\s+)?page(?:\s+called\s+|\s+named\s+|\s+titled\s+|\s+with\s+title\s+)?(.+)?$/i,
  ];

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

const commandsModule = {
  detectSimpleCommands,
  processVoiceCommandWithGemini: async (command) => {
    // First check if this is a simple command
    const simpleResult = detectSimpleCommands(command);
    if (simpleResult) {
      return {
        ...simpleResult,
        success: true,
        rawCommand: command,
      };
    }

    // Check if this is an image generation request
    if (isImageGenerationRequest(command)) {
      const prompt = extractImagePrompt(command);
      return {
        success: true,
        action: "GENERATE_IMAGE",
        prompt,
        rawCommand: command,
      };
    }

    return {
      success: false,
      action: "CLARIFICATION",
      message: "Command not recognized",
    };
  },
};

// Test image generation command detection
function testImageGeneration() {
  console.log("===== TESTING IMAGE GENERATION COMMANDS =====");

  const testCases = [
    "Generate an image of a girl. She has 21 years old and she wears hijab.",
    "Create an image of a mountain landscape",
    "Draw a portrait of a woman",
    "Make me a picture of a forest",
    "Generate a photo of a beach at sunset",
    "I want an image of a futuristic city",
    "Show me a picture of dogs playing",
  ];

  testCases.forEach((command) => {
    const isImageRequest =
      imageGenerationService.isImageGenerationRequest(command);
    const prompt = isImageRequest
      ? imageGenerationService.extractImagePrompt(command)
      : null;

    console.log(`Command: "${command}"`);
    console.log(
      `Detected as image request: ${isImageRequest ? "✅ YES" : "❌ NO"}`
    );
    if (prompt) {
      console.log(`Extracted prompt: "${prompt}"`);
    }
    console.log("---");
  });
}

// Test create page command detection
async function testCreatePageCommand() {
  console.log("===== TESTING CREATE PAGE COMMANDS =====");

  const testCases = [
    "Create a new page",
    "New page",
    "Create page called Project Notes",
    "Make a new page titled Shopping List",
    "Start a new page",
    "Add page named Travel Plans",
  ];

  for (const command of testCases) {
    console.log(`Command: "${command}"`);

    // Test simple detection
    const simpleDetection = commandsModule.processVoiceCommandWithGemini
      ? commandsModule.detectSimpleCommands(command)
      : { error: "detectSimpleCommands not exposed" };

    console.log(
      `Simple detection:`,
      simpleDetection?.action === "CREATE_PAGE"
        ? "✅ DETECTED"
        : "❌ NOT DETECTED"
    );
    if (simpleDetection?.pageTitle) {
      console.log(`Page title: "${simpleDetection.pageTitle}"`);
    }

    // Test full command processing
    if (commandsModule.processVoiceCommandWithGemini) {
      try {
        const result = await commandsModule.processVoiceCommandWithGemini(
          command,
          []
        );
        console.log(
          `Full processing:`,
          result?.action === "CREATE_PAGE" ? "✅ DETECTED" : "❌ NOT DETECTED"
        );
        if (result?.pageTitle) {
          console.log(`Page title: "${result.pageTitle}"`);
        }
      } catch (error) {
        console.log(`Error in full processing: ${error.message}`);
      }
    }
    console.log("---");
  }
}

// Run the tests
async function runTests() {
  testImageGeneration();
  await testCreatePageCommand();
  console.log("===== ALL TESTS COMPLETED =====");
}

runTests().catch(console.error);
