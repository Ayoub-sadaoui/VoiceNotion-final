"use dom";

import React, { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";

// Create a custom block for AI image generation
const ImageGeneratorBlock = createReactBlockSpec(
  {
    type: "imageGenerator",
    propSchema: {
      prompt: { default: "" },
    },
    content: "none", // This block doesn't allow content inside it
  },
  {
    render: (props) => {
      const { block, editor } = props;
      const [inputPrompt, setInputPrompt] = useState(block.props.prompt || "");
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState("");

      const handleGenerateImage = async () => {
        if (!inputPrompt.trim()) {
          setError("Please enter a description for the image");
          return;
        }

        setIsLoading(true);
        setError("");

        try {
          // Call the Supabase Edge Function for secure image generation
          const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
          const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

          if (!supabaseUrl) {
            throw new Error("Supabase configuration missing");
          }

          const response = await fetch(
            `${supabaseUrl}/functions/v1/generate-image`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${supabaseAnonKey}`,
              },
              body: JSON.stringify({
                prompt: inputPrompt.trim(),
              }),
            }
          );

          if (!response.ok) {
            throw new Error(`Failed to generate image: ${response.statusText}`);
          }

          const data = await response.json();

          if (!data.imageUrl) {
            throw new Error("No image URL received from the server");
          }

          // Get the current block's position
          const currentBlock = editor.getTextCursorPosition().block;

          if (!currentBlock) {
            throw new Error("Unable to determine current position in editor");
          }

          // Insert a standard image block right after the current image generator block
          await editor.insertBlocks(
            [
              {
                type: "image",
                props: {
                  url: data.imageUrl,
                  caption: inputPrompt.trim(),
                  width: 512, // Set reasonable default width
                },
              },
            ],
            currentBlock,
            "after"
          );

          // Remove the image generator block after successful insertion
          editor.removeBlocks([currentBlock]);

          // Show success feedback (you could enhance this with a toast notification)
          console.log("Image generated and inserted successfully!");
        } catch (err) {
          console.error("Image generation error:", err);
          setError(
            err.message && err.message.includes("determine current position")
              ? "Unable to insert image. Please try clicking in the editor first."
              : err.message || "Failed to generate image. Please try again."
          );
        } finally {
          setIsLoading(false);
        }
      };

      const handleInputChange = (e) => {
        const newPrompt = e.target.value;

        // Clear error when user starts typing
        if (error) {
          setError("");
        }

        setInputPrompt(newPrompt);

        // Update the block's props to persist the prompt
        editor.updateBlock(block, {
          props: { prompt: newPrompt },
        });
      };

      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            margin: "8px 0",
            borderRadius: "12px",
            background:
              "linear-gradient(135deg, rgba(139, 69, 255, 0.1), rgba(59, 130, 246, 0.1))",
            border: "2px dashed rgba(139, 69, 255, 0.3)",
            transition: "all 0.2s ease",
            width: "100%",
            minHeight: "120px",
          }}
        >
          {/* Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "12px",
              fontSize: "16px",
              fontWeight: "600",
              color: "rgba(139, 69, 255, 0.8)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span style={{ marginRight: "8px", fontSize: "20px" }}>🎨</span>
              AI Image Generator
            </div>
            {!isLoading && (
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(139, 69, 255, 0.6)",
                  fontWeight: "400",
                  fontStyle: "italic",
                }}
              >
                {inputPrompt.trim().length > 0
                  ? `${inputPrompt.trim().length}/1000 characters`
                  : "Enter your description"}
              </div>
            )}
          </div>

          {/* Input Field */}
          <textarea
            value={inputPrompt}
            onChange={handleInputChange}
            placeholder="Describe the image you want to generate (e.g., 'a futuristic city at sunset', 'a cat wearing sunglasses', 'abstract geometric patterns in blue and gold')"
            disabled={isLoading}
            maxLength={1000}
            rows={3}
            style={{
              width: "100%",
              padding: "12px 16px",
              marginBottom: "12px",
              borderRadius: "8px",
              border: `1px solid ${
                error ? "rgba(239, 68, 68, 0.5)" : "rgba(139, 69, 255, 0.2)"
              }`,
              background: "rgba(255, 255, 255, 0.9)",
              fontSize: "14px",
              outline: "none",
              transition: "all 0.2s ease",
              opacity: isLoading ? 0.6 : 1,
              resize: "vertical",
              minHeight: "80px",
              fontFamily: "inherit",
              lineHeight: "1.4",
            }}
            onFocus={(e) => {
              e.target.style.borderColor = "rgba(139, 69, 255, 0.5)";
              e.target.style.boxShadow = "0 0 0 3px rgba(139, 69, 255, 0.1)";
            }}
            onBlur={(e) => {
              e.target.style.borderColor = error
                ? "rgba(239, 68, 68, 0.5)"
                : "rgba(139, 69, 255, 0.2)";
              e.target.style.boxShadow = "none";
            }}
          />

          {/* Action Row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            {/* Generate Button */}
            <button
              onClick={handleGenerateImage}
              disabled={isLoading || !inputPrompt.trim()}
              style={{
                padding: "10px 20px",
                borderRadius: "8px",
                border: "none",
                background:
                  isLoading || !inputPrompt.trim()
                    ? "rgba(139, 69, 255, 0.3)"
                    : "linear-gradient(135deg, rgba(139, 69, 255, 1), rgba(59, 130, 246, 1))",
                color: "white",
                fontSize: "14px",
                fontWeight: "600",
                cursor:
                  isLoading || !inputPrompt.trim() ? "not-allowed" : "pointer",
                transition: "all 0.2s ease",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {isLoading ? (
                <>
                  <div
                    style={{
                      width: "14px",
                      height: "14px",
                      border: "2px solid transparent",
                      borderTop: "2px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  Generating...
                </>
              ) : (
                <>
                  <span>✨</span>
                  Generate Image
                </>
              )}
            </button>

            {/* Loading Indicator Text */}
            {isLoading && (
              <div
                style={{
                  fontSize: "12px",
                  color: "rgba(139, 69, 255, 0.7)",
                  fontStyle: "italic",
                }}
              >
                This may take a few moments...
              </div>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div
              style={{
                marginTop: "12px",
                padding: "8px 12px",
                borderRadius: "6px",
                background: "rgba(239, 68, 68, 0.1)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                color: "rgba(239, 68, 68, 0.8)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <span>⚠️</span>
              {error}
            </div>
          )}

          {/* CSS for spinner animation */}
          <style>
            {`
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
            `}
          </style>
        </div>
      );
    },
  }
);

export default ImageGeneratorBlock;
