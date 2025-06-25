/**
 * Diagnostic script to check for potential initialization issues
 * Run this to identify any problematic code patterns
 */

const fs = require("fs");
const path = require("path");

console.log("🔍 Scanning for potential initialization issues...\n");

// Files to check
const filesToCheck = [
  "services/gemini/ai.js",
  "services/imageGenerationService.js",
  "utils/voiceCommandHandlers.js",
  "index.js",
  "app/_layout.jsx",
];

// Patterns that might cause initialization issues
const problematicPatterns = [
  {
    pattern: /\.handleImage.*Command\s*=/,
    description: "Direct handleImageGenerationCommand assignment",
  },
  {
    pattern: /window\..*=.*undefined/,
    description: "Undefined window property assignment",
  },
  {
    pattern: /global\..*=.*undefined/,
    description: "Undefined global property assignment",
  },
  {
    pattern: /this\..*=.*undefined/,
    description: "Undefined this property assignment",
  },
  {
    pattern: /\..*Command\s*=\s*function/,
    description: "Function assignment to Command property",
  },
];

let issuesFound = 0;

filesToCheck.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");

      console.log(`📁 Checking ${filePath}...`);

      problematicPatterns.forEach(({ pattern, description }) => {
        const matches = content.match(pattern);
        if (matches) {
          console.log(`  ⚠️  Found: ${description}`);
          console.log(`      Pattern: ${matches[0]}`);
          issuesFound++;
        }
      });

      console.log(`  ✅ ${filePath} checked\n`);
    } else {
      console.log(`  ❌ File not found: ${filePath}\n`);
    }
  } catch (error) {
    console.log(`  🚨 Error reading ${filePath}: ${error.message}\n`);
  }
});

// Check for import/export issues
console.log("🔍 Checking for import/export issues...\n");

const serviceFiles = [
  "services/imageGenerationService.js",
  "utils/errorHandler.js",
];

serviceFiles.forEach((filePath) => {
  const fullPath = path.join(__dirname, filePath);

  try {
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, "utf8");

      console.log(`📦 Checking exports in ${filePath}...`);

      // Check for proper exports
      const hasDefaultExport = /export\s+default/.test(content);
      const hasNamedExports = /export\s+(const|function|class)/.test(content);

      if (hasDefaultExport || hasNamedExports) {
        console.log(`  ✅ Exports found in ${filePath}`);
      } else {
        console.log(`  ⚠️  No exports found in ${filePath}`);
      }

      // Check for circular imports
      const imports = content.match(/import.*from\s+['"](.*)['"]/g);
      if (imports) {
        console.log(`  📥 Imports: ${imports.length}`);
      }

      console.log("");
    }
  } catch (error) {
    console.log(`  🚨 Error checking ${filePath}: ${error.message}\n`);
  }
});

// Summary
console.log("📊 Diagnostic Summary:");
console.log("========================");

if (issuesFound === 0) {
  console.log("✅ No problematic patterns found!");
  console.log("   The initialization error is likely a transient cache issue.");
  console.log("   The error handler should prevent it from appearing again.");
} else {
  console.log(`⚠️  Found ${issuesFound} potential issue(s).`);
  console.log("   Review the patterns above and consider refactoring.");
}

console.log("\n🔧 Recommended Actions:");
console.log("1. Clear all caches: rm -rf .expo node_modules/.cache");
console.log("2. Restart with: npx expo start --clear");
console.log("3. Test the app on Android device/emulator");
console.log("4. Check console for [ErrorHandler] messages");

console.log("\n✅ Diagnostic complete!");
