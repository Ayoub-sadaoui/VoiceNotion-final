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

  // Handle content change from editor
  const handleEditorContentChange = useCallback(
    (content) => {
      if (!content) {
        console.warn("Received empty content from editor");
        return;
      }

      // Always update our local state to stay in sync with the editor
      setEditorContent(content);

      // Debounce the saving to avoid too many writes
      debouncedSave(content);
    },
    [debouncedSave]
  );

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
      // This is critical for commands like DELETE that need to know which blocks exist
      const currentEditorContent = editorContent || initialContent || [];
      console.log(
        `Current editor content has ${currentEditorContent.length} blocks`
      );

      // For DELETE commands, we need to reprocess with the current content
      if (commandResult.action === "DELETE_BLOCK") {
        if (!currentEditorContent || currentEditorContent.length === 0) {
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
              currentEditorContent
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

      // Handle different command actions based on the intent detected by Gemini
      switch (commandResult.action) {
        case "DELETE_BLOCK":
          // Handle block deletion
          await handleDeleteBlockCommand(commandResult);
          break;

        case "INSERT_CONTENT":
          // Handle content insertion - the traditional transcription flow
          await handleInsertContentCommand(commandResult);
          break;

        case "CREATE_PAGE":
          // Handle new page creation
          await handleCreatePageCommand(commandResult);
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
    // Check if we have target block IDs to delete
    if (
      !commandResult.targetBlockIds ||
      !Array.isArray(commandResult.targetBlockIds) ||
      commandResult.targetBlockIds.length === 0
    ) {
      console.warn("No target blocks specified for deletion");
      Toast.show({
        type: "info",
        text1: "Command Unclear",
        text2: "Please specify which block to delete",
        visibilityTime: 2000,
      });
      return;
    }

    try {
      // Set loading state
      setIsSaving(true);

      // Delete blocks from storage
      const result = await deleteBlocksFromStorage(
        currentPage,
        commandResult.targetBlockIds,
        storageSavePage
      );

      // Update local state with the new content
      if (result && result.content) {
        // Update both editor content and initial content to ensure consistency
        setEditorContent(result.content);
        setInitialContent(result.content);
        setCurrentPage(result.page);

        // Force refresh the editor to show changes - increment by more than 1 for stronger refresh
        setForceRefresh((prev) => prev + 10);

        // First try: Update editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          console.log("Updating editor content directly after deletion");
          const success = editorRef.current.setContent(result.content);
          console.log("Direct content update success:", success);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              console.log("Focusing editor after deletion");
              editorRef.current.focusEditor();
            }
          }, 50);
        }

        // Second backup approach: Try to force DOM update by manipulating the editor component
        setTimeout(() => {
          // Force another refresh after a short delay
          setForceRefresh((prev) => prev + 1);

          // Try updating content again after timeout
          if (
            editorRef.current &&
            typeof editorRef.current.setContent === "function"
          ) {
            editorRef.current.setContent(result.content);

            if (typeof editorRef.current.focusEditor === "function") {
              editorRef.current.focusEditor();
            }
          }
        }, 100);

        // Show success message
        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Deleted ${commandResult.targetBlockIds.length} block(s)`,
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
