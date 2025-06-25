import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Alert,
  Keyboard,
  Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useTheme } from "../../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePageStorage from "../../hooks/usePageStorage";
import useEditorContent from "../../hooks/useEditorContent";
import Toast from "react-native-toast-message";
import { useAuth } from "../../contexts/AuthContext";
import { updateNote } from "../../services/noteService";

// Import utility functions
import { validateBlockFormat } from "../../utils/blockOperations";
import {
  sanitizeContentBlocks,
  insertContentDirectly,
} from "../../utils/contentUtils";
import {
  handleUndo,
  handleRedo,
  handleUndoCommand,
  handleRedoCommand,
} from "../../utils/historyUtils";
import {
  createParagraphBlock,
  handleAIContentCommand,
  handleDeleteBlockCommand,
  handleInsertContentCommand,
  handleCreatePageCommand,
  handleApplyFormattingCommand,
  handleModifyBlockCommand,
  handleDeleteAllCommand,
  handleGenerateImageCommand,
} from "../../utils/voiceCommandHandlers";

// Import components
import {
  LoadingView,
  ErrorView,
} from "../../components/note/LoadingErrorStates";
import ContentEditor from "../../components/note/ContentEditor";
import PageHeader from "../../components/note/PageHeader";
import VoiceRecorder from "../../components/note/VoiceRecorder";
import IconPicker from "../../components/note/IconPicker";
import PageManager from "../../components/note/PageManager";

/**
 * NoteScreen component - Displays and manages a single note
 */
const NoteScreen = () => {
  // Router and navigation
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const pageId = id;

  // Theme and insets
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // Auth context
  const { user } = useAuth();

  // Debug user object
  useEffect(() => {
    console.log(
      "NoteScreen - User object:",
      user ? { id: user.id, email: user.email } : "Not authenticated"
    );
  }, [user]);

  // Page storage
  const {
    loading: isLoading,
    error,
    getPageById,
    savePage: storageSavePage,
    deletePage: storageDeletePage,
    createNewPage,
    getChildrenOfPage,
  } = usePageStorage(user?.id);

  // State
  const [currentPage, setCurrentPage] = useState(null);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("📄");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [nestedPages, setNestedPages] = useState([]);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [multilineTitle, setMultilineTitle] = useState(false);

  // Refs
  const saveTimer = useRef(null);

  // Editor content state using custom hook
  const {
    editorContent,
    setEditorContent,
    initialContent,
    setInitialContent,
    isSaving,
    setIsSaving,
    forceRefresh,
    setForceRefresh,
    recentTranscription,
    setRecentTranscription,
    undoStack,
    setUndoStack,
    redoStack,
    setRedoStack,
    isUndoRedoOperation,
    setIsUndoRedoOperation,
    canUndo,
    canRedo,
    editorRef,
    handleContentChange,
    handleSave,
    lastMajorChange,
    setLastMajorChange,
  } = useEditorContent(
    currentPage,
    storageSavePage,
    setCurrentPage,
    title,
    icon
  );

  // Load page on mount or when pageId changes
  useEffect(() => {
    const loadPage = async () => {
      if (pageId) {
        try {
          const page = await getPageById(pageId);
          if (page) {
            setCurrentPage(page);
            // Initialize title and icon
            setTitle(page.title || "");
            setIcon(page.icon || "📄");

            // Check if title needs multiline
            const pageTitle = page.title || "";
            setMultilineTitle(pageTitle.length > 30);
          }
        } catch (err) {
          console.error("Error loading page:", err);
        }
      }
    };

    loadPage();
  }, [pageId, getPageById]);

  // Load nested pages when page changes (no dependency on loadNestedPages to avoid infinite loop)
  useEffect(() => {
    if (pageId) {
      console.log("Loading nested pages for page:", pageId);

      // Add a small delay to prevent rapid loading during navigation
      const timeoutId = setTimeout(async () => {
        try {
          const pages = await getChildrenOfPage(pageId);
          console.log("Found nested pages:", pages.length);
          setNestedPages(pages);
        } catch (error) {
          console.error("Error loading nested pages:", error);
        }
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [pageId, getChildrenOfPage]);

  // Keyboard listeners
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (event) => {
        setIsKeyboardVisible(true);
        setKeyboardHeight(event.endCoordinates.height);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Handle title change
  const handleTitleChange = useCallback(
    (newTitle) => {
      // Update local state immediately
      setTitle(newTitle);
      console.log("Title changed to:", newTitle);

      // Debounce the save operation
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(() => {
        if (currentPage) {
          console.log("Saving title to storage:", newTitle);

          // Make sure to keep all existing properties of the page
          const updatedPage = {
            ...currentPage,
            title: newTitle,
            updatedAt: Date.now(),
          };

          console.log("Updated page object:", JSON.stringify(updatedPage));

          // Save to storage service
          storageSavePage(updatedPage)
            .then((savedPage) => {
              console.log(
                "Title saved successfully to storage:",
                savedPage.title
              );
              setCurrentPage(savedPage);
            })
            .catch((error) => {
              console.error("Error saving title:", error);

              // Show error toast
              Toast.show({
                type: "error",
                text1: "Error",
                text2: "Failed to save title. Please try again.",
                position: "bottom",
                visibilityTime: 3000,
              });
            });
        }
      }, 1000); // Longer debounce for title changes
    },
    [currentPage, storageSavePage]
  );

  // Handle icon change
  const handleIconChange = useCallback(
    (newIcon) => {
      setShowIconPicker(false);
      setIcon(newIcon);
      console.log("Icon changed to:", newIcon);

      if (currentPage) {
        console.log("Saving icon to storage:", newIcon);

        const updatedPage = {
          ...currentPage,
          icon: newIcon,
          updatedAt: Date.now(),
        };

        console.log("Updated page object:", JSON.stringify(updatedPage));

        // Save to storage service
        storageSavePage(updatedPage)
          .then((savedPage) => {
            console.log("Icon saved successfully to storage:", savedPage.icon);
            setCurrentPage(savedPage);
          })
          .catch((error) => {
            console.error("Error saving icon:", error);

            // Show error toast
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to save icon. Please try again.",
              position: "bottom",
              visibilityTime: 3000,
            });
          });
      }
    },
    [currentPage, storageSavePage]
  );

  // Handle back button press
  const handleBackPress = useCallback(() => {
    handleSave().then(() => {
      if (currentPage && currentPage.parentId) {
        router.replace(`/note/${currentPage.parentId}`);
      } else {
        router.replace("/home");
      }
    });
  }, [handleSave, currentPage, router]);

  // Load nested pages (simplified to avoid circular dependencies)
  const loadNestedPages = useCallback(async () => {
    if (!pageId) return;

    try {
      console.log("Manual loadNestedPages call for:", pageId);
      const pages = await getChildrenOfPage(pageId);
      console.log("Manual load found nested pages:", pages.length);
      setNestedPages(pages);
    } catch (error) {
      console.error("Error in manual loadNestedPages:", error);
    }
  }, [pageId, getChildrenOfPage]);

  // Handle navigation to a nested page
  const handleNavigateToPage = useCallback(
    (pageId) => {
      if (!pageId) return;

      // Save current page before navigating
      handleSave().then(() => {
        router.replace(`/note/${pageId}`);
      });
    },
    [handleSave, router]
  );

  // Create a nested page
  const handleCreateNestedPage = useCallback(
    async (title = "New Page", icon = "📄") => {
      if (!currentPage) return null;

      try {
        console.log(
          "Creating nested page:",
          title,
          "for parent:",
          currentPage.id
        );

        // Save current page first
        await handleSave();

        // Create new page
        const newPage = await PageManager.createNestedPage(
          currentPage,
          createNewPage,
          title,
          icon
        );

        if (newPage) {
          console.log("Created new page successfully:", newPage.id);

          // Refresh nested pages list to include the new page
          // Add a small delay to ensure the page is properly saved before refreshing
          setTimeout(async () => {
            try {
              const pages = await getChildrenOfPage(pageId);
              console.log(
                "Refreshed nested pages after creation:",
                pages.length
              );
              setNestedPages(pages);
            } catch (error) {
              console.error("Error refreshing nested pages:", error);
            }
          }, 200);
        }

        return newPage;
      } catch (error) {
        console.error("Error creating nested page:", error);
        return null;
      }
    },
    [currentPage, handleSave, createNewPage, pageId, getChildrenOfPage]
  );

  // Delete a page
  const handleDeletePage = useCallback(
    async (pageIdOrPage, isUserInitiated = true) => {
      try {
        let pageToDelete;

        // Handle different input types
        if (typeof pageIdOrPage === "string") {
          // If it's a string, it's a page ID, so fetch the page object
          pageToDelete = await getPageById(pageIdOrPage);
          if (!pageToDelete) {
            console.error("Page not found:", pageIdOrPage);
            return false;
          }
        } else if (typeof pageIdOrPage === "object" && pageIdOrPage?.id) {
          // If it's an object with an ID, it's a page object
          pageToDelete = pageIdOrPage;
        } else {
          console.error("Invalid page parameter:", pageIdOrPage);
          return false;
        }

        // Use the newer PageManager.deletePage function
        return await PageManager.deletePage(
          pageToDelete,
          storageDeletePage,
          router
        );
      } catch (error) {
        console.error("Error deleting page:", error);
        return false;
      }
    },
    [storageDeletePage, router, getPageById]
  );

  // Handle undo
  const handleUndoWrapper = useCallback(() => {
    handleUndo(
      undoStack,
      editorContent,
      setUndoStack,
      setRedoStack,
      setEditorContent,
      setInitialContent,
      currentPage,
      storageSavePage,
      setCurrentPage,
      setForceRefresh,
      editorRef,
      setIsUndoRedoOperation,
      setLastMajorChange
    );
  }, [
    undoStack,
    editorContent,
    setUndoStack,
    setRedoStack,
    setEditorContent,
    setInitialContent,
    currentPage,
    storageSavePage,
    setCurrentPage,
    setForceRefresh,
    editorRef,
    setIsUndoRedoOperation,
    setLastMajorChange,
  ]);

  // Handle redo
  const handleRedoWrapper = useCallback(() => {
    handleRedo(
      redoStack,
      editorContent,
      setUndoStack,
      setRedoStack,
      setEditorContent,
      setInitialContent,
      currentPage,
      storageSavePage,
      setCurrentPage,
      setForceRefresh,
      editorRef,
      setIsUndoRedoOperation,
      setLastMajorChange
    );
  }, [
    redoStack,
    editorContent,
    setUndoStack,
    setRedoStack,
    setEditorContent,
    setInitialContent,
    currentPage,
    storageSavePage,
    setCurrentPage,
    setForceRefresh,
    editorRef,
    setIsUndoRedoOperation,
    setLastMajorChange,
  ]);

  // Insert transcription directly into the editor
  const insertTranscriptionDirectly = useCallback(
    (transcriptionData, isRawText = false) => {
      return insertContentDirectly(
        transcriptionData,
        isRawText,
        editorContent || initialContent || [],
        setEditorContent,
        setInitialContent,
        setRecentTranscription,
        setForceRefresh,
        editorRef,
        currentPage,
        storageSavePage,
        setCurrentPage,
        setIsSaving,
        createParagraphBlock,
        validateBlockFormat
      );
    },
    [
      editorContent,
      initialContent,
      setEditorContent,
      setInitialContent,
      setRecentTranscription,
      setForceRefresh,
      editorRef,
      currentPage,
      storageSavePage,
      setCurrentPage,
      setIsSaving,
    ]
  );

  // Handle voice command processing
  const handleCommandProcessed = useCallback(
    async (commandResult) => {
      console.log("Processing command result:", commandResult);
      if (commandResult.success === false) {
        console.error(
          "Command processing failed:",
          commandResult.message || "Unknown error"
        );
        Toast.show({
          type: "error",
          text1: "Command Failed",
          text2: commandResult.message || "Please try again.",
          visibilityTime: 3000,
        });
      } else {
        // Handle the command
        console.log(`Handling command: ${commandResult.action}`);
        try {
          switch (commandResult.action) {
            case "INSERT_CONTENT":
              await handleInsertContentCommand(
                commandResult,
                insertTranscriptionDirectly,
                setIsSaving
              );
              break;

            case "DELETE_ALL":
              await handleDeleteAllCommand(
                commandResult,
                editorContent,
                initialContent,
                editorRef,
                setEditorContent,
                setInitialContent,
                currentPage,
                storageSavePage,
                setCurrentPage,
                setForceRefresh,
                setIsSaving
              );
              break;

            case "DELETE_BLOCK":
              await handleDeleteBlockCommand(
                commandResult,
                editorContent,
                initialContent,
                editorRef,
                setEditorContent,
                setInitialContent,
                currentPage,
                storageSavePage,
                setCurrentPage,
                setForceRefresh,
                setIsSaving
              );
              break;

            case "CREATE_PAGE":
              await handleCreatePageCommand(
                commandResult,
                currentPage,
                createNewPage,
                handleSave,
                storageSavePage,
                insertTranscriptionDirectly,
                loadNestedPages,
                router,
                setIsSaving
              );
              break;

            case "GENERATE_IMAGE":
              await handleGenerateImageCommand(
                commandResult,
                insertTranscriptionDirectly,
                setIsSaving
              );
              break;

            case "INSERT_AI_ANSWER":
            case "INSERT_AI_SUMMARY":
            case "INSERT_AI_COMPLETION":
            case "INSERT_AI_REWRITE":
            case "INSERT_AI_IMAGE":
              await handleAIContentCommand(
                commandResult,
                insertTranscriptionDirectly
              );
              break;

            case "APPLY_FORMATTING":
              await handleApplyFormattingCommand(
                commandResult,
                editorContent,
                initialContent,
                editorRef,
                setEditorContent,
                setInitialContent,
                currentPage,
                storageSavePage,
                setCurrentPage,
                setForceRefresh,
                setIsSaving
              );
              break;

            case "MODIFY_BLOCK":
              await handleModifyBlockCommand(
                commandResult,
                editorContent,
                initialContent,
                editorRef,
                setEditorContent,
                setInitialContent,
                currentPage,
                storageSavePage,
                setCurrentPage,
                setForceRefresh,
                setIsSaving
              );
              break;

            case "DELETE_ALL":
              await handleDeleteAllCommand(
                commandResult,
                editorContent,
                initialContent,
                editorRef,
                setEditorContent,
                setInitialContent,
                currentPage,
                storageSavePage,
                setCurrentPage,
                setForceRefresh,
                setIsSaving
              );
              break;

            case "UNDO":
              await handleUndoCommand(
                commandResult,
                handleUndoWrapper,
                undoStack
              );
              break;

            case "REDO":
              await handleRedoCommand(
                commandResult,
                handleRedoWrapper,
                redoStack
              );
              break;

            default:
              console.warn("Unhandled command action:", commandResult.action);
              Toast.show({
                type: "info",
                text1: "Command Not Supported",
                text2: "This voice command is not supported yet",
                visibilityTime: 2000,
              });
          }
        } catch (error) {
          console.error("Error processing command:", error);
          Toast.show({
            type: "error",
            text1: "Command Error",
            text2: "Failed to process voice command",
            visibilityTime: 2000,
          });
        }
      }
    },
    [
      editorContent,
      initialContent,
      editorRef,
      setEditorContent,
      setInitialContent,
      currentPage,
      storageSavePage,
      setCurrentPage,
      setForceRefresh,
      setIsSaving,
      insertTranscriptionDirectly,
      createNewPage,
      handleSave,
      loadNestedPages,
      router,
      handleUndoWrapper,
      handleRedoWrapper,
      undoStack,
      redoStack,
    ]
  );

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  // Show loading state
  if (isLoading && !currentPage) {
    return <LoadingView theme={theme} />;
  }

  // Show error state
  if (error || !pageId) {
    return (
      <ErrorView theme={theme} onReturnHome={() => router.replace("/home")} />
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: theme.background, paddingTop: 10 },
      ]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />

      {/* Page header */}
      <PageHeader
        title={title}
        icon={icon}
        onTitleChange={handleTitleChange}
        onIconChange={() => setShowIconPicker(true)}
        onBackPress={handleBackPress}
        onUndo={handleUndoWrapper}
        onRedo={handleRedoWrapper}
        canUndo={canUndo}
        canRedo={canRedo}
        isSaving={isSaving}
        theme={theme}
        multilineTitle={multilineTitle}
      />

      {/* Content editor */}
      <ContentEditor
        editorRef={editorRef}
        initialContent={initialContent}
        title={title}
        icon={icon}
        onChange={handleContentChange}
        onNavigateToPage={handleNavigateToPage}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
        currentPageId={pageId}
        onCreateNestedPage={handleCreateNestedPage}
        onDeletePage={handleDeletePage}
        nestedPages={nestedPages}
        recentTranscription={recentTranscription}
        forceRefresh={forceRefresh}
        theme={theme}
        isDark={isDark}
      />

      {/* Voice recorder */}
      <VoiceRecorder
        onCommandProcessed={handleCommandProcessed}
        editorContent={editorContent || initialContent || []}
        theme={theme}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
      />

      {/* Icon picker */}
      <IconPicker
        visible={showIconPicker}
        onClose={() => setShowIconPicker(false)}
        onSelect={handleIconChange}
        theme={theme}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
});

export default NoteScreen;
