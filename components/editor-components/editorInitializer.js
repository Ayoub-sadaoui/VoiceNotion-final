"use dom";

/**
 * Editor Initializer - Helps ensure the BlockNote editor loads and displays properly
 * This handles any edge cases and provides fixes for common display issues
 */

/**
 * Detect if we're running in an iOS WebView
 * @returns {boolean} True if running in iOS WebView
 */
export const isIOSWebView = () => {
  try {
    // Check for iOS-specific properties
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;

    // Check for WebView properties
    const isWebView =
      /(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(
        navigator.userAgent
      ) ||
      (window.webkit && window.webkit.messageHandlers);

    return isIOS && isWebView;
  } catch (error) {
    console.error("Error detecting iOS WebView:", error);
    return false;
  }
};

/**
 * Apply iOS-specific fixes to the editor
 */
export const applyIOSFixes = () => {
  try {
    if (!isIOSWebView()) return;

    // Add iOS-specific fixes
    const style = document.createElement("style");
    style.id = "ios-webview-fixes";
    style.textContent = `
      /* iOS WebView specific fixes */
      
      /* Fix scroll behavior */
      .blocknote-editor, .editor-scroll-container {
        -webkit-overflow-scrolling: touch !important;
      }
      
      /* Fix content editing issues */
      .ProseMirror {
        -webkit-user-select: text !important;
        user-select: text !important;
        cursor: text !important;
      }
      
      /* Fix touch handling */
      .ProseMirror * {
        touch-action: auto !important;
      }
      
      /* Fix position:fixed elements */
      .bn-toolbar, .bn-popover, .bn-dropdown, .bn-menu, .bn-color-picker {
        position: absolute !important;
      }
    `;

    document.head.appendChild(style);
    console.log("Applied iOS-specific WebView fixes");
  } catch (error) {
    console.error("Error applying iOS fixes:", error);
  }
};

/**
 * Perform emergency display fixes if editor isn't visible
 * This is a last resort to make the editor appear
 */
export const performEmergencyDisplayFix = () => {
  // Wait for the DOM to be ready
  setTimeout(() => {
    try {
      const editorElement = document.querySelector(".blocknote-editor");
      if (!editorElement) {
        console.warn("Editor element not found for emergency fix");
        return;
      }

      // Check if editor is visible
      const rect = editorElement.getBoundingClientRect();
      const isVisible =
        rect.width > 0 &&
        rect.height > 0 &&
        getComputedStyle(editorElement).display !== "none" &&
        getComputedStyle(editorElement).visibility !== "hidden";

      if (!isVisible) {
        console.warn("Editor not visible, applying emergency fix");

        // Force display properties
        editorElement.style.display = "block";
        editorElement.style.visibility = "visible";
        editorElement.style.opacity = "1";
        editorElement.style.height = "auto";
        editorElement.style.minHeight = "200px";

        // Force parent container visibility
        let parent = editorElement.parentElement;
        while (parent && parent !== document.body) {
          parent.style.display = "block";
          parent.style.visibility = "visible";
          parent.style.opacity = "1";
          parent = parent.parentElement;
        }

        // Force a repaint
        editorElement.style.transform = "translateZ(0)";

        console.log("Applied emergency display fix");
      }
    } catch (error) {
      console.error("Error in emergency display fix:", error);
    }
  }, 1000);
};

/**
 * Initialize the editor with all necessary fixes
 */
export const initializeEditor = () => {
  // Apply iOS-specific fixes if needed
  applyIOSFixes();

  // Schedule emergency display fix
  performEmergencyDisplayFix();

  // Ensure the window event handlers are properly set up
  window.addEventListener("resize", () => {
    // Force refresh editor dimensions on resize
    const editorElement = document.querySelector(".blocknote-editor");
    if (editorElement) {
      editorElement.style.minHeight = "200px";
    }
  });

  console.log("Editor initializer complete");
};

export default {
  isIOSWebView,
  applyIOSFixes,
  performEmergencyDisplayFix,
  initializeEditor,
};
