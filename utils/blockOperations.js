/**
 * Utility functions for block operations
 */

/**
 * Validate a block format to ensure it has required properties
 * @param {Object} block - Block to validate
 * @returns {boolean} - Whether the block is valid
 */
export const validateBlockFormat = (block) => {
  // Block must be an object
  if (!block || typeof block !== "object") {
    console.error("Block is not an object");
    return false;
  }

  // Block must have a type
  if (!block.type || typeof block.type !== "string") {
    console.error("Block is missing type or type is not a string");
    return false;
  }

  // Special handling for pageLink blocks
  if (block.type === "pageLink") {
    // PageLink blocks must have props with pageId
    if (!block.props || !block.props.pageId) {
      console.error("PageLink block is missing props.pageId");
      return false;
    }

    // PageLink blocks should have empty content array
    if (!Array.isArray(block.content)) {
      block.content = [];
    }

    return true;
  }

  // All other block types

  // Block must have props
  if (!block.props || typeof block.props !== "object") {
    console.error("Block is missing props or props is not an object");
    return false;
  }

  // Block must have content array
  if (!Array.isArray(block.content)) {
    console.error("Block content is not an array");
    return false;
  }

  // Block must have children array
  if (!Array.isArray(block.children)) {
    console.error("Block children is not an array");
    return false;
  }

  // Additional validation for specific block types
  switch (block.type) {
    case "paragraph":
      // No additional validation needed
      break;
    case "heading":
      // Heading must have a level
      if (!block.props.level || typeof block.props.level !== "number") {
        console.error("Heading block is missing props.level");
        return false;
      }
      break;
    case "bulletListItem":
    case "numberedListItem":
      // No additional validation needed
      break;
    case "image":
      // Image must have a url
      if (!block.props.url || typeof block.props.url !== "string") {
        console.error("Image block is missing props.url");
        return false;
      }
      break;
    case "codeBlock":
      // Code block should have a language
      if (!block.props.language) {
        block.props.language = "plaintext";
      }
      break;
    default:
      // For other block types, no additional validation
      break;
  }

  return true;
};

/**
 * Create a new block with the specified type and content
 * @param {string} type - Block type
 * @param {string} content - Block content text
 * @param {Object} props - Block properties
 * @returns {Object} - Created block
 */
export const createBlock = (type, content, props = {}) => {
  // Default props for all block types
  const defaultProps = {
    textColor: "default",
    backgroundColor: "default",
    textAlignment: "left",
  };

  // Merge default props with provided props
  const mergedProps = { ...defaultProps, ...props };

  // Create content array with text
  const contentArray = content
    ? [
        {
          type: "text",
          text: content,
          styles: {},
        },
      ]
    : [];

  // Create the block
  return {
    type,
    props: mergedProps,
    content: contentArray,
    children: [],
  };
};

/**
 * Find blocks by type in content
 * @param {Array} content - Content to search
 * @param {string} type - Block type to find
 * @returns {Array} - Found blocks
 */
export const findBlocksByType = (content, type) => {
  if (!Array.isArray(content) || !type) {
    return [];
  }

  return content.filter((block) => block.type === type);
};

/**
 * Find blocks by ID in content
 * @param {Array} content - Content to search
 * @param {string} id - Block ID to find
 * @returns {Object|null} - Found block or null
 */
export const findBlockById = (content, id) => {
  if (!Array.isArray(content) || !id) {
    return null;
  }

  for (const block of content) {
    if (block.id === id) {
      return block;
    }

    // Check children recursively
    if (Array.isArray(block.children) && block.children.length > 0) {
      const found = findBlockById(block.children, id);
      if (found) {
        return found;
      }
    }
  }

  return null;
};

/**
 * Extract text content from a block
 * @param {Object} block - Block to extract text from
 * @returns {string} - Extracted text
 */
export const extractTextFromBlock = (block) => {
  if (!block || !Array.isArray(block.content)) {
    return "";
  }

  return block.content
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("");
};

/**
 * Extract all text content from blocks
 * @param {Array} blocks - Blocks to extract text from
 * @returns {string} - Extracted text
 */
export const extractAllText = (blocks) => {
  if (!Array.isArray(blocks)) {
    return "";
  }

  return blocks.map((block) => extractTextFromBlock(block)).join("\n");
};

/**
 * Clean up invalid page links in content
 * @param {Array} content - Content to clean
 * @param {Array} validPageIds - Valid page IDs
 * @returns {Array} - Cleaned content
 */
export const cleanInvalidPageLinks = (content, validPageIds) => {
  if (!Array.isArray(content)) {
    return content;
  }

  // Create a Set for faster lookups
  const validIds = new Set(validPageIds);

  return content.filter((block) => {
    // Keep non-pageLink blocks
    if (block.type !== "pageLink") {
      return true;
    }

    // Check if the pageLink has a valid pageId
    return (
      block.props && block.props.pageId && validIds.has(block.props.pageId)
    );
  });
};

export default {
  validateBlockFormat,
  createBlock,
  findBlocksByType,
  findBlockById,
  extractTextFromBlock,
  extractAllText,
  cleanInvalidPageLinks,
};
