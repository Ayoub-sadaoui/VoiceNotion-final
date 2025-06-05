/**
 * Editor Service
 *
 * Handles interaction with the BlockNote editor in WebView
 */

/**
 * Send a message to the WebView editor
 * @param {Object} webViewRef - Reference to the WebView
 * @param {Object} message - Message to send to the editor
 */
const sendMessageToEditor = (webViewRef, message) => {
  if (webViewRef.current) {
    webViewRef.current.postMessage(JSON.stringify(message));
  } else {
    console.error("WebView reference is not available");
  }
};

/**
 * Get editor content
 * @param {Object} webViewRef - Reference to the WebView
 */
const getEditorContent = (webViewRef) => {
  if (webViewRef.current) {
    sendMessageToEditor(webViewRef, {
      type: "GET_CONTENT",
    });
  }
};

/**
 * Apply text formatting to selected text
 * @param {Object} webViewRef - Reference to the WebView
 * @param {string} format - Format type (bold, italic, underline, link)
 * @param {any} value - Format value
 * @param {string} href - URL for links
 */
const applyTextFormatting = (webViewRef, format, value = true, href = null) => {
  const message = {
    type: "FORMAT_TEXT",
    format,
    value,
  };

  // If format is a link, add href
  if (format === "link" && href) {
    message.href = href;
  }

  sendMessageToEditor(webViewRef, message);
};

/**
 * Insert a block of specific type
 * @param {Object} webViewRef - Reference to the WebView
 * @param {string} blockType - Type of block to insert
 * @param {string} text - Initial text for the block
 * @param {number} level - Level for hierarchical blocks like headings
 */
const insertBlock = (webViewRef, blockType, text = "", level = null) => {
  sendMessageToEditor(webViewRef, {
    type: "CREATE_BLOCK",
    blockType,
    text,
    level,
  });
};

/**
 * Set the editor theme
 * @param {Object} webViewRef - Reference to the WebView
 * @param {string} theme - Theme to apply (light/dark)
 */
const setEditorTheme = (webViewRef, theme = "light") => {
  sendMessageToEditor(webViewRef, {
    type: "SET_THEME",
    theme,
  });
};

/**
 * Save the editor content
 * @param {Object} webViewRef - Reference to the WebView
 * @param {Function} callback - Callback function to handle saved content
 */
const saveContent = (webViewRef, callback) => {
  // First get the current content
  getEditorContent(webViewRef);
  // The callback should be handled in the component that uses this function
  // when it receives the EDITOR_CONTENT message
};

export default {
  sendMessageToEditor,
  getEditorContent,
  applyTextFormatting,
  insertBlock,
  saveContent,
  setEditorTheme,
};
