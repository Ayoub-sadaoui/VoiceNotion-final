/**
 * Image Generation Service
 * Reusable service for generating images using Vertex AI via Supabase Edge Function
 */

/**
 * Generate an image using the Vertex AI API
 * @param {string} prompt - The text prompt for image generation
 * @returns {Promise<Object>} - Result object with success status and image data
 */
export const generateImage = async (prompt) => {
  try {
    console.log("Generating image with prompt:", prompt);

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      throw new Error("Image prompt is required");
    }

    // Get Supabase configuration
    const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl) {
      throw new Error("Supabase configuration missing");
    }

    // Call the Supabase Edge Function for image generation
    const response = await fetch(`${supabaseUrl}/functions/v1/generate-image`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({
        prompt: prompt.trim(),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Image generation API error:", response.status, errorText);
      throw new Error(`Failed to generate image: ${response.statusText}`);
    }

    const data = await response.json();

    if (!data.imageUrl) {
      throw new Error("No image URL received from the server");
    }

    console.log("Image generated successfully");

    return {
      success: true,
      imageUrl: data.imageUrl,
      prompt: prompt.trim(),
    };
  } catch (error) {
    console.error("Image generation error:", error);
    return {
      success: false,
      error: error.message || "Failed to generate image",
    };
  }
};

/**
 * Create a BlockNote-compatible image block
 * @param {string} imageUrl - The image URL (data URL or regular URL)
 * @param {string} caption - Caption for the image (usually the prompt)
 * @param {number} width - Optional width for the image
 * @returns {Object} - BlockNote image block
 */
export const createImageBlock = (imageUrl, caption = "", width = 512) => {
  return {
    type: "image",
    props: {
      url: imageUrl,
      caption: caption,
      width: width,
    },
    content: [],
    children: [],
  };
};

/**
 * Extract image generation prompt from voice command
 * @param {string} command - The voice command text
 * @returns {string|null} - Extracted prompt or null if not an image generation command
 */
export const extractImagePrompt = (command) => {
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

/**
 * Check if a voice command is requesting image generation
 * @param {string} command - The voice command text
 * @returns {boolean} - True if it's an image generation request
 */
export const isImageGenerationRequest = (command) => {
  return extractImagePrompt(command) !== null;
};

export default {
  generateImage,
  createImageBlock,
  extractImagePrompt,
  isImageGenerationRequest,
};
