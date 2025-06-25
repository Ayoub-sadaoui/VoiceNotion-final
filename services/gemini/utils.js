/**
 * Validate that blocks match BlockNote's expected structure
 * @param {Array} blocks - The blocks to validate
 * @returns {boolean} - Whether the blocks match BlockNote's format
 */
export const validateBlockNoteFormat = (blocks) => {
  if (!Array.isArray(blocks)) return false;

  // Allowed block types and their required properties
  const allowedTypes = {
    paragraph: {},
    heading: { level: [1, 2, 3] },
    bulletListItem: {},
    numberedListItem: {},
    checkListItem: { checked: [true, false] },
    quote: {},
    code: {},
    pageLink: {}, // We'll do custom validation for this type below
  };

  // Standard props all blocks should have
  const standardProps = ["textColor", "backgroundColor", "textAlignment"];

  // Check each block for required properties and structure
  return blocks.every((block) => {
    // Must have type, props, content, and children
    if (
      !block.type ||
      !block.props ||
      !Array.isArray(block.content) ||
      !Array.isArray(block.children)
    ) {
      console.error("Block is missing required fields", block);
      return false;
    }

    // Check if block type is allowed
    if (!allowedTypes[block.type]) {
      console.error(`Invalid block type: ${block.type}`);
      return false;
    }

    // Special validation for pageLink blocks
    if (block.type === "pageLink") {
      // For pageLink, we need pageId, pageTitle, and pageIcon
      const requiredProps = ["pageId", "pageTitle"];
      for (const prop of requiredProps) {
        if (typeof block.props[prop] !== "string") {
          console.error(
            `PageLink block missing required string property: ${prop}`
          );
          return false;
        }
      }

      // pageIcon is optional and defaults to 📄
      if (block.props.pageIcon && typeof block.props.pageIcon !== "string") {
        console.error("PageLink pageIcon must be a string");
        return false;
      }

      // Skip standard props validation for pageLink blocks
      return (
        block.content.length > 0 &&
        typeof block.content[0].type === "string" &&
        typeof block.content[0].text === "string" &&
        typeof block.content[0].styles === "object"
      );
    }

    // Check required properties for specific block types (except pageLink which was handled above)
    const typeProps = allowedTypes[block.type];
    for (const [prop, allowedValues] of Object.entries(typeProps)) {
      if (block.props[prop] === undefined) {
        console.error(
          `Block type ${block.type} is missing required property ${prop}`
        );
        return false;
      }

      // If we have allowed values for this property, check them
      if (
        Array.isArray(allowedValues) &&
        !allowedValues.includes(block.props[prop])
      ) {
        console.error(
          `Invalid value for ${prop} in ${block.type}: ${block.props[prop]}`
        );
        return false;
      }

      // If we have a type requirement, check it
      if (allowedValues === "string" && typeof block.props[prop] !== "string") {
        console.error(`${prop} must be a string in ${block.type}`);
        return false;
      }
    }

    // For all blocks except pageLink, check standard props
    if (block.type !== "pageLink") {
      for (const prop of standardProps) {
        if (block.props[prop] === undefined) {
          console.error(`Block is missing standard property: ${prop}`);
          return false;
        }
      }
    }

    // Validate content format
    if (block.content.length === 0) {
      console.error("Block has empty content array");
      return false;
    }

    // Check content items
    return block.content.every((contentItem) => {
      if (
        !contentItem ||
        typeof contentItem.type !== "string" ||
        typeof contentItem.text !== "string" ||
        typeof contentItem.styles !== "object"
      ) {
        console.error("Invalid content item structure", contentItem);
        return false;
      }
      return true;
    });
  });
};

/**
 * Process the response from Gemini and validate format
 * @param {Array|Object} parsedResponse - The response from Gemini (blocks array or object with createNewPage)
 * @param {string} transcription - The original transcription
 * @returns {Object} - The processed result
 */
export const processGeminiResponse = (parsedResponse, transcription) => {
  // Handle new page creation format
  if (
    typeof parsedResponse === "object" &&
    !Array.isArray(parsedResponse) &&
    parsedResponse.createNewPage === true
  ) {
    // This is a create new page request
    if (
      !Array.isArray(parsedResponse.blocks) ||
      parsedResponse.blocks.length === 0
    ) {
      console.error("Invalid new page format - blocks missing or empty");
      return {
        success: false,
        error: "Invalid new page format",
        rawText: transcription,
      };
    }

    const blocks = parsedResponse.blocks;

    // Validate blocks
    if (!validateBlockNoteFormat(blocks)) {
      console.error("Invalid blocks in new page request");
      return {
        success: false,
        error: "Invalid block format in new page request",
        rawText: transcription,
      };
    }

    // Check if first block is pageLink
    if (blocks[0].type !== "pageLink") {
      console.error("New page request must start with pageLink block");
      return {
        success: false,
        error: "Invalid new page format - missing pageLink",
        rawText: transcription,
      };
    }

    // Get page title and icon
    const pageTitle = blocks[0].props.pageTitle || "New Page";
    const pageIcon = blocks[0].props.pageIcon || "📄";

    console.log("Valid new page request detected with title:", pageTitle);

    // Return success with createNewPage flag and all the blocks
    return {
      success: true,
      createNewPage: true,
      pageTitle: pageTitle,
      pageIcon: pageIcon,
      blocks: blocks,
      rawText: transcription,
    };
  }

  // Regular blocks array processing
  if (!Array.isArray(parsedResponse)) {
    console.error("Response is not an array or new page format");
    return {
      success: false,
      error: "Invalid response format",
      rawText: transcription,
    };
  }

  // Check if the format matches BlockNote's requirements
  if (!validateBlockNoteFormat(parsedResponse)) {
    console.warn(
      "Response doesn't match BlockNote format, would need conversion"
    );
    console.log(
      "Sample block structure:",
      JSON.stringify(parsedResponse[0], null, 2)
    );

    // Return error with raw text for fallback
    return {
      success: false,
      error: "Invalid block format",
      rawText: transcription,
    };
  }

  // All good!
  return {
    success: true,
    blocks: parsedResponse,
    rawText: transcription,
  };
};
