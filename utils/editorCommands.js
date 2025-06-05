/**
 * Editor Commands Utility
 *
 * This module provides functions for executing text formatting commands
 * in the BlockNote editor through WebView messaging.
 */

/**
 * Format types supported by the editor
 */
export const FORMAT_TYPES = {
  BOLD: "bold",
  ITALIC: "italic",
  UNDERLINE: "underline",
  CLEAR: "clear",
};

/**
 * Block types supported by the editor
 */
export const BLOCK_TYPES = {
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
 * Creates a selection command to be sent to the WebView
 *
 * @param {string} selectionType - Type of selection (BLOCK, TEXT, RANGE)
 * @param {Object} params - Parameters for selection
 * @returns {Object} Selection command object
 */
export const createSelectionCommand = (selectionType, params = {}) => {
  return {
    type: "SELECTION",
    selectionType,
    ...params,
  };
};

/**
 * Creates a formatting command to be sent to the WebView
 *
 * @param {string} formatType - Type of formatting from FORMAT_TYPES
 * @param {Object} params - Additional parameters
 * @returns {Object} Formatting command object
 */
export const createFormattingCommand = (formatType, params = {}) => {
  return {
    type: "FORMATTING",
    formatType,
    ...params,
  };
};

/**
 * Creates a block modification command to be sent to the WebView
 *
 * @param {string} modificationType - Type of modification (CHANGE_TYPE, CHANGE_HEADING_LEVEL)
 * @param {Object} params - Additional parameters
 * @returns {Object} Block modification command object
 */
export const createBlockModificationCommand = (
  modificationType,
  params = {}
) => {
  return {
    type: "BLOCK_MODIFICATION",
    modificationType,
    ...params,
  };
};

/**
 * Creates a text replacement command to be sent to the WebView
 *
 * @param {string} findText - Text to find
 * @param {string} replaceWith - Text to replace with
 * @param {Object} params - Additional parameters
 * @returns {Object} Text replacement command object
 */
export const createReplaceTextCommand = (
  findText,
  replaceWith,
  params = {}
) => {
  return {
    type: "REPLACE_TEXT",
    findText,
    replaceWith,
    ...params,
  };
};

/**
 * Creates an undo command to be sent to the WebView
 *
 * @param {number} steps - Number of steps to undo (default: 1)
 * @returns {Object} Undo command object
 */
export const createUndoCommand = (steps = 1) => {
  return {
    type: "UNDO",
    steps,
  };
};

/**
 * Creates a redo command to be sent to the WebView
 *
 * @param {number} steps - Number of steps to redo (default: 1)
 * @returns {Object} Redo command object
 */
export const createRedoCommand = (steps = 1) => {
  return {
    type: "REDO",
    steps,
  };
};

/**
 * Executes an editor command by sending it to the WebView via the editor ref
 *
 * @param {Object} editorRef - Ref to the editor component
 * @param {Object} command - Command object to execute
 * @returns {Promise} Promise that resolves with the result
 */
export const executeEditorCommand = async (editorRef, command) => {
  if (!editorRef?.current) {
    throw new Error("Editor ref is not available");
  }

  // Get the editor instance
  const editor = editorRef.current.getEditor
    ? editorRef.current.getEditor()
    : null;

  if (!editor) {
    throw new Error("Editor instance is not available");
  }

  // Currently, this is a stub as actual implementation will require
  // WebView messaging to execute these commands on the DOM side

  console.log("Would execute command:", command);

  // Return a mock successful result for now
  return {
    success: true,
    message: "Command executed (placeholder)",
  };
};

/**
 * Find text in editor content
 *
 * @param {Array} blocks - Editor blocks to search
 * @param {string} searchText - Text to search for
 * @returns {Array} Array of matches with blockId and text positions
 */
export const findTextInBlocks = (blocks, searchText) => {
  if (!blocks || !Array.isArray(blocks) || !searchText) {
    return [];
  }

  const matches = [];
  const searchLower = searchText.toLowerCase();

  // Helper function to search recursively through blocks
  const searchBlock = (block, path = []) => {
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
          fullText: blockText,
          path: [...path], // Copy of the path to this block
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
      block.children.forEach((child, index) => {
        searchBlock(child, [...path, index]);
      });
    }
  };

  // Start search at top level
  blocks.forEach((block, index) => {
    searchBlock(block, [index]);
  });

  return matches;
};

/**
 * Identifies blocks by position (first, second, last, etc.)
 *
 * @param {Array} blocks - Editor blocks
 * @param {string} position - Position identifier (first, second, last, etc.)
 * @param {string} blockType - Optional block type to filter (paragraph, heading, etc.)
 * @returns {Array} Array of block IDs matching the criteria
 */
export const findBlocksByPosition = (blocks, position, blockType = null) => {
  if (!blocks || !Array.isArray(blocks) || blocks.length === 0) {
    return [];
  }

  // Helper function to flatten blocks with their types
  const flattenBlocks = (blocks, results = []) => {
    blocks.forEach((block) => {
      results.push({
        id: block.id,
        type: block.type,
      });

      if (
        block.children &&
        Array.isArray(block.children) &&
        block.children.length > 0
      ) {
        flattenBlocks(block.children, results);
      }
    });

    return results;
  };

  // Get all blocks in a flat structure
  const allBlocks = flattenBlocks(blocks);

  // Filter by type if specified
  const filteredBlocks = blockType
    ? allBlocks.filter((block) => block.type === blockType)
    : allBlocks;

  // If no blocks match, return empty array
  if (filteredBlocks.length === 0) {
    return [];
  }

  // Handle position keywords
  switch (position.toLowerCase()) {
    case "first":
      return [filteredBlocks[0].id];

    case "second":
      return filteredBlocks.length > 1 ? [filteredBlocks[1].id] : [];

    case "third":
      return filteredBlocks.length > 2 ? [filteredBlocks[2].id] : [];

    case "last":
      return [filteredBlocks[filteredBlocks.length - 1].id];

    case "all":
      return filteredBlocks.map((block) => block.id);

    default:
      // Try to parse as a number (e.g. "1st", "2nd")
      const numMatch = position.match(/^(\d+)/);
      if (numMatch) {
        const index = parseInt(numMatch[1], 10) - 1; // Convert to 0-based
        return index >= 0 && index < filteredBlocks.length
          ? [filteredBlocks[index].id]
          : [];
      }
      return [];
  }
};
