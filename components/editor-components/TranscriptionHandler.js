"use dom";

/**
 * TranscriptionHandler module
 * DEPRECATED: No longer actively used - AsyncStorage approach is preferred
 * This file is kept for API compatibility only
 */

/**
 * Placeholder for insertTranscribedText - no longer uses BlockNote API directly
 * AsyncStorage approach in note/[id].jsx is used instead
 */
const insertTranscribedText = (editor, text) => {
  console.warn(
    "TranscriptionHandler.insertTranscribedText is deprecated. Use direct AsyncStorage approach instead."
  );
  return false;
};

// For backward compatibility
const insertTranscribedTextBlock = insertTranscribedText;

/**
 * Placeholder for insertPageLinkBlock - no longer uses BlockNote API directly
 * AsyncStorage approach in note/[id].jsx is used instead
 */
const insertPageLinkBlock = (editor, pageId, pageTitle, pageIcon) => {
  console.warn(
    "TranscriptionHandler.insertPageLinkBlock is deprecated. Use direct AsyncStorage approach instead."
  );
  return false;
};

// Export a single default object with all the functions
export default {
  insertTranscribedText,
  insertTranscribedTextBlock,
  insertPageLinkBlock,
};
