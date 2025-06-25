/**
 * Quick test to verify command word detection works for image generation
 */

const testCommand =
  "Generate an image of a girl. She has 21 years old and she wears hijab.";

// Command words from the updated list
const commandWords = [
  "delete",
  "remove",
  "create",
  "make",
  "generate",
  "draw",
  "visualize",
  "illustrate",
  "new page",
  "erase",
  "bold",
  "italic",
  "underline",
  "formatting",
  "select",
  "convert",
  "change",
  "undo",
  "redo",
  "replace",
  "substitute",
  "append",
  "prepend",
  "color",
  "blue",
  "red",
  "green",
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
  "all",
  "every",
  "each",
];

const isLikelyCommand = commandWords.some((word) =>
  testCommand.toLowerCase().includes(word)
);

console.log("🧪 Testing Command Word Detection");
console.log("================================");
console.log("Test command:", testCommand);
console.log("Is likely command:", isLikelyCommand);

// Check which words match
const matchingWords = commandWords.filter((word) =>
  testCommand.toLowerCase().includes(word)
);
console.log("Matching command words:", matchingWords);

console.log("\n✅ Command detection test completed!");

if (isLikelyCommand) {
  console.log("🎉 SUCCESS: Command will be processed by AI system");
} else {
  console.log("❌ FAIL: Command will be treated as simple text");
}
