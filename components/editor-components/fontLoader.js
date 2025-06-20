"use dom";

/**
 * Helper function to load Google Fonts in the DOM environment
 * This replaces the local Inter font files from BlockNote with Google Fonts CDN
 */
export const loadGoogleFonts = () => {
  try {
    // Check if fonts are already loaded
    if (document.getElementById("google-fonts-loader")) {
      return;
    }

    // Create a link element for Google Fonts
    const link = document.createElement("link");
    link.id = "google-fonts-loader";
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Inter:wght@100;200;300;400;500;600;700;800;900&display=swap";

    // Append to document head
    document.head.appendChild(link);

    console.log("Google Fonts (Inter) loaded successfully");
  } catch (error) {
    console.error("Error loading Google Fonts:", error);
  }
};

/**
 * Add a fallback font strategy
 */
export const addFallbackFontStyles = () => {
  try {
    // Check if styles are already added
    if (document.getElementById("fallback-font-styles")) {
      return;
    }

    // Create a style element
    const style = document.createElement("style");
    style.id = "fallback-font-styles";
    style.textContent = `
      /* Fallback font strategy */
      * {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
      }
      
      /* Ensure BlockNote elements use the correct font */
      .bn-container, .bn-editor, .bn-block, .bn-inline-content {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif !important;
      }
    `;

    // Append to document head
    document.head.appendChild(style);

    console.log("Fallback font styles added successfully");
  } catch (error) {
    console.error("Error adding fallback font styles:", error);
  }
};

/**
 * Add emergency editor display fixes
 * This applies critical CSS fixes to ensure the editor displays properly
 */
export const addEmergencyEditorFixes = () => {
  try {
    // Check if emergency fixes are already added
    if (document.getElementById("emergency-editor-fixes")) {
      return;
    }

    // Create a style element with critical fixes
    const style = document.createElement("style");
    style.id = "emergency-editor-fixes";
    style.textContent = `
      /* Critical display fixes for BlockNote */
      
      /* Make sure the editor and its container are visible */
      .editor-container {
        display: block !important;
        visibility: visible !important;
        height: 100% !important;
        width: 100% !important;
        min-height: 200px !important;
        opacity: 1 !important;
        overflow: auto !important;
      }
      
      /* Ensure the editor itself is visible */
      .blocknote-editor {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 200px !important;
        background-color: transparent !important;
        position: relative !important;
        z-index: 1 !important;
      }
      
      /* Ensure root elements have proper sizing */
      body, html, #root {
        height: 100% !important;
        min-height: 100% !important;
      }
      
      /* Fix potential issues with the editor content area */
      .bn-container {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        overflow: visible !important;
      }
      
      /* Make sure ProseMirror content is visible */
      .ProseMirror {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        min-height: 150px !important;
        padding: 10px !important;
      }
      
      /* Ensure block components are visible */
      .bn-block {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        margin: 0.5em 0 !important;
      }
    `;

    // Append to document head
    document.head.appendChild(style);

    console.log("Emergency editor fixes applied successfully");
  } catch (error) {
    console.error("Error adding emergency editor fixes:", error);
  }
};

/**
 * Initialize all font loaders and fixes
 */
export const initFontLoaders = () => {
  loadGoogleFonts();
  addFallbackFontStyles();
  addEmergencyEditorFixes();

  // Additional step: Force refresh the layout
  setTimeout(() => {
    try {
      if (document.querySelector(".blocknote-editor")) {
        const event = new Event("resize");
        window.dispatchEvent(event);
        console.log("Triggered window resize event to refresh layout");
      }
    } catch (error) {
      console.error("Error triggering layout refresh:", error);
    }
  }, 500);
};

export default {
  loadGoogleFonts,
  addFallbackFontStyles,
  addEmergencyEditorFixes,
  initFontLoaders,
};
