/**
 * Test file for image generation pattern detection
 */

// Simple pattern detection function for testing
const extractImagePrompt = (command) => {
  const imagePatterns = [
    // "generate an image of..."
    /^(?:generate|create|make|draw)(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "show me an image of..."
    /^(?:show|display)(?:\s+me)?(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "I want an image of..."
    /^(?:I\s+want|I\s+need)(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i,
    // "image of..."
    /^(?:image|picture|photo)(?:\s+of)?\s+(.+)/i,
    // "visualize..."
    /^(?:visualize|illustrate)\s+(.+)/i,
  ];

  for (const pattern of imagePatterns) {
    const match = command.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return null;
};

const isImageGenerationRequest = (command) => {
  return extractImagePrompt(command) !== null;
};

// Test cases for image generation pattern detection
const testCases = [
  // Should match
  "generate an image of a sunset over mountains",
  "create a picture of a cat",
  "make an image of a futuristic city",
  "show me an image of a beach",
  "I want an image of a red car",
  "visualize a peaceful forest",
  "image of a flying dragon",
  "picture of a robot",
  "generate a photo of flowers",

  // Should NOT match
  "tell me about the weather",
  "what is the capital of France",
  "summarize this document",
  "how do I cook pasta",
  "create a list of tasks",
];

console.log("Testing image generation pattern detection...\n");

testCases.forEach((testCase, index) => {
  const isImageRequest = isImageGenerationRequest(testCase);
  const extractedPrompt = extractImagePrompt(testCase);

  console.log(`Test ${index + 1}: "${testCase}"`);
  console.log(`  Is image request: ${isImageRequest}`);
  console.log(`  Extracted prompt: "${extractedPrompt}"`);
  console.log("");
});

console.log("Pattern detection test completed!");
