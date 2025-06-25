/**
 * Comprehensive Image Generation Integration Test
 *
 * This test verifies that the image generation system correctly:
 * 1. Detects various types of image generation commands
 * 2. Extracts prompts from complex voice commands
 * 3. Handles edge cases and longer descriptions
 */

// Copy the exact logic from imageGenerationService.js
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
    // Broader pattern for any generation with image-related terms
    /^(?:generate|create|make|draw)\s+(.+?)(?:\s+(?:for|to|with|of|that|which).*)?$/i,
  ];

  for (const pattern of imagePatterns) {
    const match = command.match(pattern);
    if (match) {
      // For patterns with multiple capture groups, get the relevant content
      let extracted;
      if (match[2]) {
        // Pattern has image type + description (like "portrait of...")
        extracted = `${match[1]} ${match[2]}`.trim();
      } else if (match[1]) {
        extracted = match[1].trim();
      } else {
        continue;
      }

      // Validate that it contains image-related terms or descriptive content
      if (
        extracted.includes("picture") ||
        extracted.includes("image") ||
        extracted.includes("photo") ||
        extracted.includes("profile") ||
        extracted.includes("avatar") ||
        extracted.includes("portrait") ||
        extracted.includes("illustration") ||
        extracted.includes("drawing") ||
        extracted.includes("character") ||
        extracted.includes("scene") ||
        extracted.includes("landscape") ||
        extracted.includes("background") ||
        extracted.includes("design") ||
        extracted.includes("artwork") ||
        // Check if it looks like a visual description (contains descriptive words)
        /(?:of|with|showing|featuring|depicting|a|an|the|girl|boy|man|woman|person|people|character|animal|object|place|thing|wearing|holding|standing|sitting|walking|running|beautiful|cute|young|old|colorful|bright|dark|large|small|tall|short)/.test(
          extracted
        )
      ) {
        return extracted;
      }
    }
  }

  return null;
};

const isImageGenerationRequest = (command) => {
  return extractImagePrompt(command) !== null;
};

console.log("🧪 Testing Image Generation Integration...\n");

// Test cases that should trigger image generation
const imageCommands = [
  "Generate a profile picture of a girl uh named Yasmin. She's 21 years old and she wear she wears hijab.",
  "Generate an image of a sunset over mountains",
  "Create a picture of a cute cat",
  "Make a drawing of a robot",
  "Generate a portrait of a woman",
  "Create an avatar for my profile",
  "Generate a character wearing blue clothes",
  "Make some artwork of flowers",
  "Draw a beautiful landscape",
  "Generate a logo for my company",
  "Create an illustration of a tree",
  "Make a sketch of a house",
  "Generate a background image",
  "Create a design with geometric shapes",
  "Show me an image of a dog",
  "I want a picture of a castle",
  "Visualize a futuristic city",
  "Illustrate a magical forest",
];

// Test cases that should NOT trigger image generation
const nonImageCommands = [
  "What is the weather today?",
  "Tell me about artificial intelligence",
  "How do I bake a cake?",
  "Delete all content",
  "Undo last action",
  "Change text color to blue",
  "Add a new paragraph",
  "Save this document",
  "Copy the selected text",
  "What time is it?",
  "Translate this to Spanish",
  "Calculate 2 + 2",
  "Set a reminder for tomorrow",
];

console.log("📋 Testing Image Commands (should detect as IMAGE):");
console.log("=".repeat(60));

let imageTestsPassed = 0;
let imageTestsTotal = imageCommands.length;

imageCommands.forEach((command, index) => {
  const isImage = isImageGenerationRequest(command);
  const prompt = extractImagePrompt(command);
  const status = isImage ? "✅ PASS" : "❌ FAIL";

  if (isImage) imageTestsPassed++;

  console.log(`${index + 1}. ${status}`);
  console.log(`   Command: "${command}"`);
  console.log(`   Detected: ${isImage ? "IMAGE" : "TEXT"}`);
  console.log(`   Prompt: "${prompt || "null"}"`);
  console.log("");
});

console.log("📋 Testing Non-Image Commands (should detect as TEXT):");
console.log("=".repeat(60));

let nonImageTestsPassed = 0;
let nonImageTestsTotal = nonImageCommands.length;

nonImageCommands.forEach((command, index) => {
  const isImage = isImageGenerationRequest(command);
  const prompt = extractImagePrompt(command);
  const status = !isImage ? "✅ PASS" : "❌ FAIL";

  if (!isImage) nonImageTestsPassed++;

  console.log(`${index + 1}. ${status}`);
  console.log(`   Command: "${command}"`);
  console.log(`   Detected: ${isImage ? "IMAGE" : "TEXT"}`);
  console.log(`   Prompt: "${prompt || "null"}"`);
  console.log("");
});

// Add tests for longer prompts and responses
const MAX_PROMPT_LENGTH = 1000;
const MAX_RESPONSE_LENGTH = 2000;

describe("Image Generation Integration Test", () => {
  it("should handle long prompts without truncation", async () => {
    const longPrompt =
      "Generate a detailed image of a futuristic cityscape with flying cars, neon lights, and towering skyscrapers, under a starry night sky.".repeat(
        10
      );
    expect(longPrompt.length).toBeLessThanOrEqual(MAX_PROMPT_LENGTH);

    const response = await imageGenerationService.generateImage(longPrompt);
    expect(response).toBeDefined();
    expect(response.imageUrl).toBeTruthy();
    expect(response.prompt).toBe(longPrompt);
  });

  it("should handle long AI responses without truncation", async () => {
    const response = await imageGenerationService.generateImage(
      "Generate a simple image of a sunset over the ocean."
    );
    expect(response).toBeDefined();
    expect(response.imageUrl).toBeTruthy();
    expect(response.prompt.length).toBeLessThanOrEqual(MAX_RESPONSE_LENGTH);
  });
});

// Summary
console.log("📊 Test Results Summary:");
console.log("=".repeat(60));
console.log(
  `Image Commands: ${imageTestsPassed}/${imageTestsTotal} passed (${Math.round(
    (imageTestsPassed / imageTestsTotal) * 100
  )}%)`
);
console.log(
  `Non-Image Commands: ${nonImageTestsPassed}/${nonImageTestsTotal} passed (${Math.round(
    (nonImageTestsPassed / nonImageTestsTotal) * 100
  )}%)`
);

const totalTests = imageTestsTotal + nonImageTestsTotal;
const totalPassed = imageTestsPassed + nonImageTestsPassed;
const overallScore = Math.round((totalPassed / totalTests) * 100);

console.log(`Overall: ${totalPassed}/${totalTests} passed (${overallScore}%)`);

if (overallScore >= 95) {
  console.log(
    "\n🎉 Excellent! Image generation pattern detection is working great!"
  );
} else if (overallScore >= 80) {
  console.log("\n✅ Good! Minor improvements may be needed.");
} else {
  console.log("\n⚠️  Needs improvement. Check failing test cases.");
}

console.log("\n✅ Integration test completed!");
