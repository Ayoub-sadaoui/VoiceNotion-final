import React, { forwardRef, useImperativeHandle, useRef } from "react";
import { View, StyleSheet, Text, Platform } from "react-native";
import { WebView } from "react-native-webview";
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
    ...otherProps
  } = props;

  const editorRef = useRef(null);
  const webViewRef = useRef(null);

  // Use page storage hooks for CRUD operations
  const { createNewPage, savePage, deletePage } = usePageStorage();

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
        editorRef.current.insertPageLink(pageId, pageTitle, pageIcon);
      }
    },

    // Delete the current page
    deleteCurrentPage: () => {
      if (editorRef.current && currentPageId) {
        editorRef.current.deleteCurrentPage(currentPageId);
      }
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

      console.log("Creating nested page with parent:", currentPageId);

      // Create new page with current page as parent
      const newPage = await createNewPage(currentPageId, pageTitle, pageIcon);
      console.log("Created new nested page:", newPage.id);
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

  // On DOM platforms, use the web editor directly
  if (Platform.OS === "web") {
    // Import the web version of the editor
    const HelloWorld = require("./Editor.web").default;

    return (
      <HelloWorld
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
  }

  // For now, return a placeholder since WebView integration would require more work
  // This will let us test the navigation without crashing
  return (
    <View style={styles.container}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Editor placeholder - Would show BlockNote editor in web view
        </Text>
      </View>
    </View>
  );
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
