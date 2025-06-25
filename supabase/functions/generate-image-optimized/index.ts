import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import "https://deno.land/std@0.177.0/dotenv/load.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ImageGenRequest {
  prompt: string;
}

interface ImageGenResponse {
  imageUrl: string;
  prompt: string;
}

// Helper function to upload base64 image to Supabase Storage
async function uploadImageToStorage(
  supabase: any,
  base64Data: string,
  prompt: string
): Promise<string> {
  try {
    // Extract base64 content (remove data:image/png;base64, prefix if present)
    const base64Content = base64Data.includes(",")
      ? base64Data.split(",")[1]
      : base64Data;

    // Convert base64 to Uint8Array
    const imageBuffer = Uint8Array.from(atob(base64Content), (c) =>
      c.charCodeAt(0)
    );

    // Generate a unique filename
    const timestamp = Date.now();
    const promptSlug = prompt
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 30);
    const filename = `ai-generated/${timestamp}-${promptSlug}.png`;

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from("images")
      .upload(filename, imageBuffer, {
        contentType: "image/png",
        cacheControl: "31536000", // Cache for 1 year
        upsert: false,
      });

    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: publicData } = supabase.storage
      .from("images")
      .getPublicUrl(filename);

    console.log("Image uploaded successfully:", publicData.publicUrl);
    return publicData.publicUrl;
  } catch (error) {
    console.error("Error uploading image to storage:", error);
    throw error;
  }
}

// Helper function to create JWT for Google Cloud authentication
async function createJWT(
  serviceAccountKey: string,
  projectId: string
): Promise<string> {
  try {
    const serviceAccount = JSON.parse(serviceAccountKey);
    const header = {
      alg: "RS256",
      typ: "JWT",
      kid: serviceAccount.private_key_id,
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
      scope: "https://www.googleapis.com/auth/cloud-platform",
    };

    const encoder = new TextEncoder();
    const headerEncoded = btoa(JSON.stringify(header))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const payloadEncoded = btoa(JSON.stringify(payload))
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");
    const dataToSign = `${headerEncoded}.${payloadEncoded}`;

    const privateKey = await crypto.subtle.importKey(
      "pkcs8",
      new Uint8Array(
        atob(
          serviceAccount.private_key.replace(
            /-----BEGIN PRIVATE KEY-----|\-----END PRIVATE KEY-----|\n/g,
            ""
          )
        )
          .split("")
          .map((c) => c.charCodeAt(0))
      ),
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );

    const signature = await crypto.subtle.sign(
      "RSASSA-PKCS1-v1_5",
      privateKey,
      encoder.encode(dataToSign)
    );
    const signatureEncoded = btoa(
      String.fromCharCode(...new Uint8Array(signature))
    )
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

    return `${dataToSign}.${signatureEncoded}`;
  } catch (error) {
    console.error("Error creating JWT:", error);
    throw new Error("Failed to create authentication token");
  }
}

// Helper function to get OAuth2 access token
async function getAccessToken(jwt: string): Promise<string> {
  try {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OAuth2 error response:", errorText);
      throw new Error(`OAuth2 request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error);
    throw error;
  }
}

const MAX_PROMPT_LENGTH = 1000; // Increase token limit for prompt
const MAX_RESPONSE_LENGTH = 2000; // Increase token limit for response

serve(async (req) => {
  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request body
    const requestBody = await req.json();
    const { prompt }: ImageGenRequest = requestBody;

    if (!requestBody || !requestBody.prompt) {
      return new Response(
        JSON.stringify({ error: "Invalid request body or missing prompt." }),
        { status: 400, headers: corsHeaders }
      );
    }

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Valid prompt is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("Generating image for prompt:", prompt);

    // Replace Deno.env with hardcoded values for testing
    const supabaseUrl = "YOUR_SUPABASE_URL";
    const supabaseAnonKey = "YOUR_SUPABASE_ANON_KEY";
    const projectId = "YOUR_PROJECT_ID";
    const serviceAccountKey = "YOUR_SERVICE_ACCOUNT_KEY";

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration missing");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    if (!projectId || !serviceAccountKey) {
      return new Response(
        JSON.stringify({
          error:
            "Google Cloud configuration missing. Please set GOOGLE_CLOUD_PROJECT_ID and GOOGLE_CLOUD_SERVICE_ACCOUNT_KEY environment variables.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    try {
      // Create JWT and get access token
      console.log("Creating authentication token...");
      const jwt = await createJWT(serviceAccountKey, projectId);
      const accessToken = await getAccessToken(jwt);

      // Call Vertex AI Imagen API
      console.log("Calling Vertex AI Imagen API...");
      const vertexAiUrl = `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagegeneration@006:predict`;

      const requestBody = {
        instances: [
          {
            prompt: prompt.trim(),
          },
        ],
        parameters: {
          sampleCount: 1,
          aspectRatio: "1:1",
          safetyFilterLevel: "block_some",
          personGeneration: "allow_adult",
        },
      };

      // Correct requestBody structure
      const parsedRequestBody = await req.json();
      const parsedPrompt = parsedRequestBody.instances?.[0]?.prompt || "";
      if (parsedPrompt.length > MAX_PROMPT_LENGTH) {
        return new Response(
          JSON.stringify({ error: "Prompt exceeds maximum allowed length." }),
          { status: 400, headers: corsHeaders }
        );
      }

      const vertexResponse = await fetch(vertexAiUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!vertexResponse.ok) {
        const errorText = await vertexResponse.text();
        console.error("Vertex AI API error:", vertexResponse.status, errorText);
        throw new Error(
          `Vertex AI API error: ${vertexResponse.status} ${errorText}`
        );
      }

      const vertexData = await vertexResponse.json();
      console.log("Received response from Vertex AI");

      // Extract base64 image from response
      if (!vertexData.predictions || vertexData.predictions.length === 0) {
        throw new Error("No image generated by Vertex AI");
      }

      const prediction = vertexData.predictions[0];
      if (!prediction.bytesBase64Encoded) {
        throw new Error("No image data in Vertex AI response");
      }

      console.log("Uploading image to Supabase Storage...");
      // Upload the base64 image to Supabase Storage
      const storageUrl = await uploadImageToStorage(
        supabase,
        prediction.bytesBase64Encoded,
        prompt.trim()
      );

      console.log("Image generation and upload completed successfully");

      // Return the storage URL instead of base64 data
      return new Response(
        JSON.stringify({
          imageUrl: storageUrl,
          prompt: prompt.trim(),
        } as ImageGenResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } catch (vertexError) {
      console.error("Vertex AI error:", vertexError);
      return new Response(
        JSON.stringify({
          error: `Image generation failed: ${vertexError.message}`,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error("Error in generate-image function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error. Please try again." }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
