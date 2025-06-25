# Voice-Activated AI Image Generation

This feature allows users to generate AI images using voice commands in Ask AI mode. The system integrates with the existing Vertex AI image generation functionality, providing a seamless voice-to-image experience.

## How It Works

### Voice Command Detection

When a user is in Ask AI mode and speaks a command, the system:

1. **Transcribes** the voice input
2. **Analyzes** the command for image generation patterns
3. **Extracts** the image description/prompt
4. **Generates** the image using Vertex AI
5. **Inserts** the image into the editor

### Supported Voice Patterns

The system recognizes various ways users might request image generation:

#### Direct Generation Commands

- "generate an image of [description]"
- "create a picture of [description]"
- "make an image of [description]"
- "draw [description]"

#### Display Commands

- "show me an image of [description]"
- "display a picture of [description]"

#### Request Commands

- "I want an image of [description]"
- "I need a picture of [description]"

#### Short Forms

- "image of [description]"
- "picture of [description]"
- "photo of [description]"

#### Visualization Commands

- "visualize [description]"
- "illustrate [description]"

### Examples

Here are some example voice commands that will trigger image generation:

```
✅ "Generate an image of a sunset over mountains"
✅ "Create a picture of a cute cat"
✅ "Show me an image of a futuristic city"
✅ "I want an image of a red sports car"
✅ "Visualize a peaceful forest"
✅ "Image of a flying dragon"
```

## Technical Implementation

### Files Modified/Created

1. **`services/imageGenerationService.js`** - New reusable service for image generation
2. **`services/gemini/ai.js`** - Modified to detect and handle image requests
3. **`components/note/VoiceRecorder.jsx`** - Updated success messages
4. **`app/note/[id].jsx`** - Added support for INSERT_AI_IMAGE action

### Service Functions

#### `imageGenerationService.js`

- `generateImage(prompt)` - Calls the Vertex AI API via Supabase Edge Function
- `createImageBlock(imageUrl, caption)` - Creates BlockNote-compatible image blocks
- `extractImagePrompt(command)` - Extracts image description from voice command
- `isImageGenerationRequest(command)` - Detects if command is for image generation

#### Integration Points

- Voice commands are processed through the existing `askGeminiAI` function
- Image generation reuses the existing Supabase Edge Function (`generate-image`)
- Generated images are inserted as standard BlockNote image blocks
- Success/error handling follows existing patterns

### Flow Diagram

```
Voice Input
    ↓
Transcription
    ↓
askGeminiAI()
    ↓
Pattern Detection
    ↓
[Image Request?] → No → Regular AI Processing
    ↓ Yes
Extract Prompt
    ↓
generateImage() → Vertex AI API
    ↓
Create Image Block
    ↓
Insert into Editor
```

## Usage Instructions

### For Users

1. **Start Voice Recording**: Tap the microphone button
2. **Switch to Ask AI Mode**: The voice recorder should be in Ask AI mode
3. **Speak Your Command**: Use any of the supported patterns, e.g.:
   - "Generate an image of a peaceful beach at sunset"
   - "Create a picture of a robot dog"
   - "Show me an image of a mountain landscape"
4. **Wait for Generation**: The system will:
   - Show "Generating image..." feedback
   - Call the Vertex AI API
   - Insert the generated image into your note
5. **Success**: You'll see the generated image with your prompt as the caption

### Error Handling

The system provides clear feedback for various scenarios:

- **Invalid prompts**: "I couldn't understand what image you want me to generate."
- **API errors**: Specific error messages from the Vertex AI service
- **Network issues**: Standard network error handling

## Dependencies

### Existing Systems Used

- **Vertex AI API**: Via the existing Supabase Edge Function
- **Voice Recognition**: Existing transcription system
- **BlockNote Editor**: Standard image block insertion
- **Supabase**: Edge Function infrastructure

### Environment Variables Required

Same as the existing image generation feature:

- `GOOGLE_CLOUD_PROJECT_ID`
- `GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY`

## Testing

### Manual Testing Steps

1. **Setup**: Ensure the Vertex AI image generation is working (test with the toolbar button)
2. **Voice Test**:
   - Open a note
   - Start voice recording in Ask AI mode
   - Say: "Generate an image of a cute puppy"
   - Verify the image is generated and inserted
3. **Pattern Testing**: Try different voice patterns to ensure they're all recognized
4. **Error Testing**: Try invalid commands to ensure proper error handling

### Debug Information

Enable console logging to see:

- Pattern detection results
- Extracted prompts
- API call status
- Block insertion process

## Performance Considerations

- **Voice Processing**: Minimal overhead added to existing voice command processing
- **API Calls**: Same performance as manual image generation
- **Memory**: Images are handled as data URLs (base64), consider memory usage for large images
- **Network**: Image generation requires internet connection to Vertex AI

## Future Enhancements

Potential improvements:

1. **Style Specifications**: "Generate a realistic image of..." vs "Generate a cartoon image of..."
2. **Size Control**: "Generate a large image of..."
3. **Batch Generation**: "Generate 3 images of..."
4. **Image Editing**: "Modify the last image to..."

## Troubleshooting

### Common Issues

1. **Pattern Not Recognized**:

   - Check the voice transcription accuracy
   - Try using more explicit patterns like "generate an image of..."

2. **Image Generation Fails**:

   - Verify Vertex AI setup and credentials
   - Check Supabase Edge Function logs
   - Ensure the prompt is appropriate for image generation

3. **Voice Recognition Issues**:
   - Ensure microphone permissions
   - Speak clearly and at moderate pace
   - Try rephrasing the command

### Debug Commands

Enable debug logging by setting console.log statements in:

- `imageGenerationService.js` - for API calls
- `services/gemini/ai.js` - for pattern detection
- Voice recorder components - for transcription accuracy
