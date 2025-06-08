import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
import { View, StyleSheet, Text } from "react-native";
import usePageStorage from "../hooks/usePageStorage";

// This component is a native wrapper around our DOM Editor.web.jsx component
const Editor = forwardRef((props, ref) => {
  const {
    initialContent,
    theme,
    onChange,
    onNavigateToPage,
    currentPageId,
    keyboardHeight,
    isKeyboardVisible,
    recentTranscription,
    ...otherProps
  } = props;

  const editorRef = useRef(null);

  // Use page storage hooks for CRUD operations
  const { createNewPage, savePage, deletePage } = usePageStorage();

  // Effect to handle recentTranscription updates
  useEffect(() => {
    if (recentTranscription && editorRef.current) {
      // Focus the editor to refresh the view after new transcription
      setTimeout(() => {
        if (typeof editorRef.current.focusEditor === "function") {
          editorRef.current.focusEditor();
        }
      }, 100);
    }
  }, [recentTranscription]);

  // Expose methods to parent components
  useImperativeHandle(ref, () => ({
    // Get the editor content
    getContent: () => {
      if (editorRef.current) {
        return editorRef.current.getContent();
      }
      return null;
    },

    // Insert a page link block
    insertPageLink: (pageId, pageTitle, pageIcon) => {
      if (editorRef.current) {
        return editorRef.current.insertPageLink(pageId, pageTitle, pageIcon);
      }
    },

    // Delete the current page
    deleteCurrentPage: () => {
      if (editorRef.current && currentPageId) {
        return editorRef.current.deleteCurrentPage(currentPageId);
      }
    },

    // Focus the editor to ensure UI refresh
    focusEditor: () => {
      if (editorRef.current) {
        if (typeof editorRef.current.focusEditor === "function") {
          return editorRef.current.focusEditor();
        } else if (
          editorRef.current.getEditor &&
          typeof editorRef.current.getEditor === "function"
        ) {
          try {
            const editor = editorRef.current.getEditor();
            if (editor && typeof editor.focus === "function") {
              editor.focus();
              return true;
            }
          } catch (err) {
            console.error("Error focusing editor:", err);
          }
        }
      }
      return false;
    },

    // Get the currently focused block ID
    getCurrentBlockId: () => {
      if (
        editorRef.current &&
        typeof editorRef.current.getCurrentBlockId === "function"
      ) {
        return editorRef.current.getCurrentBlockId();
      }
      return null;
    },

    // Set content directly - for use with voice commands
    setContent: (content) => {
      if (
        editorRef.current &&
        typeof editorRef.current.setContent === "function"
      ) {
        return editorRef.current.setContent(content);
      }
      return false;
    },

    // DEPRECATED: This method is kept for API compatibility only
    // Use the direct AsyncStorage approach in note/[id].jsx instead
    // via insertTranscriptionDirectly() function
    insertTranscribedText: (text) => {
      console.warn(
        "Editor.insertTranscribedText is deprecated. Use direct AsyncStorage approach instead via insertTranscriptionDirectly."
      );
      return false;
    },

    // Direct access to the editor instance
    getEditor: () => {
      if (editorRef.current && editorRef.current.getEditor) {
        return editorRef.current.getEditor();
      }
      return null;
    },
  }));

  // Handle content changes from the web editor
  const handleEditorChange = (content) => {
    if (onChange) {
      onChange(content);
    }
  };

  // Handle page navigation requests from the web editor
  const handleNavigateToPage = (pageId) => {
    if (onNavigateToPage) {
      onNavigateToPage(pageId);
    }
  };

  // Handle creating a new nested page
  const handleCreateNestedPage = async (pageTitle, pageIcon) => {
    try {
      if (!currentPageId) {
        console.error("Cannot create nested page: No current page ID provided");
        return Promise.reject(new Error("No current page ID provided"));
      }

      // Create new page with current page as parent
      const newPage = await createNewPage(currentPageId, pageTitle, pageIcon);
      return newPage;
    } catch (err) {
      console.error("Error creating nested page:", err);
      return Promise.reject(err);
    }
  };

  // Handle deleting the current page
  const handleDeletePage = async (pageId) => {
    try {
      if (!pageId) {
        console.error("Cannot delete page: No page ID provided");
        return false;
      }

      // Delete the page
      const result = await deletePage(pageId);

      // If successful and we have a navigation callback, go back
      if (result && onNavigateToPage) {
        // Navigate to parent or home
        onNavigateToPage(null);
      }

      return result;
    } catch (err) {
      console.error("Error deleting page:", err);
      return false;
    }
  };

  try {
    // Import the web version of the editor
    // since we're using Expo's DOM component feature
    const BlockNoteEditorWeb = require("./Editor.web").default;

    return (
      <BlockNoteEditorWeb
        ref={editorRef}
        initialContent={initialContent}
        theme={theme}
        onChange={handleEditorChange}
        onNavigateToPage={handleNavigateToPage}
        onCreateNestedPage={handleCreateNestedPage}
        onDeletePage={handleDeletePage}
        currentPageId={currentPageId}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
        {...otherProps}
      />
    );
  } catch (error) {
    console.error("Error loading Editor.web component:", error);

    // Fallback to placeholder if there's an error loading the editor
    return (
      <View style={styles.container}>
        <View style={styles.placeholder}>
          <Text style={styles.placeholderText}>
            Error loading editor component. Please check console for details.
          </Text>
        </View>
      </View>
    );
  }
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  placeholder: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  placeholderText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
  },
});

export default Editor;
