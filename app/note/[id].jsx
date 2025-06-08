import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePageStorage from "../../hooks/usePageStorage";
import Editor from "../../components/Editor";
import debounce from "lodash.debounce";
import {
  deleteBlocksFromStorage,
  validateBlockFormat,
} from "../../utils/blockOperations";
import Toast from "react-native-toast-message";
import geminiService from "../../services/geminiService";

// Import our custom components
import VoiceRecorder from "../../components/note/VoiceRecorder";
import PageHeader from "../../components/note/PageHeader";
import PageManager from "../../components/note/PageManager";

// This function directly creates and inserts a new paragraph block into editor content
const createParagraphBlock = (text) => {
  // Create a new paragraph block with the transcribed text
  return {
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
};

/**
 * Sanitize content to fix any malformed blocks, particularly pageLink blocks
 * @param {Array} content - The content to sanitize
 * @returns {Array} - The sanitized content
 */
const sanitizeContentBlocks = (content) => {
  if (!Array.isArray(content)) {
    console.error("Content is not an array");
    return content;
  }

  // Create a deep copy to avoid mutating the original content
  const sanitizedContent = JSON.parse(JSON.stringify(content));

  // Sanitize each block
  for (let i = 0; i < sanitizedContent.length; i++) {
    const block = sanitizedContent[i];

    // Fix pageLink blocks specifically
    if (block.type === "pageLink") {
      // PageLinkBlock uses content: "none", so we need to completely remove the content array
      // Keep the props.pageId, props.pageTitle, and props.pageIcon
      if (!block.props) {
        block.props = {};
      }

      // Ensure required props exist
      if (!block.props.pageId) {
        // This is required - generate a random ID if missing
        block.props.pageId = `page_${Math.random()
          .toString(36)
          .substring(2, 9)}`;
      }

      if (!block.props.pageTitle) {
        block.props.pageTitle = "Untitled Page";
      }

      if (!block.props.pageIcon) {
        block.props.pageIcon = "📄";
      }

      // BlockNote expects blocks with content: "none" to have empty content and children arrays
      block.content = [];
      block.children = [];
    } else {
      // For all other block types, ensure standard block properties
      if (!Array.isArray(block.children)) {
        block.children = [];
      }

      // Ensure proper content array
      if (!Array.isArray(block.content)) {
        block.content = [];
      }

      // Ensure each content item has required fields
      if (block.content.length > 0) {
        block.content.forEach((item) => {
          item.type = item.type || "text";
          item.text = item.text || "";
          if (typeof item.styles !== "object") {
            item.styles = {};
          }
        });
      } else {
        // Add default content if empty
        block.content = [
          {
            type: "text",
            text: "",
            styles: {},
          },
        ];
      }

      // Ensure proper props
      if (!block.props) {
        block.props = {};
      }

      // For standard blocks, ensure standard props
      if (!block.props.textColor) block.props.textColor = "default";
      if (!block.props.backgroundColor) block.props.backgroundColor = "default";
      if (!block.props.textAlignment) block.props.textAlignment = "left";
    }
  }

  return sanitizedContent;
};

export default function NoteScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const editorRef = useRef(null);

  // Get page storage functionality
  const {
    getPageById,
    savePage: storageSavePage,
    createNewPage,
    deletePage: storageDeletePage,
    loading: storageLoading,
    error,
    getChildrenOfPage,
    loadAllPages,
  } = usePageStorage();

  // Local state
  const [currentPage, setCurrentPage] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editorContent, setEditorContent] = useState(null);
  const [initialContent, setInitialContent] = useState(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [nestedPages, setNestedPages] = useState([]);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [recentTranscription, setRecentTranscription] = useState(null);

  // History stacks for undo/redo functionality
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isUndoRedoOperation, setIsUndoRedoOperation] = useState(false);
  const lastContentRef = useRef(null);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Get keyboard height from event
        const keyboardHeight = e.endCoordinates.height;
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Load the current page
  useEffect(() => {
    let isMounted = true; // Track if component is mounted

    const loadPage = async () => {
      if (!id) {
        console.error("No ID parameter provided to note page");
        return;
      }

      try {
        setIsLoading(true); // Start loading
        setIsSaving(false); // Reset saving state

        const page = await getPageById(id);

        if (!isMounted) return; // Don't update state if unmounted

        if (page) {
          setCurrentPage(page);
          setTitle(page.title || "Untitled Page");
          setIcon(page.icon || "📄");

          try {
            // Parse the contentJson into an object for the editor
            const contentJson = page.contentJson || "{}";

            const parsedContent =
              contentJson && contentJson !== "{}"
                ? JSON.parse(contentJson)
                : [
                    {
                      type: "heading",
                      props: {
                        textColor: "default",
                        backgroundColor: "default",
                        textAlignment: "left",
                        level: 1,
                      },
                      content: [
                        {
                          type: "text",
                          text: page.title || "Untitled Page",
                          styles: {},
                        },
                      ],
                      children: [],
                    },
                  ];

            // Sanitize content to fix any malformed blocks
            const sanitizedContent = sanitizeContentBlocks(parsedContent);
            console.log("Content sanitized for BlockNote compatibility");

            setInitialContent(sanitizedContent);
          } catch (err) {
            console.error("Error parsing page content:", err);
            // Set fallback content on parse error
            setInitialContent([
              {
                type: "paragraph",
                props: { textAlignment: "left" },
                content: [
                  { type: "text", text: "Error loading content", styles: {} },
                ],
                children: [],
              },
            ]);
          }
          setIsLoading(false); // Finished loading
        } else {
          // Page not found - redirect to home
          console.error("Page not found for ID:", id);
          router.replace("/");
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading page:", err);
          router.replace("/");
        }
      }
    };

    loadPage();

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted = false;
    };
  }, [id, getPageById, router]);

  // Load nested pages
  const loadNestedPages = useCallback(async () => {
    if (!currentPage || !currentPage.id) return;

    try {
      const childPages = await getChildrenOfPage(currentPage.id);
      setNestedPages(childPages);

      // If we have the editor content, check for any page links that don't belong
      if (editorRef.current && editorContent) {
        // Get all page links in the current content
        const pageLinkBlocks = [];
        editorContent.forEach((block) => {
          if (block.type === "pageLink") {
            pageLinkBlocks.push({
              id: block.id,
              pageId: block.props.pageId,
              pageTitle: block.props.pageTitle,
            });
          }
        });

        // Skip validation if there are no page links
        if (pageLinkBlocks.length === 0) {
          return;
        }

        // Collect IDs of page links that don't match any child page
        const invalidLinkIds = [];

        pageLinkBlocks.forEach((link) => {
          // Check if this link corresponds to a child page
          const matchingChild = childPages.find(
            (page) => page.id === link.pageId
          );
          if (!matchingChild) {
            invalidLinkIds.push(link.pageId);
          }
        });

        // If we found invalid links, clean them up
        if (invalidLinkIds.length > 0) {
          // Create a modified copy of the content with links removed
          const modifiedContent = [...editorContent];
          let contentChanged = false;

          // Remove the links from our local copy without using editor methods
          // that would trigger events and cause a full save cycle
          for (let i = modifiedContent.length - 1; i >= 0; i--) {
            const block = modifiedContent[i];
            if (
              block.type === "pageLink" &&
              invalidLinkIds.includes(block.props.pageId)
            ) {
              // Replace the invalid page link with a paragraph
              modifiedContent[i] = {
                type: "paragraph",
                props: {
                  textColor: "default",
                  backgroundColor: "default",
                  textAlignment: "left",
                },
                content: [
                  {
                    type: "text",
                    text: block.props.pageTitle || "Removed link",
                    styles: {},
                  },
                ],
                children: [],
              };
              contentChanged = true;
            }
          }

          // Only update if we actually changed something
          if (contentChanged) {
            // Update the editor directly without triggering the save cycle
            if (editorRef.current && editorRef.current.setContent) {
              editorRef.current.setContent(modifiedContent);
            }

            // Update state with modified content
            setEditorContent(modifiedContent);

            // Save directly without going through the validation cycle again
            const contentJsonString = JSON.stringify(modifiedContent);
            const updatedPage = {
              ...currentPage,
              contentJson: contentJsonString,
              title: title,
              icon: icon,
              updatedAt: Date.now(),
            };

            try {
              const savedPage = await storageSavePage(updatedPage);
              setCurrentPage(savedPage);
            } catch (saveErr) {
              console.error("Error saving page after link cleanup:", saveErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Error loading nested pages:", err);
    }
  }, [
    currentPage,
    getChildrenOfPage,
    editorContent,
    storageSavePage,
    title,
    icon,
  ]);

  // Effect to load nested pages when current page changes
  useEffect(() => {
    if (currentPage && currentPage.id) {
      loadNestedPages();
    }
  }, [currentPage, loadNestedPages]);

  // Handle editor content changes with debounce
  const debouncedSave = useCallback(
    debounce(async (content) => {
      if (!currentPage) {
        console.warn("Cannot auto-save: No page loaded");
        return;
      }

      setIsSaving(true);

      try {
        const contentJsonString = JSON.stringify(content);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          title: title,
          icon: icon,
          updatedAt: Date.now(),
        };

        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);
      } catch (err) {
        console.error("Error during auto-save:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [currentPage, storageSavePage, title, icon]
  );

  // Handle content change from editor with history tracking
  const handleEditorContentChange = useCallback(
    (content) => {
      if (!content) {
        console.warn("Received empty content from editor");
        return;
      }

      // Always update our local state to stay in sync with the editor
      setEditorContent(content);

      // Skip history tracking for undo/redo operations
      if (!isUndoRedoOperation) {
        // Save the previous state to the undo stack if it exists and is different
        if (
          lastContentRef.current &&
          JSON.stringify(lastContentRef.current) !== JSON.stringify(content)
        ) {
          setUndoStack((prevStack) => {
            // Limit stack size to prevent memory issues
            const newStack = [...prevStack, lastContentRef.current].slice(-50);
            return newStack;
          });

          // Clear redo stack when new changes are made
          if (redoStack.length > 0) {
            setRedoStack([]);
          }
        }
      }

      // Update the last content reference
      lastContentRef.current = JSON.parse(JSON.stringify(content));

      // Reset the undo/redo operation flag
      if (isUndoRedoOperation) {
        setIsUndoRedoOperation(false);
      }

      // Debounce the saving to avoid too many writes
      debouncedSave(content);
    },
    [debouncedSave, isUndoRedoOperation, redoStack.length]
  );

  // Update canUndo and canRedo when stacks change
  useEffect(() => {
    setCanUndo(undoStack.length > 0);
  }, [undoStack]);

  useEffect(() => {
    setCanRedo(redoStack.length > 0);
  }, [redoStack]);

  // Initialize lastContentRef when content is loaded
  useEffect(() => {
    if (initialContent && !lastContentRef.current) {
      lastContentRef.current = JSON.parse(JSON.stringify(initialContent));
    }
  }, [initialContent]);

  // Handle undo button press - use local storage approach
  const handleUndo = async () => {
    try {
      console.log("Handling undo with local storage approach");

      if (undoStack.length === 0) {
        console.log("No undo history available");
        Toast.show({
          type: "info",
          text1: "Cannot Undo",
          text2: "No more actions to undo",
          visibilityTime: 2000,
        });
        return;
      }

      // Set the flag to prevent adding to history during this operation
      setIsUndoRedoOperation(true);

      // Get the last state from the undo stack
      const prevStack = [...undoStack];
      const prevState = prevStack.pop();
      setUndoStack(prevStack);

      // Add current state to redo stack
      if (editorContent) {
        setRedoStack((prevRedoStack) => [...prevRedoStack, editorContent]);
      }

      // Update editor content with the previous state
      setEditorContent(prevState);
      setInitialContent(prevState);

      // Update the last content reference
      lastContentRef.current = JSON.parse(JSON.stringify(prevState));

      // Save to storage
      if (currentPage) {
        const contentJsonString = JSON.stringify(prevState);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);

        // Force refresh the editor
        setForceRefresh((prev) => prev + 10);

        // Try to update the editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          editorRef.current.setContent(prevState);
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Undid last change",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error performing undo:", error);
      Toast.show({
        type: "error",
        text1: "Undo Error",
        text2: "Failed to undo",
        visibilityTime: 2000,
      });
      setIsUndoRedoOperation(false);
    }
  };

  // Handle redo button press - use local storage approach
  const handleRedo = async () => {
    try {
      console.log("Handling redo with local storage approach");

      if (redoStack.length === 0) {
        console.log("No redo history available");
        Toast.show({
          type: "info",
          text1: "Cannot Redo",
          text2: "No more actions to redo",
          visibilityTime: 2000,
        });
        return;
      }

      // Set the flag to prevent adding to history during this operation
      setIsUndoRedoOperation(true);

      // Get the last state from the redo stack
      const prevRedoStack = [...redoStack];
      const nextState = prevRedoStack.pop();
      setRedoStack(prevRedoStack);

      // Add current state to undo stack
      if (editorContent) {
        setUndoStack((prevUndoStack) => [...prevUndoStack, editorContent]);
      }

      // Update editor content with the next state
      setEditorContent(nextState);
      setInitialContent(nextState);

      // Update the last content reference
      lastContentRef.current = JSON.parse(JSON.stringify(nextState));

      // Save to storage
      if (currentPage) {
        const contentJsonString = JSON.stringify(nextState);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);

        // Force refresh the editor
        setForceRefresh((prev) => prev + 10);

        // Try to update the editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          editorRef.current.setContent(nextState);
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Redid last undone change",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error performing redo:", error);
      Toast.show({
        type: "error",
        text1: "Redo Error",
        text2: "Failed to redo",
        visibilityTime: 2000,
      });
      setIsUndoRedoOperation(false);
    }
  };

  // Handle UNDO command from voice
  const handleUndoCommand = async (commandResult) => {
    try {
      // Get the number of steps to undo (default to 1)
      const steps = commandResult.steps || 1;

      // Perform undo operations for the specified number of steps
      for (let i = 0; i < steps; i++) {
        if (undoStack.length > 0) {
          await handleUndo();
        } else {
          break;
        }
      }

      if (undoStack.length === 0 && steps > 0) {
        Toast.show({
          type: "info",
          text1: "Cannot Undo",
          text2: "No more actions to undo",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error performing undo command:", error);
      Toast.show({
        type: "error",
        text1: "Undo Error",
        text2: "Failed to undo",
        visibilityTime: 2000,
      });
    }
  };

  // Handle REDO command from voice
  const handleRedoCommand = async (commandResult) => {
    try {
      // Get the number of steps to redo (default to 1)
      const steps = commandResult.steps || 1;

      // Perform redo operations for the specified number of steps
      for (let i = 0; i < steps; i++) {
        if (redoStack.length > 0) {
          await handleRedo();
        } else {
          break;
        }
      }

      if (redoStack.length === 0 && steps > 0) {
        Toast.show({
          type: "info",
          text1: "Cannot Redo",
          text2: "No more actions to redo",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error performing redo command:", error);
      Toast.show({
        type: "error",
        text1: "Redo Error",
        text2: "Failed to redo",
        visibilityTime: 2000,
      });
    }
  };

  // Create and navigate to a new nested page
  const handleInsertNestedPage = async () => {
    const newPage = await PageManager.createNestedPage(
      currentPage,
      createNewPage,
      "New Page",
      "📄"
    );

    await PageManager.insertPageLink(
      editorRef,
      newPage,
      handleSave,
      setIsSaving
    );
  };

  // Handle navigation when a page link is clicked
  const handleNavigateToPage = (pageId) => {
    if (pageId) {
      // Save current page before navigating
      handleSave().then(() => {
        router.push(`/note/${pageId}`);
      });
    }
  };

  // Handle back button
  const handleGoBack = () => {
    // Save changes before navigating
    handleSave().then(() => {
      if (currentPage?.parentId) {
        // Navigate to parent page if it exists
        router.push(`/note/${currentPage.parentId}`);
      } else {
        // Otherwise go back to the previous screen
        router.back();
      }
    });
  };

  // Handle forced save (e.g., when leaving the page)
  const handleSave = async () => {
    return PageManager.savePage(
      currentPage,
      editorContent,
      title,
      icon,
      storageSavePage,
      setIsSaving,
      setCurrentPage
    );
  };

  // Handle title change with automatic saving
  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    if (currentPage) {
      debouncedSave(editorContent || initialContent);
    }
  };

  // Handle icon change
  const handleIconChange = (newIcon) => {
    setIcon(newIcon);
    if (currentPage) {
      debouncedSave(editorContent || initialContent);
    }
  };

  // Handle deleting a page
  const handleDeletePage = async (pageId, isUserInitiated = true) => {
    return PageManager.deletePage(
      pageId,
      currentPage,
      loadAllPages,
      storageDeletePage,
      router,
      editorRef,
      loadNestedPages,
      isUserInitiated
    );
  };

  // Handle creating a nested page
  const handleCreateNestedPage = async (title, icon) => {
    try {
      if (!currentPage || !currentPage.id) {
        console.error("Cannot create nested page: Invalid current page");
        return Promise.reject(new Error("Invalid current page"));
      }

      // Create new page with current page as parent
      const newPage = await createNewPage(
        currentPage.id,
        title || "New Page",
        icon || "📄"
      );

      // Return the created page so Editor.web can use it
      return newPage;
    } catch (err) {
      console.error("Error creating nested page:", err);
      // Re-throw the error so it can be caught by the caller
      return Promise.reject(err);
    }
  };

  // PREFERRED APPROACH: This is the standardized way to add content to the editor
  // It updates local state and persists directly to AsyncStorage without relying on BlockNote API methods
  const insertTranscriptionDirectly = (transcriptionData, isRawText = true) => {
    try {
      // Use editorContent if available, fall back to initialContent
      let currentContent = editorContent;

      if (
        !currentContent ||
        !Array.isArray(currentContent) ||
        currentContent.length === 0
      ) {
        currentContent = initialContent;

        // If even initialContent is not valid, create a basic content structure
        if (
          !currentContent ||
          !Array.isArray(currentContent) ||
          currentContent.length === 0
        ) {
          currentContent = [
            {
              type: "paragraph",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
              },
              content: [
                {
                  type: "text",
                  text: "Note",
                  styles: {},
                },
              ],
              children: [],
            },
          ];
        }
      }

      // Handle different input types
      let newBlocks = [];

      if (isRawText) {
        // Raw text mode - create a paragraph block with the raw text
        if (typeof transcriptionData === "string") {
          // Create a single paragraph block with the raw text
          newBlocks = [createParagraphBlock(transcriptionData)];
        } else {
          console.warn(
            "Expected string for raw text mode, got:",
            typeof transcriptionData
          );
          return false;
        }
      } else {
        // Block mode - use blocks directly
        if (Array.isArray(transcriptionData)) {
          // Multiple blocks passed as array
          newBlocks = transcriptionData;
        } else if (transcriptionData && typeof transcriptionData === "object") {
          // Single block passed as object
          newBlocks = [transcriptionData];
        } else {
          console.warn(
            "Expected array or object for block mode, got:",
            typeof transcriptionData
          );
          return false;
        }
      }

      // Validate all blocks before inserting them
      const invalidBlocks = newBlocks.filter(
        (block) => !validateBlockFormat(block)
      );
      if (invalidBlocks.length > 0) {
        console.error("Found invalid blocks:", invalidBlocks);
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Cannot add content with invalid format",
          visibilityTime: 2000,
        });
        return false;
      }

      // Create a copy of current content with new blocks appended
      const updatedContent = [...currentContent, ...newBlocks];

      // Store the recent transcription (for UI feedback)
      if (isRawText && typeof transcriptionData === "string") {
        setRecentTranscription(transcriptionData);
      } else {
        // For structured blocks, just set something so the UI updates
        setRecentTranscription("New content added");
      }

      // Update the state variables immediately
      setEditorContent(updatedContent);
      setInitialContent(updatedContent);

      // Force a refresh of the editor component
      setForceRefresh((prev) => prev + 1);

      // Try to update the editor content directly if possible
      if (editorRef.current) {
        if (typeof editorRef.current.setContent === "function") {
          editorRef.current.setContent(updatedContent);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              editorRef.current.focusEditor();
            }
          }, 50);
        }
      }

      // Also directly update the page content with the changes
      if (currentPage) {
        const contentJsonString = JSON.stringify(updatedContent);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        // Save the page without using the debounce
        setIsSaving(true);
        storageSavePage(updatedPage)
          .then((savedPage) => {
            setIsSaving(false);
            setCurrentPage(savedPage);

            // Refresh the UI again after save
            setForceRefresh((prev) => prev + 1);
          })
          .catch((err) => {
            console.error("Error saving page with transcription:", err);
            setIsSaving(false);
          });
      }

      return true;
    } catch (error) {
      console.error("Error in direct content insertion:", error);
      return false;
    }
  };

  // Handle all voice commands with a unified approach
  const handleVoiceCommandProcessed = async (commandResult) => {
    if (!commandResult || !commandResult.action) {
      console.warn("Invalid voice command result");
      return;
    }

    console.log("Voice command received:", commandResult.action);

    try {
      // Check if we're in a valid state to process commands
      if (!currentPage || !currentPage.id) {
        console.error("Invalid page state for command execution");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Cannot process command - invalid page state",
          visibilityTime: 2000,
        });
        return;
      }

      // Get the latest editor content to ensure we're working with current data
      const latestContent = editorContent || initialContent || [];
      console.log(`Current editor content has ${latestContent.length} blocks`);

      // For DELETE commands, we need to reprocess with the current content
      if (commandResult.action === "DELETE_BLOCK") {
        if (!latestContent || latestContent.length === 0) {
          console.warn("Cannot execute delete command - no blocks in editor");
          Toast.show({
            type: "info",
            text1: "No Content",
            text2: "There are no blocks to delete",
            visibilityTime: 2000,
          });
          return;
        }

        // Re-process the command with current content
        if (commandResult.rawTranscription) {
          console.log(
            "Re-processing delete command with current editor content"
          );
          const reprocessedResult =
            await geminiService.processVoiceCommandWithGemini(
              commandResult.rawTranscription,
              latestContent
            );

          // Use the reprocessed result if it successfully identified blocks
          if (
            reprocessedResult.success &&
            reprocessedResult.action === "DELETE_BLOCK" &&
            Array.isArray(reprocessedResult.targetBlockIds) &&
            reprocessedResult.targetBlockIds.length > 0
          ) {
            console.log(
              "Successfully identified blocks to delete:",
              reprocessedResult.targetBlockIds
            );
            commandResult = reprocessedResult;
          }
        }
      }

      // Handle different command types
      switch (commandResult.action) {
        case "INSERT_AI_ANSWER":
          // Handle AI answer insertion
          if (commandResult.blocks && Array.isArray(commandResult.blocks)) {
            console.log(
              "Inserting AI answer blocks:",
              commandResult.blocks.length
            );

            // Create a header block to indicate this is an AI answer
            const headerBlock = {
              type: "heading",
              props: {
                textColor: "default",
                backgroundColor: "default",
                textAlignment: "left",
                level: 3,
              },
              content: [
                {
                  type: "text",
                  text: "AI Answer",
                  styles: {
                    bold: true,
                  },
                },
              ],
              children: [],
            };

            // Insert the header followed by the AI-generated blocks
            const blocksToInsert = [headerBlock, ...commandResult.blocks];
            const success = insertTranscriptionDirectly(blocksToInsert, false);

            if (success) {
              Toast.show({
                type: "success",
                text1: "AI Answer Added",
                text2: "The AI response has been added to your note",
                visibilityTime: 2000,
              });
            } else {
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to add AI answer to note",
                visibilityTime: 2000,
              });
            }
          } else {
            console.error("Invalid AI answer format:", commandResult);
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "The AI response was in an invalid format",
              visibilityTime: 2000,
            });
          }
          break;

        case "DELETE_BLOCK":
          await handleDeleteBlockCommand(commandResult);
          break;

        case "INSERT_CONTENT":
          await handleInsertContentCommand(commandResult);
          break;

        case "CREATE_PAGE":
          await handleCreatePageCommand(commandResult);
          break;

        case "APPLY_FORMATTING":
          // Handle formatting text (bold, italic, underline)
          await handleApplyFormattingCommand(commandResult);
          break;

        case "SELECT_TEXT":
          // Handle selecting text or blocks
          await handleSelectTextCommand(commandResult);
          break;

        case "REPLACE_TEXT":
          // Handle replacing text within blocks
          await handleReplaceTextCommand(commandResult);
          break;

        case "MODIFY_BLOCK":
          // Handle changing block types (paragraph to heading, etc.)
          await handleModifyBlockCommand(commandResult);
          break;

        case "UNDO":
          // Handle undo operations
          await handleUndoCommand(commandResult);
          break;

        case "REDO":
          // Handle redo operations
          await handleRedoCommand(commandResult);
          break;

        case "CLARIFICATION":
          // Display the clarification message to the user
          Toast.show({
            type: "info",
            text1: "Command Unclear",
            text2: commandResult.message || "Please be more specific",
            visibilityTime: 3000,
          });
          break;

        default:
          console.warn(`Unknown command action: ${commandResult.action}`);
          Toast.show({
            type: "info",
            text1: "Unknown Command",
            text2: "This command type is not recognized",
            visibilityTime: 2000,
          });
      }
    } catch (error) {
      console.error("Error processing voice command:", error);
      Toast.show({
        type: "error",
        text1: "Command Error",
        text2: "Failed to process your command",
        visibilityTime: 2000,
      });
    }
  };

  // Handle DELETE_BLOCK command
  const handleDeleteBlockCommand = async (commandResult) => {
    try {
      setIsSaving(true);
      console.log("Executing delete block command");

      // Get the latest content
      const currentContent = editorContent || initialContent || [];
      if (!currentContent || currentContent.length === 0) {
        console.warn("No content to delete blocks from");
        Toast.show({
          type: "info",
          text1: "No Content",
          text2: "There are no blocks to delete",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      // Check if we need to use the current selection
      if (commandResult.useCurrentSelection === true) {
        console.log("Using current selection for delete operation");

        // Try to get the currently focused block from the editor
        let currentBlockId = null;

        // First try to get it from the editor reference
        if (
          editorRef.current &&
          typeof editorRef.current.getCurrentBlockId === "function"
        ) {
          try {
            currentBlockId = editorRef.current.getCurrentBlockId();
            console.log(
              "Got current block ID from editor for deletion:",
              currentBlockId
            );
          } catch (error) {
            console.error(
              "Error getting current block ID for deletion:",
              error
            );
          }
        }

        // If that fails, use the last block as a fallback
        if (!currentBlockId && currentContent.length > 0) {
          console.log(
            "No current selection found, using last block as fallback for deletion"
          );
          const lastBlock = currentContent[currentContent.length - 1];
          currentBlockId = lastBlock.id;
          console.log(
            "Using last block ID as fallback for deletion:",
            currentBlockId
          );
        }

        // If we found a block ID, use it for deletion
        if (currentBlockId) {
          commandResult.targetBlockIds = [currentBlockId];
          console.log("Set target block for deletion:", currentBlockId);
        }
      }

      // Validate block IDs to delete
      if (
        !commandResult.targetBlockIds ||
        !Array.isArray(commandResult.targetBlockIds) ||
        commandResult.targetBlockIds.length === 0
      ) {
        console.warn("No valid block IDs to delete");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Could not determine which block(s) to delete",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      // Check if the blocks to delete exist
      const blockExists = (blocks, blockId) => {
        for (const block of blocks) {
          if (block.id === blockId) {
            return true;
          }
          // Check children recursively
          if (
            block.children &&
            Array.isArray(block.children) &&
            block.children.length > 0
          ) {
            if (blockExists(block.children, blockId)) {
              return true;
            }
          }
        }
        return false;
      };

      // Validate that the block IDs exist in the content
      const validBlockIds = commandResult.targetBlockIds.filter((blockId) =>
        blockExists(currentContent, blockId)
      );

      if (validBlockIds.length === 0) {
        console.warn("No valid block IDs found for deletion");
        Toast.show({
          type: "info",
          text1: "Block Not Found",
          text2: "Could not find the specified block to delete",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      console.log(`Found ${validBlockIds.length} valid blocks to delete`);

      // Delete blocks directly from content
      // Make a deep copy of the content
      const updatedContent = JSON.parse(JSON.stringify(currentContent));

      // Helper function to recursively remove blocks by ID
      const removeBlocksById = (blocks, idsToRemove) => {
        return blocks.filter((block) => {
          // Check if this block should be removed
          const shouldRemove = idsToRemove.includes(block.id);

          // If the block has children, recursively filter them too
          if (
            block.children &&
            Array.isArray(block.children) &&
            block.children.length > 0
          ) {
            block.children = removeBlocksById(block.children, idsToRemove);
          }

          // Keep the block if it shouldn't be removed
          return !shouldRemove;
        });
      };

      // Remove the blocks
      const filteredContent = removeBlocksById(updatedContent, validBlockIds);

      // Update state with the new content
      setEditorContent(filteredContent);
      setInitialContent(filteredContent);

      // Save to storage
      if (currentPage) {
        const contentJsonString = JSON.stringify(filteredContent);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);

        // Force refresh the editor
        setForceRefresh((prev) => prev + 10);

        // Try to update the editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          editorRef.current.setContent(filteredContent);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              editorRef.current.focusEditor();
            }
          }, 50);
        }

        // Show success message
        Toast.show({
          type: "success",
          text1: "Success",
          text2:
            validBlockIds.length === 1
              ? "Block deleted successfully"
              : `${validBlockIds.length} blocks deleted successfully`,
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error executing delete command:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to delete block(s)",
        visibilityTime: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle INSERT_CONTENT command
  const handleInsertContentCommand = async (commandResult) => {
    try {
      const content = commandResult.content;
      if (!content) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No content provided to insert",
          visibilityTime: 2000,
        });
        return;
      }

      // Set loading state to indicate processing
      setIsSaving(true);

      // Instead of directly inserting raw text, process it through Gemini to create structured blocks
      try {
        // Process the content through Gemini to create structured blocks based on context
        const structuredResult =
          await geminiService.processTranscriptionWithGemini(content);

        console.log("Structured content result:", structuredResult.success);

        let inserted = false;

        if (structuredResult.success && structuredResult.blocks) {
          // If Gemini successfully created structured blocks, insert them
          inserted = await insertTranscriptionDirectly(
            structuredResult.blocks,
            false
          );
          console.log("Inserted structured blocks for content");
        } else {
          // Fall back to inserting raw text if structuring fails
          inserted = await insertTranscriptionDirectly(content, true);
          console.log("Fell back to inserting raw text");
        }

        if (inserted) {
          Toast.show({
            type: "success",
            text1: "Success",
            text2: "Content added",
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to add content",
            visibilityTime: 2000,
          });
        }
      } catch (processingError) {
        console.error("Error processing content structure:", processingError);

        // Fall back to inserting as raw text if the processing fails
        const inserted = await insertTranscriptionDirectly(content, true);

        if (inserted) {
          Toast.show({
            type: "success",
            text1: "Success",
            text2: "Content added (as plain text)",
            visibilityTime: 2000,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Error",
            text2: "Failed to add content",
            visibilityTime: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Error inserting content:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to add content",
        visibilityTime: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle CREATE_PAGE command
  const handleCreatePageCommand = async (commandResult) => {
    try {
      const { pageTitle, pageContent } = commandResult;

      if (!pageTitle) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No page title provided",
          visibilityTime: 2000,
        });
        return;
      }

      // Save current page first
      await handleSave();

      // Create a new page
      const newPage = await createNewPage(
        currentPage.id, // Make it a child of current page
        pageTitle,
        "📄" // Default icon
      );

      if (!newPage || !newPage.id) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to create new page",
          visibilityTime: 2000,
        });
        return;
      }

      // Add page link to current page with FIXED CONTENT STRUCTURE
      // PageLinkBlock expects content: "none", so create with empty content array
      const pageLinkBlock = {
        type: "pageLink",
        props: {
          pageId: newPage.id,
          pageTitle: newPage.title,
          pageIcon: newPage.icon,
        },
        content: [],
        children: [],
      };

      // Insert page link into the current page
      await insertTranscriptionDirectly(pageLinkBlock, false);

      // If we have content for the new page, add it to the new page
      if (pageContent) {
        // Set a temporary loading state
        setIsSaving(true);

        try {
          // Instead of directly creating a paragraph block, process the content through Gemini
          // to create properly structured blocks based on the content's context
          const structuredResult =
            await geminiService.processTranscriptionWithGemini(pageContent);

          console.log(
            "Structured page content result:",
            structuredResult.success
          );

          // Create initial blocks for the new page with proper structure
          const headingBlock = {
            type: "heading",
            props: {
              level: 1,
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: newPage.title,
                styles: {},
              },
            ],
            children: [],
          };

          // Determine what content blocks to use based on Gemini result
          let contentBlocks = [];

          if (structuredResult.success && structuredResult.blocks) {
            // Use the structured blocks from Gemini
            contentBlocks = structuredResult.blocks;
            console.log("Using AI-structured content for new page");
          } else {
            // Fallback to simple paragraph if structuring failed
            contentBlocks = [createParagraphBlock(pageContent)];
            console.log("Using fallback paragraph for new page content");
          }

          // Combine heading with structured content blocks
          const initialBlocks = [headingBlock, ...contentBlocks];
          const contentJsonString = JSON.stringify(initialBlocks);

          // Save directly to storage without using BlockNote API
          const updatedPage = {
            ...newPage,
            contentJson: contentJsonString,
            updatedAt: Date.now(),
          };

          await storageSavePage(updatedPage);
        } catch (err) {
          console.error("Error processing page content:", err);
          // Fallback to simple paragraph if processing fails
          const headingBlock = {
            type: "heading",
            props: {
              level: 1,
              textColor: "default",
              backgroundColor: "default",
              textAlignment: "left",
            },
            content: [
              {
                type: "text",
                text: newPage.title,
                styles: {},
              },
            ],
            children: [],
          };

          const contentBlock = createParagraphBlock(pageContent);
          const initialBlocks = [headingBlock, contentBlock];
          const contentJsonString = JSON.stringify(initialBlocks);

          // Save the page with fallback content
          const updatedPage = {
            ...newPage,
            contentJson: contentJsonString,
            updatedAt: Date.now(),
          };

          await storageSavePage(updatedPage);
        } finally {
          setIsSaving(false);
        }
      }

      // Reload nested pages to show the new page
      await loadNestedPages();

      // Show success message with navigation option
      Alert.alert(
        "Page Created",
        `New page "${newPage.title}" created successfully. Would you like to navigate to it?`,
        [
          {
            text: "Stay Here",
            style: "cancel",
          },
          {
            text: "Go to Page",
            onPress: () => {
              // Navigate to the new page
              router.push(`/note/${newPage.id}`);
            },
          },
        ]
      );
    } catch (error) {
      console.error("Error creating new page:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create new page",
        visibilityTime: 2000,
      });
    }
  };

  // Handle APPLY_FORMATTING command
  const handleApplyFormattingCommand = async (commandResult) => {
    try {
      // Validate the command result
      if (!commandResult.formattingType) {
        console.warn("Missing formatting type in command");
        Toast.show({
          type: "info",
          text1: "Formatting Error",
          text2: "Please specify what formatting to apply",
          visibilityTime: 2000,
        });
        return;
      }

      // Set loading state
      setIsSaving(true);

      // Get current content
      const currentContent = editorContent || initialContent || [];

      if (currentContent.length === 0) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No content to format",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      // Determine what to format
      let targetText = commandResult.targetText;
      let targetBlockIds = commandResult.targetBlockIds;
      let formatType = commandResult.formattingType?.toLowerCase();

      // Handle "last paragraph" type commands
      if (!targetText && !targetBlockIds && formatType) {
        // If no specific target is provided, format the last block
        const lastBlock = currentContent[currentContent.length - 1];
        targetBlockIds = [lastBlock.id];
      }

      // Make a copy of content to modify
      const updatedContent = JSON.parse(JSON.stringify(currentContent));
      let success = false;

      // Apply formatting to target blocks
      for (const block of updatedContent) {
        if (!targetBlockIds || targetBlockIds.includes(block.id)) {
          // Apply to whole block
          if (block.content && Array.isArray(block.content)) {
            block.content.forEach((item) => {
              if (item.type === "text") {
                if (!item.styles) item.styles = {};

                // Apply the formatting
                switch (formatType) {
                  case "bold":
                    item.styles.bold = true;
                    break;
                  case "italic":
                    item.styles.italic = true;
                    break;
                  case "underline":
                    item.styles.underline = true;
                    break;
                  case "remove_formatting":
                    item.styles = {};
                    break;
                }
                success = true;
              }
            });
          }
        }
      }

      if (success) {
        // Update state variables
        setEditorContent(updatedContent);
        setInitialContent(updatedContent);

        // Save to storage
        if (currentPage) {
          const contentJsonString = JSON.stringify(updatedContent);
          const updatedPage = {
            ...currentPage,
            contentJson: contentJsonString,
            updatedAt: Date.now(),
          };

          const savedPage = await storageSavePage(updatedPage);
          setCurrentPage(savedPage);

          // Force refresh the editor
          setForceRefresh((prev) => prev + 10);

          // Try to update the editor content directly if possible
          if (
            editorRef.current &&
            typeof editorRef.current.setContent === "function"
          ) {
            editorRef.current.setContent(updatedContent);

            // Try focusing the editor to ensure refresh
            setTimeout(() => {
              if (typeof editorRef.current.focusEditor === "function") {
                editorRef.current.focusEditor();
              }
            }, 50);
          }

          Toast.show({
            type: "success",
            text1: "Success",
            text2: `Applied ${formatType} formatting`,
            visibilityTime: 2000,
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Formatting Failed",
          text2: "Could not apply formatting",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error applying formatting:", error);
      Toast.show({
        type: "error",
        text1: "Formatting Error",
        text2: "Failed to apply formatting",
        visibilityTime: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle SELECT_TEXT command
  const handleSelectTextCommand = async (commandResult) => {
    try {
      // Validation
      if (!commandResult.selectionType) {
        console.warn("Missing selection type in command");
        Toast.show({
          type: "info",
          text1: "Selection Error",
          text2: "Please specify what to select",
          visibilityTime: 2000,
        });
        return;
      }

      // Get current content
      const currentContent = editorContent || initialContent || [];

      if (currentContent.length === 0) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No content to select from",
          visibilityTime: 2000,
        });
        return;
      }

      const hasTargetText =
        commandResult.targetText &&
        typeof commandResult.targetText === "string";

      // For text selection, we need to use the editor's selection API
      // Since we can't directly manipulate selection in local storage
      // We'll try to find the text and then use the editor's selection methods

      // First, find the text in the content
      if (hasTargetText) {
        // Helper function to find text in blocks
        const findTextInBlocks = (blocks, searchText) => {
          const matches = [];
          const searchLower = searchText.toLowerCase();

          // Search in a block and its children
          const searchBlock = (block) => {
            // Skip if no content
            if (!block.content || !Array.isArray(block.content)) return;

            // Get full text of the block
            const blockText = block.content
              .filter((item) => item.type === "text")
              .map((item) => item.text)
              .join("");

            if (!blockText) return;

            // Search for the text (case insensitive)
            const blockTextLower = blockText.toLowerCase();
            let index = blockTextLower.indexOf(searchLower);

            if (index !== -1) {
              matches.push({
                blockId: block.id,
                blockType: block.type,
                startOffset: index,
                endOffset: index + searchText.length,
                text: blockText.substring(index, index + searchText.length),
              });
            }

            // Search in children
            if (block.children && Array.isArray(block.children)) {
              block.children.forEach((child) => searchBlock(child));
            }
          };

          // Start search at top level
          blocks.forEach((block) => searchBlock(block));
          return matches;
        };

        // Find matches for the target text
        const matches = findTextInBlocks(
          currentContent,
          commandResult.targetText
        );

        if (matches && matches.length > 0) {
          // We found the text, but we can't directly select it in local storage
          // We need to use the editor's selection API

          // Try to use the editor's selection API if available
          if (
            editorRef.current &&
            typeof editorRef.current.executeVoiceCommand === "function"
          ) {
            const selectionCommand = {
              type: "SELECTION",
              blockId: matches[0].blockId,
              startOffset: matches[0].startOffset,
              endOffset: matches[0].endOffset,
            };

            // Try to execute the selection command
            editorRef.current.executeVoiceCommand(selectionCommand);

            // Show success message
            Toast.show({
              type: "success",
              text1: "Selection Complete",
              text2: `Selected "${commandResult.targetText}"`,
              visibilityTime: 2000,
            });
          } else {
            // If we can't use the editor API, just show where the text was found
            Toast.show({
              type: "info",
              text1: "Text Found",
              text2: `Found "${commandResult.targetText}" but cannot select it directly`,
              visibilityTime: 2000,
            });
          }
        } else {
          // Text not found
          Toast.show({
            type: "info",
            text1: "Text Not Found",
            text2: `Could not find "${commandResult.targetText}"`,
            visibilityTime: 2000,
          });
        }
      } else {
        // Handle other selection types like block selection
        Toast.show({
          type: "info",
          text1: "Coming Soon",
          text2: "Advanced selection by voice is coming soon",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error selecting text:", error);
      Toast.show({
        type: "error",
        text1: "Selection Error",
        text2: "Failed to select text",
        visibilityTime: 2000,
      });
    }
  };

  // Handle REPLACE_TEXT command
  const handleReplaceTextCommand = async (commandResult) => {
    try {
      // Validate required fields
      if (!commandResult.findText || !commandResult.replaceWith) {
        console.warn("Missing find or replace text in command");
        Toast.show({
          type: "info",
          text1: "Replace Error",
          text2: "Please specify text to find and replace",
          visibilityTime: 2000,
        });
        return;
      }

      // Set loading state
      setIsSaving(true);

      // Get current content
      const currentContent = editorContent || initialContent || [];

      if (currentContent.length === 0) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No content to modify",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      // Make a copy of content to modify
      const updatedContent = JSON.parse(JSON.stringify(currentContent));
      let replacementCount = 0;

      // Find and replace text in all blocks (or targeted blocks)
      const findText = commandResult.findText.toLowerCase();
      const replaceWith = commandResult.replaceWith;
      const targetBlockIds = commandResult.targetBlockIds;

      // Helper function to process text content
      const processTextContent = (content) => {
        if (!Array.isArray(content)) return 0;

        let count = 0;
        for (const item of content) {
          if (item.type === "text" && item.text) {
            // Case-insensitive search
            const lowerText = item.text.toLowerCase();
            const index = lowerText.indexOf(findText);

            if (index !== -1) {
              // Replace the text while preserving case
              const before = item.text.substring(0, index);
              const after = item.text.substring(index + findText.length);
              item.text = before + replaceWith + after;
              count++;
            }
          }
        }
        return count;
      };

      // Process all blocks or just targeted blocks
      for (const block of updatedContent) {
        // Skip if we have target blocks and this isn't one of them
        if (targetBlockIds && !targetBlockIds.includes(block.id)) {
          continue;
        }

        // Process this block's content
        if (block.content) {
          replacementCount += processTextContent(block.content);
        }

        // Also check children blocks recursively
        if (block.children && Array.isArray(block.children)) {
          const processChildren = (children) => {
            for (const child of children) {
              if (child.content) {
                replacementCount += processTextContent(child.content);
              }
              if (child.children && Array.isArray(child.children)) {
                processChildren(child.children);
              }
            }
          };

          processChildren(block.children);
        }
      }

      // If we made replacements, update the content
      if (replacementCount > 0) {
        // Update state variables
        setEditorContent(updatedContent);
        setInitialContent(updatedContent);

        // Save to storage
        if (currentPage) {
          const contentJsonString = JSON.stringify(updatedContent);
          const updatedPage = {
            ...currentPage,
            contentJson: contentJsonString,
            updatedAt: Date.now(),
          };

          const savedPage = await storageSavePage(updatedPage);
          setCurrentPage(savedPage);

          // Force refresh the editor
          setForceRefresh((prev) => prev + 10);

          // Try to update the editor content directly if possible
          if (
            editorRef.current &&
            typeof editorRef.current.setContent === "function"
          ) {
            editorRef.current.setContent(updatedContent);

            // Try focusing the editor to ensure refresh
            setTimeout(() => {
              if (typeof editorRef.current.focusEditor === "function") {
                editorRef.current.focusEditor();
              }
            }, 50);
          }

          Toast.show({
            type: "success",
            text1: "Success",
            text2:
              replacementCount === 1
                ? `Replaced "${commandResult.findText}" with "${commandResult.replaceWith}"`
                : `Replaced ${replacementCount} occurrences`,
            visibilityTime: 2000,
          });
        }
      } else {
        // Show no matches message
        Toast.show({
          type: "info",
          text1: "No Matches",
          text2: `Could not find "${commandResult.findText}"`,
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error replacing text:", error);
      Toast.show({
        type: "error",
        text1: "Replace Error",
        text2: "Failed to replace text",
        visibilityTime: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Handle MODIFY_BLOCK command
  const handleModifyBlockCommand = async (commandResult) => {
    try {
      // Validate required fields
      if (!commandResult.modificationType) {
        console.warn("Missing modification type in command");
        Toast.show({
          type: "info",
          text1: "Modification Error",
          text2: "Please specify how to modify the block",
          visibilityTime: 2000,
        });
        return;
      }

      // Set loading state
      setIsSaving(true);

      // Get current content
      const currentContent = editorContent || initialContent || [];

      if (currentContent.length === 0) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "No content to modify",
          visibilityTime: 2000,
        });
        setIsSaving(false);
        return;
      }

      // Make a copy of content to modify
      const updatedContent = JSON.parse(JSON.stringify(currentContent));
      let success = false;
      let modificationDescription = "";
      let modifiedBlocksCount = 0;

      // Process the modification based on type
      const modificationType = commandResult.modificationType.toUpperCase();

      // Get target blocks - either specified blocks or blocks of a certain type
      let targetBlocks = [];
      let targetBlockIndices = [];

      // Handle "last paragraph" or "last block" reference
      if (
        commandResult.targetPosition === "last" ||
        commandResult.targetPosition === "latest"
      ) {
        console.log("Targeting the last block for modification");

        // Find the last block of the specified type or just the last block
        let lastIndex = updatedContent.length - 1;

        if (commandResult.targetBlockType) {
          // Find the last block of the specified type
          for (let i = updatedContent.length - 1; i >= 0; i--) {
            if (updatedContent[i].type === commandResult.targetBlockType) {
              lastIndex = i;
              break;
            }
          }
        }

        if (lastIndex >= 0) {
          targetBlocks = [updatedContent[lastIndex]];
          targetBlockIndices = [lastIndex];
          console.log(
            `Using last block at index ${lastIndex} for modification`
          );
        }
      }
      // Handle current selection reference (e.g., "this block", "current block")
      else if (commandResult.useCurrentSelection === true) {
        console.log("Using current selection for modification");

        // Try to get the currently focused block from the editor
        let currentBlockId = null;

        // First try to get it from the editor reference
        if (
          editorRef.current &&
          typeof editorRef.current.getCurrentBlockId === "function"
        ) {
          try {
            currentBlockId = editorRef.current.getCurrentBlockId();
            console.log("Got current block ID from editor:", currentBlockId);
          } catch (error) {
            console.error("Error getting current block ID:", error);
          }
        } else {
          console.warn(
            "Editor reference or getCurrentBlockId method not available"
          );
        }

        // If that fails, use the last block as a fallback
        if (!currentBlockId && currentContent.length > 0) {
          console.log(
            "No current selection found, using last block as fallback"
          );
          const lastBlock = currentContent[currentContent.length - 1];
          currentBlockId = lastBlock.id;
          console.log("Using last block ID as fallback:", currentBlockId);
        }

        if (currentBlockId) {
          // Find the block by ID and its index
          const findBlockByIdWithIndex = (blocks, blockId) => {
            for (let i = 0; i < blocks.length; i++) {
              const block = blocks[i];
              if (block.id === blockId) {
                console.log(`Found block with ID ${blockId} at index ${i}`);
                return { block, index: i };
              }

              // Check children recursively
              if (
                block.children &&
                Array.isArray(block.children) &&
                block.children.length > 0
              ) {
                const result = findBlockByIdWithIndex(block.children, blockId);
                if (result) {
                  return result;
                }
              }
            }
            return null;
          };

          const result = findBlockByIdWithIndex(updatedContent, currentBlockId);
          if (result) {
            targetBlocks = [result.block];
            targetBlockIndices = [result.index];
            console.log(
              `Using current block with ID ${currentBlockId} at index ${result.index} for modification`
            );
          } else {
            console.warn(
              `Block with ID ${currentBlockId} not found in content`
            );
          }
        }

        // If we still don't have a target block, show an error
        if (targetBlocks.length === 0) {
          console.error("Could not determine which block is selected");
          Toast.show({
            type: "error",
            text1: "Selection Error",
            text2: "Could not determine which block is selected",
            visibilityTime: 2000,
          });
          setIsSaving(false);
          return;
        }
      }
      // If we have specific block IDs, use those
      else if (
        commandResult.targetBlockIds &&
        Array.isArray(commandResult.targetBlockIds) &&
        commandResult.targetBlockIds.length > 0
      ) {
        // Find blocks by their IDs and track their indices
        const findBlockByIdWithIndex = (blocks, blockId) => {
          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.id === blockId) {
              return { block, index: i };
            }

            // Check children recursively
            if (
              block.children &&
              Array.isArray(block.children) &&
              block.children.length > 0
            ) {
              const result = findBlockByIdWithIndex(block.children, blockId);
              if (result) {
                return result;
              }
            }
          }
          return null;
        };

        // Get all specified blocks
        for (const blockId of commandResult.targetBlockIds) {
          const result = findBlockByIdWithIndex(updatedContent, blockId);
          if (result) {
            targetBlocks.push(result.block);
            targetBlockIndices.push(result.index);
          }
        }
      }
      // If we have a target block type (e.g., "all headings"), find those blocks
      else if (commandResult.targetBlockType) {
        // Find blocks by type and track their indices
        const findBlocksByTypeWithIndices = (blocks, blockType) => {
          const results = [];

          for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            if (block.type === blockType) {
              results.push({ block, index: i });
            }

            // Check children recursively
            if (
              block.children &&
              Array.isArray(block.children) &&
              block.children.length > 0
            ) {
              const foundInChildren = findBlocksByTypeWithIndices(
                block.children,
                blockType
              );
              results.push(...foundInChildren);
            }
          }

          return results;
        };

        // Handle special cases like "all headings"
        let results = [];
        if (commandResult.targetBlockType === "heading") {
          results = findBlocksByTypeWithIndices(updatedContent, "heading");
        } else if (commandResult.targetBlockType === "paragraph") {
          results = findBlocksByTypeWithIndices(updatedContent, "paragraph");
        } else {
          results = findBlocksByTypeWithIndices(
            updatedContent,
            commandResult.targetBlockType
          );
        }

        // Extract blocks and indices from results
        targetBlocks = results.map((result) => result.block);
        targetBlockIndices = results.map((result) => result.index);
      }
      // If no specific targets, use the last block as default
      else if (updatedContent.length > 0) {
        targetBlocks = [updatedContent[updatedContent.length - 1]];
        targetBlockIndices = [updatedContent.length - 1];
      }

      console.log(
        `Found ${
          targetBlocks.length
        } blocks to modify at indices: ${targetBlockIndices.join(", ")}`
      );

      // Process each target block
      for (let i = 0; i < targetBlocks.length; i++) {
        const block = targetBlocks[i];
        const blockIndex = targetBlockIndices[i];

        // Skip invalid indices
        if (blockIndex < 0 || blockIndex >= updatedContent.length) {
          console.warn(`Invalid block index: ${blockIndex}`);
          continue;
        }

        switch (modificationType) {
          case "CHANGE_TYPE":
          case "CHANGE_BLOCK_TYPE":
            // Change block type (paragraph to heading, etc.)
            if (commandResult.newType) {
              const oldType = block.type;

              // Directly modify the block in the content array
              updatedContent[blockIndex] = {
                ...block,
                type: commandResult.newType,
                props: {
                  ...(block.props || {}),
                  textColor: block.props?.textColor || "default",
                  backgroundColor: block.props?.backgroundColor || "default",
                  textAlignment: block.props?.textAlignment || "left",
                  // Add level property if it's a heading
                  ...(commandResult.newType === "heading" &&
                  commandResult.headingLevel
                    ? { level: commandResult.headingLevel }
                    : {}),
                },
              };

              modificationDescription = `Changed block from ${oldType} to ${commandResult.newType}`;
              success = true;
              modifiedBlocksCount++;
            }
            break;

          case "CHANGE_HEADING_LEVEL":
            // Change heading level
            if (block.type === "heading" && commandResult.headingLevel) {
              if (!block.props) block.props = {};
              block.props.level = commandResult.headingLevel;
              modificationDescription = `Changed heading to level ${commandResult.headingLevel}`;
              success = true;
              modifiedBlocksCount++;
            }
            break;

          case "CHANGE_COLOR":
          case "CHANGE_TEXT_COLOR":
            // Change text color
            if (commandResult.newColor || commandResult.textColor) {
              const color = commandResult.newColor || commandResult.textColor;

              // Apply to block props
              if (!block.props) block.props = {};
              block.props.textColor = color;

              // Also apply to all text content items
              if (block.content && Array.isArray(block.content)) {
                block.content.forEach((item) => {
                  if (item.type === "text") {
                    if (!item.styles) item.styles = {};
                    item.styles.textColor = color;
                  }
                });
              }

              modificationDescription = `Changed text color to ${color}`;
              success = true;
              modifiedBlocksCount++;
            }
            break;

          case "CONVERT_TO_LIST":
            // Handle generic list conversion with listType parameter
            if (commandResult.listType) {
              const oldType = block.type;
              let newType = "bulletListItem"; // Default
              let description = "bullet list";

              // Determine the correct list type
              if (
                commandResult.listType.toLowerCase() === "todo" ||
                commandResult.listType.toLowerCase() === "check" ||
                commandResult.listType.toLowerCase() === "checklist"
              ) {
                newType = "checkListItem";
                description = "todo list";
              } else if (
                commandResult.listType.toLowerCase() === "numbered" ||
                commandResult.listType.toLowerCase() === "ordered"
              ) {
                newType = "numberedListItem";
                description = "numbered list";
              }

              // Directly modify the existing block in the content array
              updatedContent[blockIndex] = {
                ...block,
                type: newType,
                props: {
                  ...(block.props || {}),
                  textColor: block.props?.textColor || "default",
                  backgroundColor: block.props?.backgroundColor || "default",
                  textAlignment: block.props?.textAlignment || "left",
                  // Add checked property only for checkListItem
                  ...(newType === "checkListItem" ? { checked: false } : {}),
                },
              };

              modificationDescription = `Converted ${oldType} to ${description}`;
              success = true;
              modifiedBlocksCount++;
            } else {
              // If no listType specified, default to bullet list
              const oldTypeBullet = block.type;

              // Directly modify the existing block in the content array
              updatedContent[blockIndex] = {
                ...block,
                type: "bulletListItem",
                props: {
                  ...(block.props || {}),
                  textColor: block.props?.textColor || "default",
                  backgroundColor: block.props?.backgroundColor || "default",
                  textAlignment: block.props?.textAlignment || "left",
                },
              };

              modificationDescription = `Converted ${oldTypeBullet} to bullet list`;
              success = true;
              modifiedBlocksCount++;
            }
            break;

          case "CONVERT_TO_BULLET_LIST":
            // Convert to bullet list
            const oldTypeBullet = block.type;

            // Directly modify the existing block in the content array
            updatedContent[blockIndex] = {
              ...block,
              type: "bulletListItem",
              props: {
                ...(block.props || {}),
                textColor: block.props?.textColor || "default",
                backgroundColor: block.props?.backgroundColor || "default",
                textAlignment: block.props?.textAlignment || "left",
              },
            };

            modificationDescription = `Converted ${oldTypeBullet} to bullet list`;
            success = true;
            modifiedBlocksCount++;
            break;

          case "CONVERT_TO_NUMBERED_LIST":
            // Convert to numbered list
            const oldTypeNumbered = block.type;

            // Directly modify the existing block in the content array
            updatedContent[blockIndex] = {
              ...block,
              type: "numberedListItem",
              props: {
                ...(block.props || {}),
                textColor: block.props?.textColor || "default",
                backgroundColor: block.props?.backgroundColor || "default",
                textAlignment: block.props?.textAlignment || "left",
              },
            };

            modificationDescription = `Converted ${oldTypeNumbered} to numbered list`;
            success = true;
            modifiedBlocksCount++;
            break;

          case "CONVERT_TO_TODO_LIST":
          case "CONVERT_TO_CHECK_LIST":
            // Convert to todo/check list
            const oldTypeTodo = block.type;

            // Directly modify the existing block in the content array
            updatedContent[blockIndex] = {
              ...block,
              type: "checkListItem",
              props: {
                ...(block.props || {}),
                textColor: block.props?.textColor || "default",
                backgroundColor: block.props?.backgroundColor || "default",
                textAlignment: block.props?.textAlignment || "left",
                checked: false,
              },
            };

            modificationDescription = `Converted ${oldTypeTodo} to todo list`;
            success = true;
            modifiedBlocksCount++;
            break;

          case "APPLY_FORMATTING":
            // Apply formatting to all text in the block
            if (commandResult.formatType) {
              if (block.content && Array.isArray(block.content)) {
                block.content.forEach((item) => {
                  if (item.type === "text") {
                    if (!item.styles) item.styles = {};

                    // Apply the formatting
                    switch (commandResult.formatType.toLowerCase()) {
                      case "bold":
                        item.styles.bold = true;
                        break;
                      case "italic":
                        item.styles.italic = true;
                        break;
                      case "underline":
                        item.styles.underline = true;
                        break;
                    }
                  }
                });

                modificationDescription = `Applied ${commandResult.formatType} formatting`;
                success = true;
                modifiedBlocksCount++;
              }
            }
            break;

          default:
            console.warn(`Unknown modification type: ${modificationType}`);
        }
      }

      // If modifications were successful, update the content
      if (success) {
        // Update state variables
        setEditorContent(updatedContent);
        setInitialContent(updatedContent);

        // Save to storage
        if (currentPage) {
          const contentJsonString = JSON.stringify(updatedContent);
          const updatedPage = {
            ...currentPage,
            contentJson: contentJsonString,
            updatedAt: Date.now(),
          };

          const savedPage = await storageSavePage(updatedPage);
          setCurrentPage(savedPage);

          // Force refresh the editor
          setForceRefresh((prev) => prev + 10);

          // Try to update the editor content directly if possible
          if (
            editorRef.current &&
            typeof editorRef.current.setContent === "function"
          ) {
            editorRef.current.setContent(updatedContent);

            // Try focusing the editor to ensure refresh
            setTimeout(() => {
              if (typeof editorRef.current.focusEditor === "function") {
                editorRef.current.focusEditor();
              }
            }, 50);
          }

          // Show success message with count if multiple blocks were modified
          Toast.show({
            type: "success",
            text1: "Success",
            text2:
              modifiedBlocksCount > 1
                ? `Modified ${modifiedBlocksCount} blocks: ${modificationDescription}`
                : modificationDescription || "Modified block successfully",
            visibilityTime: 2000,
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Modification Failed",
          text2:
            targetBlocks.length === 0
              ? "Could not find any blocks to modify"
              : "Could not modify the block(s)",
          visibilityTime: 2000,
        });
      }
    } catch (error) {
      console.error("Error modifying blocks:", error);
      Toast.show({
        type: "error",
        text1: "Modification Error",
        text2: "Failed to modify blocks",
        visibilityTime: 2000,
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (storageLoading || isLoading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading page...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!currentPage) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Stack.Screen
          options={{
            headerShown: false,
          }}
        />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.error || "red" }]}>
            Error: Page not found
          </Text>
          <TouchableOpacity
            style={[styles.errorButton, { backgroundColor: theme.primary }]}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.errorButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Page Header Component */}
      <PageHeader
        title={title}
        icon={icon}
        onTitleChange={handleTitleChange}
        onIconChange={handleIconChange}
        onBackPress={handleGoBack}
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        theme={theme}
        multilineTitle={true}
      />

      {/* Editor */}
      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === "ios" ? "padding" : null}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {initialContent ? (
          <Editor
            key={`editor-${forceRefresh}`}
            ref={editorRef}
            title={title}
            icon={icon}
            initialContent={initialContent}
            onChange={handleEditorContentChange}
            onNavigateToPage={handleNavigateToPage}
            keyboardHeight={keyboardHeight}
            isKeyboardVisible={isKeyboardVisible}
            currentPageId={currentPage.id}
            onCreateNestedPage={handleCreateNestedPage}
            onDeletePage={handleDeletePage}
            nestedPages={nestedPages}
            recentTranscription={recentTranscription}
            forceRefresh={forceRefresh}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.secondary} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              Preparing editor...
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Voice Recorder Component - Unified */}
      {!isKeyboardVisible && (
        <VoiceRecorder
          onCommandProcessed={handleVoiceCommandProcessed}
          editorContent={editorContent || initialContent || []}
          theme={theme}
          isKeyboardVisible={isKeyboardVisible}
          keyboardHeight={keyboardHeight}
          style={{ right: 16 }}
        />
      )}

      {/* Toast message component */}
      <Toast position="bottom" bottomOffset={80} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  editorContainer: {
    flex: 1,
    width: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  errorButton: {
    padding: 16,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});
