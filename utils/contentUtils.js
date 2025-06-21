/**
 * Utility functions for handling editor content
 */

/**
 * Sanitize content to fix any malformed blocks, particularly pageLink blocks
 * @param {Array} content - The content to sanitize
 * @param {string} title - Optional title to use for default content
 * @returns {Array} - The sanitized content
 */
export const sanitizeContentBlocks = (content, title = "New note") => {
  // Check if content is a valid array
  if (!content || !Array.isArray(content) || content.length === 0) {
    console.error(
      "Content is not a valid array or is empty, creating default content"
    );
    return [
      {
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 1,
        },
        content: [
          {
            type: "text",
            text: title,
            styles: {},
          },
        ],
        children: [],
      },
      {
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "",
            styles: {},
          },
        ],
        children: [],
      },
    ];
  }

  try {
    // Create a deep copy to avoid mutating the original content
    const sanitizedContent = JSON.parse(JSON.stringify(content));

    // Sanitize each block
    for (let i = 0; i < sanitizedContent.length; i++) {
      const block = sanitizedContent[i];

      // Skip if block is null or not an object
      if (!block || typeof block !== "object") {
        sanitizedContent[i] = {
          type: "paragraph",
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "",
              styles: {},
            },
          ],
          children: [],
        };
        continue;
      }

      // Ensure block has a type
      if (!block.type || typeof block.type !== "string") {
        block.type = "paragraph";
      }

      // Fix pageLink blocks specifically
      if (block.type === "pageLink") {
        // PageLinkBlock uses content: "none", so we need to completely remove the content array
        // Keep the props.pageId, props.pageTitle, and props.pageIcon
        if (!block.props) {
          block.props = {};
        }

        // Ensure required props exist
        if (!block.props.pageId) {
          // This is required - generate a random ID if missing
          block.props.pageId = `page_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        }

        if (!block.props.pageTitle) {
          block.props.pageTitle = "Untitled Page";
        }

        if (!block.props.pageIcon) {
          block.props.pageIcon = "📄";
        }

        // BlockNote expects blocks with content: "none" to have empty content and children arrays
        block.content = [];
        block.children = [];
      } else {
        // For all other block types, ensure standard block properties
        if (!Array.isArray(block.children)) {
          block.children = [];
        }

        // Ensure proper content array
        if (!Array.isArray(block.content)) {
          block.content = [];
        }

        // Ensure each content item has required fields
        if (block.content.length > 0) {
          block.content.forEach((item, index) => {
            // Skip if item is null or not an object
            if (!item || typeof item !== "object") {
              block.content[index] = {
                type: "text",
                text: "",
                styles: {},
              };
              return;
            }

            item.type = item.type || "text";
            item.text = item.text || "";
            if (typeof item.styles !== "object") {
              item.styles = {};
            }
          });
        } else {
          // Add default content if empty
          block.content = [
            {
              type: "text",
              text: "",
              styles: {},
            },
          ];
        }

        // Ensure proper props
        if (!block.props) {
          block.props = {};
        }

        // For standard blocks, ensure standard props
        if (!block.props.textColor) block.props.textColor = "default";
        if (!block.props.backgroundColor)
          block.props.backgroundColor = "default";
        if (!block.props.textAlignment) block.props.textAlignment = "left";
      }
    }

    return sanitizedContent;
  } catch (error) {
    console.error("Error sanitizing content:", error);
    // Return a safe default if anything goes wrong during sanitization
    return [
      {
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 1,
        },
        content: [
          {
            type: "text",
            text: title,
            styles: {},
          },
        ],
        children: [],
      },
      {
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "",
            styles: {},
          },
        ],
        children: [],
      },
    ];
  }
};

/**
 * Create a default content block for a new page
 * @param {string} title - Page title
 * @returns {Array} - Default content blocks
 */
export const createDefaultContent = (title) => {
  return [
    {
      type: "heading",
      props: {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
        level: 1,
      },
      content: [
        {
          type: "text",
          text: title || "Untitled Page",
          styles: {},
        },
      ],
      children: [],
    },
  ];
};

/**
 * Insert content directly into the editor
 * @param {string|Array} transcriptionData - Content to insert
 * @param {boolean} isRawText - Whether the content is raw text
 * @param {Array} currentContent - Current editor content
 * @param {Function} setEditorContent - State setter for editor content
 * @param {Function} setInitialContent - State setter for initial content
 * @param {Function} setRecentTranscription - State setter for recent transcription
 * @param {Function} setForceRefresh - State setter for force refresh
 * @param {Object} editorRef - Reference to the editor
 * @param {Object} currentPage - Current page object
 * @param {Function} storageSavePage - Function to save page to storage
 * @param {Function} setCurrentPage - State setter for current page
 * @param {Function} setIsSaving - State setter for saving state
 * @param {Function} createParagraphBlock - Function to create a paragraph block
 * @param {Function} validateBlockFormat - Function to validate block format
 * @returns {boolean} - Whether the operation was successful
 */
export const insertContentDirectly = (
  transcriptionData,
  isRawText,
  currentContent,
  setEditorContent,
  setInitialContent,
  setRecentTranscription,
  setForceRefresh,
  editorRef,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setIsSaving,
  createParagraphBlock,
  validateBlockFormat
) => {
  try {
    // Ensure we have valid current content
    if (
      !currentContent ||
      !Array.isArray(currentContent) ||
      currentContent.length === 0
    ) {
      console.log("Creating default content for insertContentDirectly");
      currentContent = [
        {
          type: "paragraph",
          props: {
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: "",
              styles: {},
            },
          ],
          children: [],
        },
      ];
    }

    // Handle different input types
    let newBlocks = [];

    if (isRawText) {
      // Raw text mode - create a paragraph block with the raw text
      if (typeof transcriptionData === "string") {
        // Create a single paragraph block with the raw text
        newBlocks = [createParagraphBlock(transcriptionData)];
      } else {
        console.warn(
          "Expected string for raw text mode, got:",
          typeof transcriptionData
        );
        return false;
      }
    } else {
      // Block mode - use blocks directly
      if (Array.isArray(transcriptionData)) {
        // Multiple blocks passed as array
        newBlocks = transcriptionData;
      } else if (transcriptionData && typeof transcriptionData === "object") {
        // Single block passed as object
        newBlocks = [transcriptionData];
      } else {
        console.warn(
          "Expected array or object for block mode, got:",
          typeof transcriptionData
        );
        return false;
      }
    }

    // Validate all blocks before inserting them
    const validBlocks = newBlocks.filter((block) => {
      const isValid = validateBlockFormat(block);
      if (!isValid) {
        console.warn("Skipping invalid block:", block);
      }
      return isValid;
    });

    if (validBlocks.length === 0) {
      // Show a user-friendly toast if nothing was spoken or no valid block
      if (typeof window !== "undefined" && window.Toast) {
        window.Toast.show({
          type: "info",
          text1: "No Speech Detected",
          text2: "You didn't say anything, so nothing was added.",
          visibilityTime: 2000,
        });
      } else {
        // Fallback for environments where window.Toast is not available
        try {
          const Toast = require("react-native-toast-message").default;
          Toast.show({
            type: "info",
            text1: "No Speech Detected",
            text2: "You didn't say anything, so nothing was added.",
            visibilityTime: 2000,
          });
        } catch (e) {
          // If Toast is not available, just log
          console.warn("No valid blocks to insert and Toast not available");
        }
      }
      return false;
    }

    // Create a copy of current content with new blocks appended
    const updatedContent = [...currentContent, ...validBlocks];

    // Store the recent transcription (for UI feedback)
    if (isRawText && typeof transcriptionData === "string") {
      setRecentTranscription(transcriptionData);
    } else {
      setRecentTranscription("");
    }

    // Update editor content state
    setEditorContent(updatedContent);
    setInitialContent(updatedContent);

    // Force refresh the editor to ensure it shows the new content
    setForceRefresh((prev) => prev + 1);

    // Save the updated content to storage
    if (currentPage && storageSavePage) {
      // Show saving indicator
      setIsSaving(true);

      // Update the page with new content
      const updatedPage = {
        ...currentPage,
        contentJson: JSON.stringify(updatedContent),
        updatedAt: Date.now(),
      };

      // Save to storage
      storageSavePage(updatedPage)
        .then((savedPage) => {
          setCurrentPage(savedPage);
        })
        .catch((error) => {
          console.error("Error saving page with new content:", error);
        })
        .finally(() => {
          setIsSaving(false);
        });
    }

    return true;
  } catch (error) {
    console.error("Error inserting content directly:", error);
    return false;
  }
};

export default {
  sanitizeContentBlocks,
  createDefaultContent,
  insertContentDirectly,
};
