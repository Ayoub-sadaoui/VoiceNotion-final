import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useEffect,
} from "react";
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

  // Log available methods on the editor ref when it changes
  useEffect(() => {
    if (editorRef.current) {
      console.log("Editor ref methods:", Object.keys(editorRef.current));

      // Check if the editor ref has the required methods
      if (editorRef.current.insertTranscribedText) {
        console.log("insertTranscribedText method is available");
      } else {
        console.warn(
          "insertTranscribedText method is NOT available on editor ref"
        );
      }
    }
  }, [editorRef.current]);

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

    // Add transcribed text to the editor
    insertTranscribedText: (text, intentData = null) => {
      console.log("Editor.jsx: insertTranscribedText called", text);

      try {
        // First, try with the standard reference method
        if (editorRef.current) {
          if (typeof editorRef.current.insertTranscribedText === "function") {
            console.log("Editor.jsx: Calling internal insertTranscribedText");
            return editorRef.current.insertTranscribedText(text, intentData);
          } else {
            console.log(
              "Editor.jsx: insertTranscribedText not found on editorRef.current"
            );
            console.log(
              "Editor.jsx: Available methods:",
              Object.keys(editorRef.current)
            );

            // Try to load TranscriptionHandler directly for a more direct approach
            try {
              console.log(
                "Editor.jsx: Trying to import TranscriptionHandler directly"
              );
              // Direct import of the handler
              const TranscriptionHandler =
                require("./editor-components/TranscriptionHandler").default;

              // Try to get editor via getEditor method
              if (
                editorRef.current.getEditor &&
                typeof editorRef.current.getEditor === "function"
              ) {
                console.log(
                  "Editor.jsx: Found getEditor method, trying to access editor"
                );
                const editor = editorRef.current.getEditor();
                if (editor) {
                  console.log(
                    "Editor.jsx: Got editor instance, attempting direct insertion"
                  );
                  const result = TranscriptionHandler.insertTranscribedText(
                    editor,
                    text
                  );
                  if (result) {
                    console.log(
                      "Editor.jsx: Successfully inserted text via direct TranscriptionHandler"
                    );
                    return true;
                  }
                }
              }
            } catch (importError) {
              console.error(
                "Editor.jsx: Error importing or using TranscriptionHandler:",
                importError
              );
            }

            // Try to get internal editor
            if (
              editorRef.current.getEditor &&
              typeof editorRef.current.getEditor === "function"
            ) {
              console.log(
                "Editor.jsx: Trying to access internal editor anyway"
              );
              try {
                const editor = editorRef.current.getEditor();

                if (editor) {
                  console.log(
                    "Editor.jsx: Got internal editor, creating block directly"
                  );

                  // Create paragraph block
                  const newBlock = {
                    type: "paragraph",
                    props: {
                      textColor: "default",
                      backgroundColor: "default",
                      textAlignment: "left",
                    },
                    content: [
                      {
                        type: "text",
                        text: text,
                        styles: {},
                      },
                    ],
                    children: [],
                  };

                  console.log(
                    "Editor.jsx: Editor methods:",
                    Object.keys(editor)
                  );

                  // Try to insert the block
                  if (
                    editor.topLevelBlocks &&
                    editor.topLevelBlocks.length > 0
                  ) {
                    const lastBlock =
                      editor.topLevelBlocks[editor.topLevelBlocks.length - 1];
                    editor.insertBlocks([newBlock], lastBlock, "after");
                    console.log(
                      "Editor.jsx: Successfully inserted using direct block insertion"
                    );
                    return true;
                  } else {
                    editor.insertBlocks([newBlock], null, "firstChild");
                    console.log(
                      "Editor.jsx: Successfully inserted at root using direct block insertion"
                    );
                    return true;
                  }
                }
              } catch (error) {
                console.error(
                  "Editor.jsx: Error trying alternative insertion:",
                  error
                );
              }
            }
          }
        }

        console.error("Editor.jsx: All insertion methods failed");
        return false;
      } catch (error) {
        console.error(
          "Editor.jsx: Uncaught error in insertTranscribedText:",
          error
        );
        return false;
      }
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

  try {
    // Import the web version of the editor for both web and mobile platforms
    // since we're using Expo's DOM component feature
    const EditorComponent = require("./Editor.web").default;

    return (
      <EditorComponent
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
