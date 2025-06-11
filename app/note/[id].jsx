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
  const { theme } = useTheme();
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

  // Update title and icon when page changes
  useEffect(() => {
    if (currentPage) {
      // Load nested pages only if we have a valid page
      if (currentPage.id) {
        loadNestedPages();
      }
    }
  }, [currentPage, loadNestedPages]);

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

  // Load nested pages
  const loadNestedPages = useCallback(async () => {
    if (!currentPage || !currentPage.id) return;

    try {
      // Prevent excessive calls by checking if we already have nested pages
      if (
        nestedPages.length > 0 &&
        nestedPages[0]?.parentId === currentPage.id
      ) {
        return;
      }

      const pages = await getChildrenOfPage(currentPage.id);
      setNestedPages(pages);
    } catch (error) {
      console.error("Error loading nested pages:", error);
    }
  }, [currentPage, getChildrenOfPage, nestedPages]);

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
        // Save current page first
        await handleSave();

        // Create new page
        return await PageManager.createNestedPage(
          currentPage,
          createNewPage,
          title,
          icon
        );
      } catch (error) {
        console.error("Error creating nested page:", error);
        return null;
      }
    },
    [currentPage, handleSave, createNewPage]
  );

  // Delete a page
  const handleDeletePage = useCallback(
    async (page) => {
      if (!page) return false;

      return await PageManager.deletePage(page, storageDeletePage, router);
    },
    [storageDeletePage, router]
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
      setIsUndoRedoOperation
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
      setIsUndoRedoOperation
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
      if (!commandResult || !commandResult.success) {
        console.error("Invalid command result:", commandResult);
        Toast.show({
          type: "error",
          text1: "Command Error",
          text2: "Failed to process voice command",
          visibilityTime: 2000,
        });
        return;
      }

      console.log("Processing command:", commandResult.action);

      try {
        switch (commandResult.action) {
          case "INSERT_CONTENT":
            await handleInsertContentCommand(
              commandResult,
              insertTranscriptionDirectly,
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

          case "INSERT_AI_ANSWER":
          case "INSERT_AI_SUMMARY":
          case "INSERT_AI_COMPLETION":
          case "INSERT_AI_REWRITE":
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
        { backgroundColor: theme.background, paddingTop: insets.top },
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
      />

      {/* Voice recorder */}
      <VoiceRecorder
        onCommandProcessed={handleCommandProcessed}
        editorContent={editorContent || initialContent}
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
