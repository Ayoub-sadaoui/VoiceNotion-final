// This script will be injected into the WebView to disable selection UI

// Script to disable browser's default selection UI on mobile devices
// while still allowing programmatic selection

export const selectionDisablerScript = `
(function() {
  // Disable the selection UI but allow programmatic selection
  document.addEventListener('selectionchange', function() {
    // On iOS, this prevents the selection handles from appearing
    if (document.activeElement && 
        document.activeElement.getAttribute('contenteditable') === 'true') {
      // Allow programmatic selection but prevent UI
      const selection = window.getSelection();
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        // We keep the range but disable the UI visual cues
      }
    }
  });

  // Apply CSS to all contenteditable elements to prevent selection UI
  const style = document.createElement('style');
  style.textContent = \`
    [contenteditable=true] {
      -webkit-user-select: text;
      user-select: text;
      -webkit-tap-highlight-color: transparent;
      -webkit-touch-callout: none;
    }
    
    /* Disable the browser's default context menu */
    [contenteditable=true]::-webkit-context-menu {
      display: none !important;
    }
  \`;
  document.head.appendChild(style);
})();
`;

// Export a function to apply the script programmatically
export const applySelectionDisabler = () => {
  if (typeof document !== "undefined") {
    const script = document.createElement("script");
    script.textContent = selectionDisablerScript;
    document.head.appendChild(script);
    return script;
  }
  return null;
};
