/**
 * Simple test to verify that the image generation service works
 */

// Test our pattern detection first
const testCommand =
  "Generate a profile picture of a girl uh named Yasmin. She's 21 years old and she wear she wears hijab.";

// Simulate the pattern detection logic
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

console.log("🧪 Testing voice command integration...");
console.log("Test command:", testCommand);
console.log("Is image request:", isImageGenerationRequest(testCommand));
console.log("Extracted prompt:", extractImagePrompt(testCommand));

// Test other commands
const testCommands = [
  "generate an image of a cat",
  "create a picture of a robot",
  "what is the weather today",
  "show me an image of mountains",
  "Generate a profile picture of a girl named Yasmin",
  "create a portrait of someone",
  "generate a landscape scene",
  "make a drawing of a tree",
  "generate a character wearing blue clothes",
  "create an avatar for my profile",
  "make some artwork of flowers",
  "draw a beautiful sunset",
];

console.log("\n🧪 Testing multiple commands:");
testCommands.forEach((cmd) => {
  console.log(
    `"${cmd}" -> ${
      isImageGenerationRequest(cmd) ? "✅ IMAGE" : "❌ TEXT"
    } (${extractImagePrompt(cmd)})`
  );
});

console.log("\n✅ Pattern detection test completed!");
