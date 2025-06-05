"use dom";

/**
 * TranscriptionHandler module
 * Handles editor operations for voice commands and transcriptions
 */

// Format types for editor operations
const FORMAT_TYPES = {
  BOLD: "bold",
  ITALIC: "italic",
  UNDERLINE: "underline",
  CLEAR: "clear",
};

// Block types for editor operations
const BLOCK_TYPES = {
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  BULLET_LIST: "bulletList",
  NUMBERED_LIST: "numberedList",
  TODO_LIST: "todoList",
  QUOTE: "quote",
  CODE: "code",
  PAGE_LINK: "pageLink",
};

/**
 * Insert transcribed text into the editor
 * @param {Object} editor - BlockNote editor instance
 * @param {string} text - Raw text to insert
 * @returns {boolean} Success flag
 */
const insertTranscribedText = (editor, text) => {
  try {
    if (!editor || !text) {
      console.error("Missing editor or text for insertTranscribedText");
      return false;
    }

    // Log that we're inserting text directly via BlockNote
    console.log(
      "TranscriptionHandler: Inserting text via BlockNote API:",
      text.substring(0, 50) + (text.length > 50 ? "..." : "")
    );

    // Create a paragraph block with the text
    const newBlock = {
      type: "paragraph",
      content: [
        {
          type: "text",
          text: text,
          styles: {},
        },
      ],
    };

    // Insert at the end
    editor.insertBlocks(
      [newBlock],
      editor.document[editor.document.length - 1]?.id || null,
      "after"
    );

    return true;
  } catch (error) {
    console.error("Error in insertTranscribedText:", error);
    return false;
  }
};

// For backward compatibility
const insertTranscribedTextBlock = insertTranscribedText;

/**
 * Insert a page link block in the editor
 * @param {Object} editor - BlockNote editor instance
 * @param {string} pageId - ID of the page to link to
 * @param {string} pageTitle - Title of the linked page
 * @param {string} pageIcon - Icon for the page (optional)
 * @returns {boolean} Success flag
 */
const insertPageLinkBlock = (editor, pageId, pageTitle, pageIcon = "📄") => {
  try {
    if (!editor || !pageId || !pageTitle) {
      console.error("Missing required params for insertPageLinkBlock");
      return false;
    }

    console.log(
      `TranscriptionHandler: Inserting page link to "${pageTitle}" (${pageId})`
    );

    // Create a page link block with the page reference
    const newBlock = {
      type: "pageLink",
      props: {
        pageId: pageId,
        pageTitle: pageTitle,
        pageIcon: pageIcon || "📄",
      },
      content: [
        {
          type: "text",
          text: pageTitle,
          styles: {},
        },
      ],
    };

    // Insert at the end
    editor.insertBlocks(
      [newBlock],
      editor.document[editor.document.length - 1]?.id || null,
      "after"
    );

    return true;
  } catch (error) {
    console.error("Error in insertPageLinkBlock:", error);
    return false;
  }
};

/**
 * Apply formatting to selected text
 * @param {Object} editor - BlockNote editor instance
 * @param {string} formatType - Type of formatting from FORMAT_TYPES
 * @returns {boolean} Success flag
 */
const applyFormatting = (editor, formatType) => {
  try {
    if (!editor || !formatType) {
      console.error("Missing required params for applyFormatting");
      return false;
    }

    // Map format types to BlockNote commands
    const formatMap = {
      [FORMAT_TYPES.BOLD]: () => editor.formatText({ bold: true }),
      [FORMAT_TYPES.ITALIC]: () => editor.formatText({ italic: true }),
      [FORMAT_TYPES.UNDERLINE]: () => editor.formatText({ underline: true }),
      [FORMAT_TYPES.CLEAR]: () =>
        editor.formatText({
          bold: false,
          italic: false,
          underline: false,
          strike: false,
          code: false,
          textColor: "default",
        }),
    };

    // Execute the formatting function if it exists
    if (formatMap[formatType]) {
      console.log(`TranscriptionHandler: Applying ${formatType} formatting`);
      formatMap[formatType]();
      return true;
    } else {
      console.error(`Unknown format type: ${formatType}`);
      return false;
    }
  } catch (error) {
    console.error(`Error in applyFormatting (${formatType}):`, error);
    return false;
  }
};

/**
 * Change block type
 * @param {Object} editor - BlockNote editor instance
 * @param {string} blockId - ID of the block to modify
 * @param {string} newType - New block type
 * @param {Object} props - Additional properties for the new block
 * @returns {boolean} Success flag
 */
const changeBlockType = (editor, blockId, newType, props = {}) => {
  try {
    if (!editor || !blockId || !newType) {
      console.error("Missing required params for changeBlockType");
      return false;
    }

    console.log(
      `TranscriptionHandler: Changing block ${blockId} to type ${newType}`
    );

    // Get block by ID
    const block = editor.getBlock(blockId);
    if (!block) {
      console.error(`Block with ID ${blockId} not found`);
      return false;
    }

    // Update the block type
    editor.updateBlock(blockId, {
      type: newType,
      props: { ...block.props, ...props },
    });

    return true;
  } catch (error) {
    console.error(`Error in changeBlockType:`, error);
    return false;
  }
};

/**
 * Find text in editor blocks
 * @param {Object} editor - BlockNote editor instance
 * @param {string} searchText - Text to search for
 * @returns {Array} Array of matches with block IDs and positions
 */
const findTextInBlocks = (editor, searchText) => {
  try {
    if (!editor || !searchText) {
      console.error("Missing required params for findTextInBlocks");
      return [];
    }

    console.log(`TranscriptionHandler: Searching for "${searchText}"`);

    const matches = [];
    const blocks = editor.document || [];
    const searchLower = searchText.toLowerCase();

    // Helper function to search recursively
    const searchBlock = (block) => {
      // Check if block has content
      if (block.content && Array.isArray(block.content)) {
        // Join all text segments in the block
        const blockText = block.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("");

        // If no text, skip this block
        if (!blockText) return;

        // Search for matches in lowercase (case-insensitive)
        const blockTextLower = blockText.toLowerCase();
        let startIndex = 0;
        let foundIndex;

        // Find all occurrences
        while (
          (foundIndex = blockTextLower.indexOf(searchLower, startIndex)) !== -1
        ) {
          matches.push({
            blockId: block.id,
            blockType: block.type,
            startOffset: foundIndex,
            endOffset: foundIndex + searchText.length,
            matchedText: blockText.substring(
              foundIndex,
              foundIndex + searchText.length
            ),
          });

          startIndex = foundIndex + 1;
        }
      }

      // Recursively search children blocks if any
      if (
        block.children &&
        Array.isArray(block.children) &&
        block.children.length > 0
      ) {
        block.children.forEach((child) => {
          searchBlock(child);
        });
      }
    };

    // Start search at top level
    blocks.forEach((block) => {
      searchBlock(block);
    });

    return matches;
  } catch (error) {
    console.error("Error in findTextInBlocks:", error);
    return [];
  }
};

/**
 * Select text in the editor
 * @param {Object} editor - BlockNote editor instance
 * @param {string} blockId - ID of the block containing the text
 * @param {number} startOffset - Start position of selection
 * @param {number} endOffset - End position of selection
 * @returns {boolean} Success flag
 */
const selectText = (editor, blockId, startOffset, endOffset) => {
  try {
    if (
      !editor ||
      !blockId ||
      startOffset === undefined ||
      endOffset === undefined
    ) {
      console.error("Missing required params for selectText");
      return false;
    }

    console.log(
      `TranscriptionHandler: Selecting text in block ${blockId} from ${startOffset} to ${endOffset}`
    );

    // Get the block by ID
    const block = editor.getBlock(blockId);
    if (!block) {
      console.error(`Block with ID ${blockId} not found`);
      return false;
    }

    // Set selection - this is a simplified stub as the actual implementation
    // would depend on BlockNote's selection API
    console.log("Selection API would be used here");

    return true;
  } catch (error) {
    console.error("Error in selectText:", error);
    return false;
  }
};

/**
 * Replace text in the editor
 * @param {Object} editor - BlockNote editor instance
 * @param {string} findText - Text to find and replace
 * @param {string} replaceWith - New text to insert
 * @param {Array} targetBlockIds - Optional array of block IDs to limit search scope
 * @returns {Object} Result with success flag and count of replacements
 */
const replaceText = (editor, findText, replaceWith, targetBlockIds = null) => {
  try {
    if (!editor || !findText || replaceWith === undefined) {
      console.error("Missing required params for replaceText");
      return { success: false, count: 0 };
    }

    console.log(
      `TranscriptionHandler: Replacing "${findText}" with "${replaceWith}"`
    );

    // Find occurrences of the text
    let matches = findTextInBlocks(editor, findText);

    // Filter by target blocks if specified
    if (
      targetBlockIds &&
      Array.isArray(targetBlockIds) &&
      targetBlockIds.length > 0
    ) {
      matches = matches.filter((match) =>
        targetBlockIds.includes(match.blockId)
      );
    }

    if (matches.length === 0) {
      console.log(`No matches found for "${findText}"`);
      return { success: true, count: 0 };
    }

    // Sort matches in reverse order to avoid offset changes affecting other replacements
    matches.sort((a, b) => {
      if (a.blockId !== b.blockId) return 0; // If different blocks, order doesn't matter
      return b.startOffset - a.startOffset; // If same block, replace from end to start
    });

    // Perform replacements - this is a simplified stub
    console.log(`Would replace ${matches.length} occurrences`);

    return { success: true, count: matches.length };
  } catch (error) {
    console.error("Error in replaceText:", error);
    return { success: false, count: 0 };
  }
};

/**
 * Perform undo operation
 * @param {Object} editor - BlockNote editor instance
 * @param {number} steps - Number of steps to undo
 * @returns {boolean} Success flag
 */
const undo = (editor, steps = 1) => {
  try {
    if (!editor) {
      console.error("Missing editor for undo");
      return false;
    }

    console.log(`TranscriptionHandler: Undoing ${steps} step(s)`);

    // Execute undo the specified number of times
    for (let i = 0; i < steps; i++) {
      if (editor.canUndo()) {
        editor.undo();
      } else {
        console.log("No more actions to undo");
        break;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in undo:", error);
    return false;
  }
};

/**
 * Perform redo operation
 * @param {Object} editor - BlockNote editor instance
 * @param {number} steps - Number of steps to redo
 * @returns {boolean} Success flag
 */
const redo = (editor, steps = 1) => {
  try {
    if (!editor) {
      console.error("Missing editor for redo");
      return false;
    }

    console.log(`TranscriptionHandler: Redoing ${steps} step(s)`);

    // Execute redo the specified number of times
    for (let i = 0; i < steps; i++) {
      if (editor.canRedo()) {
        editor.redo();
      } else {
        console.log("No more actions to redo");
        break;
      }
    }

    return true;
  } catch (error) {
    console.error("Error in redo:", error);
    return false;
  }
};

/**
 * Gets the currently selected/focused block
 * @param {Object} editor - BlockNote editor instance
 * @returns {Object|null} The selected block or null if none found
 */
const getCurrentBlock = (editor) => {
  try {
    if (!editor) {
      console.error("No editor instance provided to getCurrentBlock");
      return null;
    }

    // Try to get the current selection
    const selection = editor.getSelection();

    if (selection && selection.anchor && selection.anchor.blockId) {
      console.log(`Current selection in block: ${selection.anchor.blockId}`);
      const block = editor.getBlock(selection.anchor.blockId);
      if (block) {
        return block;
      }
    }

    // If no selection found through the API, try the internal state
    if (editor._tiptapEditor && editor._tiptapEditor.state) {
      const { state } = editor._tiptapEditor;

      // Check if there's a selection
      if (state.selection) {
        // Get the block node at the current selection
        const $anchor = state.selection.$anchor;
        if ($anchor) {
          // Try to find the closest block node
          let depth = $anchor.depth;
          while (depth > 0) {
            const node = $anchor.node(depth);
            if (node && node.attrs && node.attrs.id) {
              const blockId = node.attrs.id;
              console.log(`Found block at depth ${depth} with ID: ${blockId}`);
              const block = editor.getBlock(blockId);
              if (block) {
                return block;
              }
            }
            depth--;
          }
        }
      }
    }

    // If all else fails, return the last block as fallback
    const blocks = editor.topLevelBlocks;
    if (blocks && blocks.length > 0) {
      return blocks[blocks.length - 1];
    }

    return null;
  } catch (error) {
    console.error("Error in getCurrentBlock:", error);
    return null;
  }
};

// Export all the handler functions
export default {
  insertTranscribedText,
  insertPageLinkBlock,
  applyFormatting,
  selectText,
  replaceText,
  changeBlockType,
  undo,
  redo,
  findTextInBlocks,
  FORMAT_TYPES,
  BLOCK_TYPES,
  getCurrentBlock,
};
