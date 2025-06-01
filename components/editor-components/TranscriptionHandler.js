"use dom";

/**
 * TranscriptionHandler module
 * Handles text insertion and page link blocks in the editor
 */

/**
 * Inserts transcribed text as a new paragraph in the editor
 * @param {Object} editor - The BlockNote editor instance
 * @param {string} text - The transcribed text to insert
 * @returns {boolean} - Whether the insertion was successful
 */
const insertTranscribedText = (editor, text) => {
  if (!editor || !text) {
    console.warn("Cannot insert text: Editor or text is missing");
    return false;
  }

  try {
    console.log("TranscriptionHandler: Inserting transcribed text:", text);

    // Ensure text is a string
    const safeText = String(text).trim();
    if (!safeText) {
      console.warn("Empty text after trimming, nothing to insert");
      return false;
    }

    // Create a properly formatted paragraph block
    const newBlock = {
      type: "paragraph",
      props: {
        textColor: "default",
        backgroundColor: "default",
        textAlignment: "left",
      },
      content: [
        {
          type: "text",
          text: safeText,
          styles: {},
        },
      ],
      children: [],
    };

    // Get the current blocks
    const blocks = editor.topLevelBlocks;

    // Multiple insertion approaches
    try {
      // Approach 1: Insert after the last block if available
      if (blocks && blocks.length > 0) {
        // Get the last block
        const lastBlock = blocks[blocks.length - 1];
        // Insert after the last block
        editor.insertBlocks([newBlock], lastBlock, "after");
        console.log("Successfully inserted text after last block");
        return true;
      }
      // Approach 2: Insert at the root level if document is empty
      else {
        editor.insertBlocks([newBlock], null, "firstChild");
        console.log("Successfully inserted text at root level");
        return true;
      }
    } catch (error1) {
      console.warn("Standard insertion approaches failed:", error1);

      // Fallback approach - try to use replaceBlocks if insertBlocks failed
      try {
        if (blocks && blocks.length > 0) {
          // Preserve existing blocks and add new one at the end
          const allBlocks = [
            ...blocks.map((block) => ({
              ...block,
            })),
            newBlock,
          ];

          // Replace all blocks with our modified collection
          editor.replaceBlocks(
            editor.document?.map((block) => block.id) || [],
            allBlocks
          );
          console.log(
            "Successfully inserted text using replaceBlocks fallback"
          );
          return true;
        } else {
          // If document is empty, just add our block
          editor.replaceBlocks([], [newBlock]);
          console.log(
            "Successfully replaced empty document with new text block"
          );
          return true;
        }
      } catch (error2) {
        console.error("All insertion approaches failed:", error2);
        return false;
      }
    }
  } catch (error) {
    console.error("Error inserting transcribed text:", error);
    return false;
  }
};

// For backward compatibility
const insertTranscribedTextBlock = insertTranscribedText;

/**
 * Inserts a page link block into the editor
 * @param {Object} editor - The BlockNote editor instance
 * @param {string} pageId - The ID of the page to link to
 * @param {string} pageTitle - The title of the page
 * @param {string} pageIcon - The icon of the page
 * @returns {boolean} - Whether the insertion was successful
 */
const insertPageLinkBlock = (editor, pageId, pageTitle, pageIcon) => {
  if (!editor) return false;

  try {
    console.log("Inserting page link with ID:", pageId, "Title:", pageTitle);

    // Create the page link block structure
    const newPageLinkBlock = {
      type: "pageLink",
      props: {
        pageId: pageId || "",
        pageTitle: pageTitle || "Untitled Page",
        pageIcon: pageIcon || "📄",
      },
    };

    // Get the current selection or use the end of the document
    const blocks = editor.topLevelBlocks;
    const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;

    if (lastBlock) {
      // Insert after the last block in the document
      editor.insertBlocks([newPageLinkBlock], lastBlock, "after");
    } else {
      // If there are no blocks, just insert our link
      editor.insertBlocks([newPageLinkBlock], null, "firstChild");
    }

    // Try to focus editor after insertion
    setTimeout(() => {
      try {
        if (typeof editor.focus === "function") {
          editor.focus();
        }
      } catch (focusError) {
        console.error("Error focusing editor:", focusError);
      }
    }, 100);

    console.log("Page link inserted for page:", pageId);
    return true;
  } catch (error) {
    console.error("Error inserting page link:", error);
    return false;
  }
};

// Export a single default object with all the functions
export default {
  insertTranscribedText,
  insertTranscribedTextBlock,
  insertPageLinkBlock,
};
