"use dom";

import React, {
  forwardRef,
  useRef,
  useImperativeHandle,
  useEffect,
} from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";
import "./toolbar.css";
import "./keyboard-toolbar.css";

// Import our modularized editor components
import { BlockNoteEditor } from "./editor-components";
import TranscriptionHandler from "./editor-components/TranscriptionHandler";

// Main editor component
const BlockNoteEditorWeb = forwardRef((props, ref) => {
  // Create a ref to the BlockNoteEditor component
  const editorRef = useRef(null);
  const { recentTranscription, forceRefresh } = props;

  // Effect to handle new transcriptions
  useEffect(() => {
    if (recentTranscription && editorRef.current) {
      // Focus editor to ensure UI updates with new content
      setTimeout(() => {
        if (typeof editorRef.current.focusEditor === "function") {
          editorRef.current.focusEditor();
        }
      }, 100);
    }
  }, [recentTranscription]);

  // Expose methods to the parent component via useImperativeHandle
  useImperativeHandle(ref, () => ({
    // Forward getContent method
    getContent: () => {
      if (editorRef.current) {
        return editorRef.current.getContent();
      }
      return null;
    },

    // Forward setContent method
    setContent: (content) => {
      if (editorRef.current && editorRef.current.setContent) {
        return editorRef.current.setContent(content);
      }
      return false;
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

  return <BlockNoteEditor {...props} ref={editorRef} key={editorKey} />;
});

export default BlockNoteEditorWeb;
