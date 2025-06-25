# AI Image Generator Block for sayNote

This feature adds a custom BlockNote block that allows users to generate images using AI by providing text prompts.

## Features

- **Custom BlockNote Block**: Seamlessly integrated into the sayNote editor
- **Slash Menu Integration**: Access via `/` command (type `/imageGenerator` or `/ai image`)
- **Keyboard Toolbar**: Quick access button with magic wand icon 🪄
- **Real-time Validation**: Character count and input validation
- **Loading States**: Visual feedback during image generation
- **Error Handling**: Comprehensive error messages and recovery
- **Automatic Insertion**: Generated images are automatically inserted as standard image blocks
- **Security**: API calls routed through secure Supabase Edge Function
- **Direct URL Usage**: Uses direct image URLs without requiring Supabase storage

## How It Works

1. **Insert the Block**: Users can insert an AI Image Generator block via:

   - Slash menu: Type `/imageGenerator` or `/ai image`
   - Keyboard toolbar: Click the magic wand (🪄) icon

2. **Enter Prompt**: Users type a description of the image they want to generate in the textarea

3. **Generate Image**: Click the "Generate Image" button to trigger AI image generation

4. **Automatic Insertion**: Once generated, the image is automatically inserted as a standard image block and the generator block is removed

## Prerequisites

Before deploying, ensure you have:

1. **Supabase CLI** installed:

   ```bash
   npm install -g supabase
   ```

2. **Supabase Project** set up and linked to your local development

3. **Gemini API Key** (from Google AI Studio):
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a new API key
   - Keep it secure for environment variable setup

## Deployment Instructions

### Step 1: Set Up Environment Variables

1. **In Supabase Dashboard**:

   - Go to your project dashboard at [supabase.com](https://supabase.com)
   - Navigate to **Settings** → **API** → **Environment Variables**
   - Add the following variable:
     ```
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     ```

2. **For Local Development** (optional):
   - Create a `.env.local` file in your supabase folder:
     ```
     GEMINI_API_KEY=development
     ```
   - This will use placeholder images during development

### Step 2: Deploy the Edge Function

1. **Navigate to your project root**:

   ```bash
   cd /path/to/your/saynote/project
   ```

2. **Login to Supabase** (if not already logged in):

   ```bash
   supabase login
   ```

3. **Link your project** (if not already linked):

   ```bash
   supabase link --project-ref your-project-ref-id
   ```

   - Find your project ref ID in your Supabase dashboard URL

4. **Deploy the Edge Function**:

   ```bash
   supabase functions deploy generate-image
   ```

5. **Verify deployment**:
   - Check the output for any errors
   - The function should be available at: `https://your-project-ref.supabase.co/functions/v1/generate-image`

### Step 3: Test the Deployment

1. **Test with curl** (optional):

   ```bash
   curl -X POST 'https://your-project-ref.supabase.co/functions/v1/generate-image' \
     -H 'Authorization: Bearer your-anon-key' \
     -H 'Content-Type: application/json' \
     -d '{"prompt": "a beautiful sunset over mountains"}'
   ```

2. **Test in the app**:
   - Open your sayNote app
   - Insert an AI Image Generator block (via slash menu or toolbar)
   - Enter a prompt and click "Generate Image"
   - Verify the image is generated and inserted

### Step 4: Production Configuration

For production deployment, you may want to:

1. **Add Rate Limiting** (optional):

   - Implement rate limiting in the Edge Function
   - Consider using Supabase's built-in rate limiting

2. **Monitor Usage**:

   - Check Supabase Dashboard → **Edge Functions** → **Logs**
   - Monitor API usage and costs

3. **Update Gemini Integration** (when available):
   - The current implementation uses fallback services
   - Update to actual Gemini image generation API when released by Google

## Implementation Details

### Files Added/Modified

1. **`components/editor-components/ImageGeneratorBlock.jsx`** - Main custom block component
2. **`components/editor-components/editorSchema.js`** - Updated to include the new block
3. **`supabase/functions/generate-image/index.ts`** - Backend Edge Function for secure API calls
4. **`components/KeyboardToolbar.jsx`** - Added toolbar button
5. **`components/ToolbarIcon.jsx`** - Added magic wand icon

### Technical Architecture

```
User Input → ImageGeneratorBlock → Supabase Edge Function → Image Service → Direct URL → Standard Image Block
```

## Troubleshooting

### Common Issues

#### 1. Edge Function Deployment Fails

**Error**: `Function deployment failed`
**Solution**:

- Ensure you're logged into Supabase CLI: `supabase login`
- Check project is linked: `supabase link --project-ref your-project-ref`
- Verify you have the correct permissions for the project

#### 2. "Service not configured properly" Error

**Error**: `Image generation service not configured properly`
**Solution**:

- Verify `GEMINI_API_KEY` is set in Supabase Dashboard → Settings → Environment Variables
- Check the API key is valid and active
- For development, you can set `GEMINI_API_KEY=development` to use placeholder images

#### 3. CORS Errors

**Error**: `Access blocked by CORS`
**Solution**:

- The Edge Function includes CORS headers
- Ensure you're calling from the correct domain
- Check your Supabase project's CORS settings

#### 4. Images Not Loading

**Issue**: Generated images show broken image icon
**Solution**:

- Check browser console for network errors
- Verify the image URL is accessible
- Try a different prompt
- Check if the image service (Unsplash/Lorem Picsum) is accessible

#### 5. Button Not Appearing in Toolbar

**Issue**: Magic wand button missing from keyboard toolbar
**Solution**:

- Ensure `KeyboardToolbar.jsx` has been updated with the new button
- Check that `ToolbarIcon.jsx` includes the 'magic-wand' case
- Restart your development server

### Development Mode

For testing without a real API key, set:

```bash
GEMINI_API_KEY=development
```

This will:

- Use high-quality placeholder images from Unsplash/Lorem Picsum
- Simulate API delays for realistic testing
- Show development mode messages in responses

### Logs and Debugging

1. **Check Edge Function Logs**:

   ```bash
   supabase functions logs generate-image
   ```

2. **View in Dashboard**:

   - Go to Supabase Dashboard → **Edge Functions** → **generate-image** → **Logs**

3. **Browser Console**:
   - Open DevTools → Console
   - Look for network requests to `/functions/v1/generate-image`
   - Check for any JavaScript errors

### API Limits

- **Prompt Length**: Maximum 1000 characters
- **Rate Limiting**: Consider implementing rate limiting for production
- **Image Size**: Currently generates 1024x1024 images
- **Service Availability**: Uses fallback services if primary service is unavailable

## Future Enhancements

1. **Real Gemini Integration**: Update when Google releases Gemini image generation API
2. **Image Customization**: Add options for image size, style, quality
3. **Prompt Templates**: Pre-defined prompts for common use cases
4. **History**: Save and reuse previous prompts
5. **Batch Generation**: Generate multiple images from one prompt
6. **Style Transfer**: Apply artistic styles to generated images

## API Reference

### Edge Function Endpoint

**URL**: `https://your-project-ref.supabase.co/functions/v1/generate-image`

**Method**: `POST`

**Headers**:

```
Authorization: Bearer your-anon-key
Content-Type: application/json
```

**Request Body**:

```json
{
  "prompt": "a beautiful sunset over mountains"
}
```

**Response** (Success):

```json
{
  "imageUrl": "https://...",
  "prompt": "a beautiful sunset over mountains"
}
```

**Response** (Error):

```json
{
  "error": "Error message description"
}
```

**Status Codes**:

- `200`: Success
- `400`: Invalid request (bad prompt)
- `500`: Server error
- `429`: Rate limit exceeded

## Contributing

When making changes to the image generator:

1. Test with development mode first (`GEMINI_API_KEY=development`)
2. Verify error handling works correctly
3. Check loading states and user feedback
4. Test both slash menu and toolbar access
5. Ensure generated images insert properly as standard image blocks
6. Update this README if you add new features or change behavior

---

**Note**: This implementation currently uses fallback image services. When Google releases the Gemini image generation API, update the Edge Function to use the real API for production-quality AI-generated images.
prompt: { default: "" }
},
content: "none"
}

````

### API Endpoint

- **Endpoint**: `/functions/v1/generate-image`
- **Method**: POST
- **Payload**: `{ prompt: string }`
- **Response**: `{ imageUrl: string, prompt: string }`

## Setup Instructions

### 1. Environment Variables

Add these environment variables to your Supabase project:

```bash
# Required for production
GOOGLE_CLOUD_API_KEY=your_google_cloud_api_key
GOOGLE_CLOUD_PROJECT_ID=your_project_id

# Optional for storage
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
````

### 2. Google Cloud Setup (Production)

1. Enable Vertex AI API in Google Cloud Console
2. Create a service account with Vertex AI permissions
3. Generate an API key or use OAuth2 tokens
4. Configure the project ID in environment variables

### 3. Supabase Storage (Optional)

Create an `images` storage bucket in Supabase:

```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('images', 'images', true);
```

### 4. Deploy Edge Function

```bash
supabase functions deploy generate-image
```

### 5. Development Mode

For development/testing, the system automatically detects when using placeholder API keys and uses Lorem Picsum placeholder images with a 2-second delay to simulate real API calls.

## Usage Examples

### Basic Usage

```
Prompt: "A serene mountain landscape at sunrise"
Result: Generates and inserts a landscape image
```

### Creative Prompts

```
Prompt: "Abstract geometric patterns in blue and gold with crystalline structures"
Result: Generates and inserts an abstract art image
```

### Character Limit

- Maximum: 1000 characters
- Real-time character counter
- Validation feedback

## Error Handling

The system handles various error scenarios:

- **Empty Prompt**: "Please enter a description for the image"
- **Too Long**: "Prompt is too long. Please keep it under 1000 characters"
- **API Errors**: Specific error messages for different failure types
- **Network Issues**: "Failed to connect to image generation service"
- **Rate Limiting**: "Rate limit exceeded. Please try again in a few moments"

## Security Considerations

1. **API Key Protection**: API keys are stored securely in Supabase environment variables
2. **Server-side Validation**: All inputs validated on the backend
3. **Rate Limiting**: Implement rate limiting to prevent abuse
4. **Content Filtering**: Google's built-in safety filters for appropriate content
5. **CORS Configuration**: Proper CORS headers for security

## Future Enhancements

- **Image Styles**: Add preset style options (realistic, artistic, cartoon, etc.)
- **Size Options**: Allow users to specify image dimensions
- **History**: Keep a history of generated prompts and images
- **Batch Generation**: Generate multiple variations of the same prompt
- **Integration**: Voice command support for prompt input
- **Caching**: Cache frequently requested images

## Troubleshooting

### Common Issues

1. **"Image generation service not configured"**

   - Check environment variables are set correctly
   - Verify Google Cloud API access

2. **"Unable to insert image"**

   - Ensure cursor is positioned in the editor
   - Try clicking in the editor first

3. **Slow Generation**

   - Normal for AI image generation (2-30 seconds)
   - Loading indicator shows progress

4. **Development Mode Active**
   - Check API key format
   - Placeholder images used automatically in development

### Support

For issues or questions:

1. Check the browser console for detailed error messages
2. Verify Supabase Edge Function logs
3. Test with simple prompts first
4. Ensure stable internet connection

## Performance

- **Generation Time**: 2-30 seconds depending on complexity
- **Image Size**: Optimized for web display (typically 1024x1024)
- **Storage**: Images cached in Supabase Storage for fast loading
- **Network**: Minimal bandwidth during generation, standard image loading thereafter
