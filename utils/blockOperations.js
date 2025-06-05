/**
 * Utility functions for block operations in the editor
 */

/**
 * Validates if a block has the correct structure for BlockNote
 * @param {Object} block - The block to validate
 * @returns {boolean} - Whether the block has a valid structure
 */
export const validateBlockFormat = (block) => {
  if (!block || typeof block !== "object") {
    console.error("Invalid block: not an object");
    return false;
  }

  // Check required fields
  if (!block.type || !block.props || !Array.isArray(block.children)) {
    console.error(
      "Block missing required fields (type, props, or children array)"
    );
    return false;
  }

  // Special validation for pageLink blocks
  if (block.type === "pageLink") {
    // Check required props
    if (!block.props.pageId || !block.props.pageTitle) {
      console.error(
        "PageLink block missing required props (pageId or pageTitle)"
      );
      return false;
    }

    // PageLinkBlock requires content: "none" which means empty content array
    if (!Array.isArray(block.content) || block.content.length !== 0) {
      console.error("PageLink blocks must have empty content array");
      return false;
    }

    return true;
  }

  // For non-pageLink blocks, check content array
  if (!Array.isArray(block.content)) {
    console.error("Block content must be an array");
    return false;
  }

  // Standard validation for other block types
  return (
    block.content.length > 0 &&
    block.content.every(
      (item) =>
        item &&
        typeof item.type === "string" &&
        typeof item.text === "string" &&
        typeof item.styles === "object"
    )
  );
};

/**
 * Delete specific blocks from editor content based on their indices
 * @param {Array} editorContent - The current editor content with blocks
 * @param {Array} targetIndices - Array of indices of blocks to delete (0-based)
 * @returns {Array} - The updated editor content with blocks removed
 */
export const deleteBlocksByIndices = (editorContent, targetIndices) => {
  if (!editorContent || !Array.isArray(editorContent)) {
    console.error("Invalid editor content");
    return editorContent;
  }

  if (
    !targetIndices ||
    !Array.isArray(targetIndices) ||
    targetIndices.length === 0
  ) {
    console.warn("No target indices provided for deletion");
    return editorContent;
  }

  // Sort indices in descending order to avoid index shifting during removal
  const sortedIndices = [...targetIndices].sort((a, b) => b - a);

  // Create a copy of the editor content
  const updatedContent = [...editorContent];

  // Remove blocks from the sorted indices (back to front)
  for (const index of sortedIndices) {
    if (index >= 0 && index < updatedContent.length) {
      updatedContent.splice(index, 1);
    } else {
      console.warn(`Invalid block index for deletion: ${index}`);
    }
  }

  return updatedContent;
};

/**
 * Updates the page content in storage by removing specified blocks
 * @param {Object} page - The current page object
 * @param {Array} targetIndices - Array of indices of blocks to delete (0-based)
 * @param {Function} savePage - The storage service save function
 * @returns {Promise<Object>} - The updated page object
 */
export const deleteBlocksFromStorage = async (
  page,
  targetIndices,
  savePage
) => {
  if (!page || !page.id) {
    console.error("Invalid page object");
    throw new Error("Invalid page object");
  }

  if (
    !targetIndices ||
    !Array.isArray(targetIndices) ||
    targetIndices.length === 0
  ) {
    console.warn("No target indices provided for deletion");
    return page;
  }

  try {
    // Parse the current content JSON
    const currentContent = page.contentJson ? JSON.parse(page.contentJson) : [];

    // Delete the specified blocks
    const updatedContent = deleteBlocksByIndices(currentContent, targetIndices);

    // Create updated page object
    const updatedPage = {
      ...page,
      contentJson: JSON.stringify(updatedContent),
      updatedAt: Date.now(),
    };

    // Save the updated page to storage
    const savedPage = await savePage(updatedPage);

    return {
      page: savedPage,
      content: updatedContent,
    };
  } catch (error) {
    console.error("Error deleting blocks from storage:", error);
    throw new Error("Failed to delete blocks");
  }
};

export default {
  validateBlockFormat,
  deleteBlocksByIndices,
  deleteBlocksFromStorage,
};
