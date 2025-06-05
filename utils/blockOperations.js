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
 * Delete blocks from storage
 * @param {Object} page - The current page object
 * @param {Array} blockIds - Array of block IDs to delete
 * @param {Function} savePage - Function to save the page
 * @returns {Promise<Object>} - Promise resolving to object with updated page and content
 */
export const deleteBlocksFromStorage = async (page, blockIds, savePage) => {
  if (!page || !Array.isArray(blockIds) || blockIds.length === 0) {
    console.error("Invalid parameters for deleteBlocksFromStorage");
    return null;
  }

  try {
    // Parse the current content
    const contentJson = page.contentJson || "[]";
    let content;

    try {
      content = JSON.parse(contentJson);
    } catch (err) {
      console.error("Error parsing content JSON:", err);
      return null;
    }

    if (!Array.isArray(content)) {
      console.error("Content is not an array");
      return null;
    }

    console.log(
      `Attempting to delete ${blockIds.length} blocks from content with ${content.length} blocks`
    );

    // Create a deep copy of the content to avoid mutation issues
    const updatedContent = JSON.parse(JSON.stringify(content));

    // Helper function to recursively remove blocks by ID
    const removeBlocksById = (blocks, idsToRemove) => {
      // Filter out blocks with IDs in the idsToRemove array
      return blocks.filter((block) => {
        // Check if this block should be removed
        const shouldRemove = idsToRemove.includes(block.id);

        // Log the block being checked
        if (shouldRemove) {
          console.log(`Removing block with ID: ${block.id}`);
        }

        // If the block has children, recursively filter them too
        if (
          block.children &&
          Array.isArray(block.children) &&
          block.children.length > 0
        ) {
          block.children = removeBlocksById(block.children, idsToRemove);
        }

        // Keep the block if it shouldn't be removed
        return !shouldRemove;
      });
    };

    // Remove the blocks
    const filteredContent = removeBlocksById(updatedContent, blockIds);

    // Log the result
    console.log(
      `Content reduced from ${content.length} to ${filteredContent.length} top-level blocks`
    );

    // Create updated page object
    const updatedPage = {
      ...page,
      contentJson: JSON.stringify(filteredContent),
      updatedAt: Date.now(),
    };

    // Save the page
    const savedPage = await savePage(updatedPage);

    // Return the updated page and content
    return {
      page: savedPage,
      content: filteredContent,
    };
  } catch (error) {
    console.error("Error in deleteBlocksFromStorage:", error);
    return null;
  }
};

export default {
  validateBlockFormat,
  deleteBlocksByIndices,
  deleteBlocksFromStorage,
};
