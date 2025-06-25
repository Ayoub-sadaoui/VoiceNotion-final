import { Platform } from "react-native";
import { supabase } from "../supabaseService.js";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";

/**
 * Uploads an image to the Supabase storage bucket in a cross-platform way.
 *
 * @param {object} imageAsset The asset object from expo-image-picker.
 * @param {string} bucketName The name of the Supabase storage bucket.
 * @returns {Promise<string>} The public URL of the uploaded image.
 */
export const uploadImageAsync = async (imageAsset, bucketName = "images") => {
  if (!imageAsset || !imageAsset.uri) {
    throw new Error("Image asset with URI is required.");
  }

  console.log("Starting image upload process");

  // Extract file info
  const { uri, mimeType } = imageAsset;
  const fileExt =
    (mimeType && mimeType.split("/").pop()) || uri.split(".").pop() || "jpg";

  // Get current user session to organize files by user ID
  const response = await supabase.auth.getSession();
  const session = response?.data?.session;
  const userId = session?.user?.id;

  // Generate a folder name for the upload:
  // - Use userId if authenticated
  // - Use anonymous-{timestamp} if not authenticated
  let folderName;

  if (userId) {
    // Authenticated user - use their user ID as folder name
    folderName = userId;
    console.log(`Using authenticated user folder: ${folderName}`);
  } else {
    // Not authenticated - create a unique anonymous folder name
    // Use a combination of "anonymous" and device-specific identifier if possible
    // This creates a unique folder for each anonymous upload session
    const anonymousId = `anonymous-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 7)}`;
    folderName = anonymousId;
    console.log(`Using anonymous folder: ${folderName}`);
  }

  // Create file path with the appropriate folder name
  const filePath = `${folderName}/${Date.now()}.${fileExt}`;

  console.log(`Using user-specific folder for upload path: ${filePath}`);

  console.log(`Using user-specific folder for upload path: ${filePath}`);
  const contentType = mimeType || `image/${fileExt}`;

  try {
    let uploadData; // Blob for both web & native after conversion

    if (Platform.OS === "web") {
      // Web: fetch the blob directly
      const response = await fetch(uri);
      uploadData = await response.blob();
    } else {
      // Native: read file as base64, convert to ArrayBuffer then to Blob.
      // Using Blob avoids the React-Native fetch "Failed to fetch" crash with raw ArrayBuffer.
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      const arrayBuffer = decode(base64);
      uploadData = new Blob([arrayBuffer], { type: contentType });
    }

    console.log(`Uploading to ${bucketName}/${filePath} (${contentType})`);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uploadData, {
        contentType,
        upsert: true, // Changed to true to allow overwriting
      });

    if (error) {
      console.error("Supabase upload error:", JSON.stringify(error));

      // Handle specific errors with useful messages
      if (
        error.message &&
        error.message.includes("row-level security policy")
      ) {
        throw new Error(
          `Permission denied: Ensure you're uploading to your own folder (${userId}). Error: ${error.message}`
        );
      } else if (error.statusCode === 403) {
        throw new Error(
          `Access denied (403): Unable to upload to "${bucketName}/${filePath}". Check that the bucket exists and is configured for public access.`
        );
      } else {
        throw new Error(`Image upload failed: ${error.message}`);
      }
    }

    // Retrieve the public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("Upload successful. Public URL:", publicData.publicUrl);

    return publicData.publicUrl;
  } catch (error) {
    console.error("An unexpected error occurred during image upload:", error);

    // Enhanced error handling for user-specific folders
    if (error.message && error.message.includes("authentication")) {
      throw new Error(
        "Authentication error: Please login again and retry the upload"
      );
    } else if (error.message && error.message.includes("network")) {
      throw new Error("Network error: Check your internet connection");
    } else if (error.statusCode === 404) {
      throw new Error("Storage bucket not found: Make sure the bucket exists");
    } else if (!error.message) {
      // Add a default message if none exists
      throw new Error(
        "Unknown upload error. Please try again or check console for details."
      );
    }

    // If we get here, pass through the original error
    throw error;
  }
};
