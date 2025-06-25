/**
 * Simple test for image generation patterns
 */

const testCommand =
  "Generate a profile picture of a girl uh named Yasmin. She's 21 years old and she wear she wears hijab.";

console.log("🧪 Testing voice command integration...");
console.log("Test command:", testCommand);

// Simple pattern test
const simplePattern = /^(?:generate|create|make|draw)/i;
console.log("Matches simple pattern:", simplePattern.test(testCommand));

// Test for "profile picture"
const profilePattern = /profile picture/i;
console.log("Contains 'profile picture':", profilePattern.test(testCommand));

// Test full extraction
const extractPattern = /^(?:generate|create|make|draw)\s+(.+)/i;
const match = testCommand.match(extractPattern);
console.log("Extracted content:", match ? match[1] : "No match");

console.log("✅ Basic pattern test completed!");
