"use dom";

import React, { forwardRef, useRef, useImperativeHandle } from "react";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import "./editor.css";
import "./toolbar.css";
import "./keyboard-toolbar.css";

// Import our modularized editor components
import { BlockNoteEditor } from "./editor-components";
import TranscriptionHandler from "./editor-components/TranscriptionHandler";

// Main editor component
const HelloWorld = forwardRef((props, ref) => {
  // Create a ref to the BlockNoteEditor component
  const editorRef = useRef(null);

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

    // CRITICAL: Explicitly forward the insertTranscribedText method
    insertTranscribedText: (text) => {
      console.log(
        "Editor.web: Forwarding insertTranscribedText call with:",
        text
      );

      // Try to use the BlockNoteEditor's method first
      if (editorRef.current && editorRef.current.insertTranscribedText) {
        console.log("Calling BlockNoteEditor.insertTranscribedText");
        return editorRef.current.insertTranscribedText(text);
      }

      // If that fails, try using the getEditor method to access the editor directly
      if (editorRef.current && editorRef.current.getEditor) {
        try {
          console.log("Using getEditor to access editor directly");
          const editor = editorRef.current.getEditor();

          if (editor) {
            console.log("Got editor instance, inserting text directly");
            // Use the imported TranscriptionHandler
            return TranscriptionHandler.insertTranscribedText(editor, text);
          }
        } catch (error) {
          console.error("Error accessing editor through getEditor:", error);
        }
      }

      console.warn("Editor.web: Failed to insert text with all methods");
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

  return <BlockNoteEditor {...props} ref={editorRef} />;
});

export default HelloWorld;
