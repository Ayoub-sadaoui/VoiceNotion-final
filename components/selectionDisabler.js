// This script will be injected into the WebView to disable selection UI

// Script to disable browser's default selection UI on mobile devices
// while still allowing programmatic selection

export const selectionDisablerScript = `
(function() {
  // Disable the iOS selection toolbar by preventing default on selectionchange
  document.addEventListener('selectionchange', function(e) {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      // We still allow selection, but disable the toolbar
      document.body.style.webkitUserSelect = 'text';
      document.body.style.userSelect = 'text';
      document.body.style.webkitTouchCallout = 'none';
    }
  });

  // Disable context menu to prevent right-click menu
  document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
    return false;
  });

  // Disable default touch behavior for selection
  document.addEventListener('touchstart', function(e) {
    if (e.touches.length > 1) {
      e.preventDefault(); // Prevent pinch zooming
    }
  }, { passive: false });

  // Add CSS to disable selection handles and toolbar
  const style = document.createElement('style');
  style.textContent = \`
    * {
      -webkit-touch-callout: none !important;
    }
    
    [contenteditable="true"] {
      -webkit-user-select: text !important;
      user-select: text !important;
    }
    
    ::selection {
      background-color: rgba(0, 120, 215, 0.2) !important;
    }
    
    /* Hide selection handles */
    ::-webkit-resizer,
    ::-webkit-scrollbar-corner,
    ::-webkit-inner-spin-button,
    ::-webkit-outer-spin-button,
    ::-webkit-search-cancel-button,
    ::-webkit-search-results-button,
    ::-webkit-search-results-decoration {
      display: none !important;
    }
  \`;
  document.head.appendChild(style);
  
  // Override the default execCommand for copy/paste/cut
  const originalExecCommand = document.execCommand;
  document.execCommand = function(command, showUI, value) {
    // Allow only these commands
    if (['copy', 'paste', 'cut', 'selectAll'].includes(command)) {
      return originalExecCommand.call(document, command, false, value);
    }
    // Block default toolbar actions
    if (['bold', 'italic', 'underline', 'createLink', 'unlink'].includes(command)) {
      return false;
    }
    return originalExecCommand.call(document, command, showUI, value);
  };
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
