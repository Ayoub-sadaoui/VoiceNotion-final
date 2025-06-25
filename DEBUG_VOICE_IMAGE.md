# Voice Image Generation Debug Guide

## Quick Debug Steps

Follow these steps to identify where the issue is occurring:

### Step 1: Check if askGeminiAI is being called

1. Open your app and go to a note
2. Switch to Ask AI mode (hover on voice button)
3. Say: "generate an image of a cat"
4. Check the console/logs for:
   ```
   🎯 askGeminiAI called with question: generate an image of a cat
   ```

**If you don't see this message**: The issue is that Ask AI mode is not calling `askGeminiAI`. Check VoiceRecorder.jsx.

### Step 2: Check pattern detection

Look for these console messages:

```
Checking if image generation request...
Is image generation request: true
Extracted prompt: a cat
✅ Detected image generation request
```

**If you see "false" instead of "true"**: The pattern detection isn't working. The transcription might be different than expected.

**If you see an import error**: There's an issue with the imageGenerationService import.

### Step 3: Check image generation

Look for:

```
Generating image with prompt: a cat
Image generated successfully
```

**If this fails**: Check your Vertex AI setup and Supabase Edge Function.

### Step 4: Check block creation and insertion

Look for:

```
📝 Created blocks for image: [array of blocks]
```

**If this appears but no image shows**: Check that the INSERT_AI_IMAGE action is being handled properly.

## Common Issues and Fixes

### Issue 1: Pattern not detected

**Symptoms**: Console shows "Is image generation request: false"
**Solution**:

- Check what text was actually transcribed
- Try more explicit commands like "generate an image of a cat"
- Make sure you're speaking clearly

### Issue 2: Import error with imageGenerationService

**Symptoms**: Console shows error about imageGenerationService
**Solution**:

- Restart the Metro bundler: `npx expo start --clear`
- Check that the file exists at `services/imageGenerationService.js`

### Issue 3: askGeminiAI not called

**Symptoms**: No console message with "🎯 askGeminiAI called"
**Solution**:

- Make sure you're in Ask AI mode (not regular voice command mode)
- Check that the VoiceRecorder is using the correct code path

### Issue 4: Image generation fails

**Symptoms**: "Failed to generate image" message
**Solution**:

- Test the manual image generation (toolbar button) first
- Check Supabase Edge Function logs
- Verify environment variables are set

### Issue 5: Image not inserted

**Symptoms**: Image generates but doesn't appear in editor
**Solution**:

- Check that INSERT_AI_IMAGE action is handled in the note screen
- Verify the image block format is correct

## Test Commands

Try these voice commands in Ask AI mode:

✅ **Should work**:

- "generate an image of a sunset"
- "create a picture of a cat"
- "make an image of a robot"
- "show me an image of mountains"
- "I want an image of a car"

❌ **Should NOT trigger image generation**:

- "tell me about cats"
- "what is the weather"
- "summarize this text"

## Debug Console Commands

If you want to test the service directly in the browser console:

```javascript
// Test pattern detection
const testCmd = "generate an image of a sunset";
console.log(
  "Pattern test:",
  /^(?:generate|create|make|draw)(?:\s+an?)?(?:\s+image|\s+picture|\s+photo)(?:\s+of)?\s+(.+)/i.test(
    testCmd
  )
);
```

## Expected Full Console Flow

When everything works correctly, you should see:

```
🎯 askGeminiAI called with question: generate an image of a cat
Processing AI question with Gemini: generate an image of a cat
Checking if image generation request...
Is image generation request: true
Extracted prompt: a cat
✅ Detected image generation request
Generating image with prompt: a cat
Generating image with prompt: a cat
Image generated successfully
📝 Created blocks for image: [object Object],[object Object]
```

Then the image should appear in your editor!

## Emergency Rollback

If something breaks completely, you can temporarily disable image generation by commenting out the image detection in `services/gemini/ai.js`:

```javascript
// Temporarily disable image generation
// if (isImageRequest) {
//   ... image generation code ...
// }
```
