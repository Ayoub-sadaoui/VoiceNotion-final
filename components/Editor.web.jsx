"use dom";

import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
  useState,
} from "react";
// Remove the problematic import
// import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";
import "./toolbar.css";
import "./keyboard-toolbar.css";

// Import our modularized editor components
import { BlockNoteEditor } from "./editor-components";
import TranscriptionHandler from "./editor-components/TranscriptionHandler";
import { initFontLoaders } from "./editor-components/fontLoader";
import { initializeEditor } from "./editor-components/editorInitializer";

// Add this style tag at the top of the component
const dropdownFixStyle = `
  /* Fix for dropdown menus visibility */
  .bn-container [role="menu"],
  .bn-container [role="listbox"],
  .bn-container .bn-popover,
  .bn-container .bn-dropdown,
  .bn-container .bn-menu,
  .bn-container .bn-color-picker,
  .bn-container .bn-block-type-dropdown-menu {
    position: fixed !important;
    z-index: 99999 !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    max-height: none !important;
    overflow: visible !important;
    pointer-events: auto !important;
  }
`;

// Emergency fallback render style
const emergencyFallbackStyle = `
  .emergency-fallback {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', sans-serif;
    padding: 20px;
    background-color: #f9f9f9;
    border: 1px solid #ddd;
    border-radius: 8px;
    height: 100%;
    overflow-y: auto;
    box-sizing: border-box;
  }
  
  .emergency-fallback h1 {
    font-size: 24px;
    margin-bottom: 16px;
    color: #333;
  }
  
  .emergency-fallback p {
    font-size: 16px;
    line-height: 1.5;
    margin-bottom: 12px;
    color: #555;
  }
  
  .emergency-fallback pre {
    background-color: #f0f0f0;
    padding: 10px;
    border-radius: 4px;
    overflow-x: auto;
    font-family: monospace;
    font-size: 14px;
  }
  
  .emergency-fallback-dark {
    background-color: #222;
    border-color: #444;
  }
  
  .emergency-fallback-dark h1 {
    color: #eee;
  }
  
  .emergency-fallback-dark p {
    color: #ccc;
  }
  
  .emergency-fallback-dark pre {
    background-color: #333;
    color: #eee;
  }
`;

// Main editor component
const BlockNoteEditorWeb = forwardRef((props, ref) => {
  // Create a ref to the BlockNoteEditor component
  const editorRef = useRef(null);
  const { recentTranscription, forceRefresh, theme } = props;

  // Add state to track if editor has failed to load
  const [editorFailed, setEditorFailed] = useState(false);
  const [editorContent, setEditorContent] = useState([]);

  // Initialize fonts and apply fixes on mount
  useEffect(() => {
    // Initialize fonts and fixes
    initFontLoaders();
    initializeEditor();

    // Safety timeout to check if editor failed
    const timeout = setTimeout(() => {
      try {
        const editorElement = document.querySelector(".blocknote-editor");
        if (!editorElement || editorElement.offsetHeight === 0) {
          console.warn(
            "Editor failed to load properly, switching to fallback mode"
          );
          setEditorFailed(true);

          // Try to extract content from props.initialContent
          if (props.initialContent && Array.isArray(props.initialContent)) {
            setEditorContent(props.initialContent);
          }
        }
      } catch (error) {
        console.error("Error checking editor state:", error);
        setEditorFailed(true);
      }
    }, 3000);

    return () => clearTimeout(timeout);
  }, [props.initialContent]);

  // Effect to handle new transcriptions
  useEffect(() => {
    if (recentTranscription && editorRef.current) {
      // Focus editor to ensure UI updates with new content
      setTimeout(() => {
        if (typeof editorRef.current.focusEditor === "function") {
          editorRef.current.focusEditor();
        }
      }, 100);

      // Update emergency fallback content if editor failed
      if (editorFailed && typeof recentTranscription === "string") {
        setEditorContent((prev) => {
          // Create a simple text block for the transcription
          const newBlock = {
            type: "paragraph",
            content: [{ type: "text", text: recentTranscription }],
          };
          return [...prev, newBlock];
        });
      }
    }
  }, [recentTranscription, editorFailed]);

  // Expose methods to the parent component via useImperativeHandle
  useImperativeHandle(ref, () => ({
    // Forward getContent method
    getContent: () => {
      if (editorFailed) {
        return editorContent;
      }

      if (editorRef.current) {
        return editorRef.current.getContent();
      }
      return null;
    },

    // Forward setContent method
    setContent: (content) => {
      if (editorFailed) {
        setEditorContent(content);
        return true;
      }

      if (editorRef.current && editorRef.current.setContent) {
        return editorRef.current.setContent(content);
      }
      return false;
    },

    // Get the currently focused block ID
    getCurrentBlockId: () => {
      if (editorFailed) {
        // In fallback mode, return the ID of the last block if available
        if (editorContent.length > 0) {
          return editorContent[editorContent.length - 1].id || "fallback-last";
        }
        return "fallback-default";
      }

      if (editorRef.current && editorRef.current.getCurrentBlockId) {
        try {
          return editorRef.current.getCurrentBlockId();
        } catch (error) {
          console.error("Error getting current block ID:", error);
        }
      }
      return null;
    },

    // Forward insertPageLink method
    insertPageLink: (pageId, pageTitle, pageIcon) => {
      if (editorRef.current && editorRef.current.insertPageLink) {
        return editorRef.current.insertPageLink(pageId, pageTitle, pageIcon);
      }
      return false;
    },

    // Forward deleteCurrentPage method
    deleteCurrentPage: () => {
      if (editorRef.current && editorRef.current.deleteCurrentPage) {
        return editorRef.current.deleteCurrentPage();
      }
    },

    // Forward focusEditor method for UI refresh
    focusEditor: () => {
      if (editorRef.current) {
        // Try using the component's focusEditor method if available
        if (typeof editorRef.current.focusEditor === "function") {
          return editorRef.current.focusEditor();
        }

        // Try to get editor instance directly
        if (typeof editorRef.current.getEditor === "function") {
          try {
            const editor = editorRef.current.getEditor();
            if (editor && typeof editor.focus === "function") {
              editor.focus();
              return true;
            }
          } catch (error) {
            console.error("Error focusing editor:", error);
          }
        }
      }

      return false;
    },

    // Forward the insertTranscribedText method
    insertTranscribedText: (text) => {
      // Try to use the BlockNoteEditor's method first
      if (editorRef.current && editorRef.current.insertTranscribedText) {
        return editorRef.current.insertTranscribedText(text);
      }

      // If that fails, try using the getEditor method to access the editor directly
      if (editorRef.current && editorRef.current.getEditor) {
        try {
          const editor = editorRef.current.getEditor();

          if (editor) {
            // Use the imported TranscriptionHandler
            return TranscriptionHandler.insertTranscribedText(editor, text);
          }
        } catch (error) {
          console.error("Error accessing editor through getEditor:", error);
        }
      }

      return false;
    },

    // Forward getEditor method
    getEditor: () => {
      if (editorRef.current && editorRef.current.getEditor) {
        return editorRef.current.getEditor();
      }
      return null;
    },

    // Forward removePageLinks method
    removePageLinks: (pageIds) => {
      if (editorRef.current && editorRef.current.removePageLinks) {
        return editorRef.current.removePageLinks(pageIds);
      }
      return false;
    },

    // Forward removePageLink method
    removePageLink: (pageId) => {
      if (editorRef.current && editorRef.current.removePageLink) {
        return editorRef.current.removePageLink(pageId);
      }
      return false;
    },
  }));

  // Generate a unique key to force re-render when content changes or when forceRefresh increments
  const editorKey = `editor-${forceRefresh || 0}-${
    recentTranscription ? Date.now() : 0
  }`;

  // Function to render emergency fallback UI
  const renderEmergencyFallback = () => {
    // Generate a simple HTML representation of the content
    const contentHtml = editorContent
      .map((block, index) => {
        if (block.type === "heading") {
          const level = block.props?.level || 1;
          const text = block.content?.[0]?.text || "Heading";
          return `<h${level} key="${index}">${text}</h${level}>`;
        } else if (block.type === "paragraph") {
          const text = block.content?.[0]?.text || "";
          return `<p key="${index}">${text}</p>`;
        } else if (block.type === "bulletListItem") {
          const text = block.content?.[0]?.text || "";
          return `<ul><li key="${index}">${text}</li></ul>`;
        } else if (block.type === "numberedListItem") {
          const text = block.content?.[0]?.text || "";
          return `<ol><li key="${index}">${text}</li></ol>`;
        } else if (block.type === "pageLink") {
          return `<p key="${index}"><b>Page Link: ${
            block.props?.pageTitle || "Untitled"
          }</b></p>`;
        } else {
          return `<p key="${index}">${JSON.stringify(block)}</p>`;
        }
      })
      .join("");

    return (
      <div
        className={`emergency-fallback ${
          theme === "dark" ? "emergency-fallback-dark" : ""
        }`}
        dangerouslySetInnerHTML={{ __html: contentHtml }}
      />
    );
  };

  // If editor failed, render emergency fallback
  if (editorFailed) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: emergencyFallbackStyle }} />
        {renderEmergencyFallback()}
      </>
    );
  }

  // Otherwise render the normal editor
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: dropdownFixStyle }} />
      <BlockNoteEditor {...props} ref={editorRef} key={editorKey} />
    </>
  );
});

export default BlockNoteEditorWeb;
