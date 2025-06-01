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

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Get keyboard height from event
        const keyboardHeight = e.endCoordinates.height;
        console.log("Keyboard height:", keyboardHeight);
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
        console.log("Page data retrieved:", page ? "Found" : "Not found");

        if (!isMounted) return; // Don't update state if unmounted

        if (page) {
          setCurrentPage(page);
          setTitle(page.title || "Untitled Page");
          setIcon(page.icon || "📄");

          try {
            // Parse the contentJson into an object for the editor
            const contentJson = page.contentJson || "{}";
            console.log(
              "Content JSON string:",
              contentJson.substring(0, 50) +
                (contentJson.length > 50 ? "..." : "")
            );

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

            console.log(
              "Content parsed successfully. Top level blocks:",
              parsedContent.length
            );
            setInitialContent(parsedContent);
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
      console.log(
        `Loaded ${childPages.length} nested pages for ${currentPage.id}:`
      );
      // Print details of the child pages for debugging
      childPages.forEach((page) => {
        console.log(
          `  - Page ID: ${page.id}, Title: ${page.title}, ParentID: ${page.parentId}`
        );
      });

      setNestedPages(childPages);

      // If we have the editor content, check for any page links that don't belong
      if (editorRef.current && editorContent) {
        console.log(
          `Validating page links - ${childPages.length} nested pages available`
        );

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

        console.log(
          `Found ${pageLinkBlocks.length} page link blocks in editor content:`
        );

        // Skip validation if there are no page links
        if (pageLinkBlocks.length === 0) {
          return;
        }

        // Collect IDs of page links that don't match any child page
        const invalidLinkIds = [];

        pageLinkBlocks.forEach((link) => {
          console.log(
            `  - Block ID: ${link.id}, Links to Page: ${link.pageId}, Title: ${link.pageTitle}`
          );
          // Check if this link corresponds to a child page
          const matchingChild = childPages.find(
            (page) => page.id === link.pageId
          );
          if (!matchingChild) {
            console.log(
              `    WARNING: This link does not match any child page of ${currentPage.id}`
            );
            invalidLinkIds.push(link.pageId);
          }
        });

        // If we found invalid links, clean them up
        if (invalidLinkIds.length > 0) {
          console.log(
            `Cleaning up ${invalidLinkIds.length} invalid page links`
          );

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
              console.log(
                "Page saved successfully after link cleanup:",
                savedPage.id
              );
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

      console.log("Auto-saving changes for page:", currentPage.id);
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
        console.log("Auto-save completed successfully");
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

      // Log content change for debugging
      if (Array.isArray(content)) {
        console.log(
          `Editor content changed: ${content.length} top-level blocks`
        );
      } else {
        console.log(
          "Editor content changed but format is unexpected:",
          typeof content
        );
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

      console.log("Successfully created nested page:", newPage.id);

      // Return the created page so Editor.web can use it
      return newPage;
    } catch (err) {
      console.error("Error creating nested page:", err);
      // Re-throw the error so it can be caught by the caller
      return Promise.reject(err);
    }
  };

  // Create a direct insertion method that works with our current editorContent state
  const insertTranscriptionDirectly = (transcription) => {
    try {
      console.log("Attempting direct content insertion for transcription");

      // Use editorContent if available, fall back to initialContent
      let currentContent = editorContent;

      if (
        !currentContent ||
        !Array.isArray(currentContent) ||
        currentContent.length === 0
      ) {
        console.log("No valid editorContent, using initialContent instead");
        currentContent = initialContent;

        // If even initialContent is not valid, create a basic content structure
        if (
          !currentContent ||
          !Array.isArray(currentContent) ||
          currentContent.length === 0
        ) {
          console.log("Creating basic content structure");
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

      // Create a new paragraph block
      const newBlock = createParagraphBlock(transcription);

      // Create a copy of current content with new block appended
      const updatedContent = [...currentContent, newBlock];
      console.log(
        `Adding new paragraph block, now ${updatedContent.length} blocks`
      );

      // Force a reload of the editor content by temporarily setting initialContent to null
      // then setting it to the updated content - this triggers a complete re-render
      setInitialContent(null);

      // Use setTimeout to ensure state updates happen in separate render cycles
      setTimeout(() => {
        // Update the state variables with the new content
        setEditorContent(updatedContent);
        setInitialContent(updatedContent);

        console.log("Editor state updated with new content");

        // Try to update the editor content directly if possible
        if (editorRef.current) {
          if (typeof editorRef.current.setContent === "function") {
            console.log("Directly updating editor content via setContent");
            editorRef.current.setContent(updatedContent);
          } else if (
            editorRef.current.getEditor &&
            typeof editorRef.current.getEditor === "function"
          ) {
            try {
              const editor = editorRef.current.getEditor();
              if (editor && typeof editor.insertBlocks === "function") {
                console.log("Inserting block directly via editor reference");
                editor.insertBlocks([newBlock], null, "lastChild");
              }
            } catch (err) {
              console.error("Error accessing editor:", err);
            }
          }
        }
      }, 50);

      // Also directly update the page content with the changes
      if (currentPage) {
        console.log("Directly updating page contentJson");
        const contentJsonString = JSON.stringify(updatedContent);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        // Save the page without using the debounce
        setIsSaving(true);
        storageSavePage(updatedPage)
          .then(() => {
            console.log("Page saved successfully with transcription");
            setIsSaving(false);
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

  // Handle transcription completed from VoiceRecorder
  const handleTranscriptionComplete = (transcription) => {
    console.log("Transcription received in parent component:", transcription);

    // Check if transcription is valid
    if (
      !transcription ||
      typeof transcription !== "string" ||
      transcription.trim() === ""
    ) {
      console.warn("Invalid transcription received");
      return;
    }

    // Try DIRECT approach first - use our state management
    const directSuccess = insertTranscriptionDirectly(transcription);
    if (directSuccess) {
      console.log(
        "Successfully inserted transcription via direct state update"
      );
      return;
    }

    // If direct approach fails, try the standard approaches
    try {
      // Ensure editor reference exists
      if (!editorRef.current) {
        console.warn("Editor reference is not available");
        Alert.alert("Transcription Result", transcription, [{ text: "OK" }]);
        return;
      }

      // DIRECT DEBUG: Try to access the editor at every level of the reference chain
      console.log("DEBUG: Starting direct insertion attempt");

      // First try the standard way
      if (typeof editorRef.current.insertTranscribedText === "function") {
        console.log("DEBUG: Using standard insertTranscribedText method");
        try {
          const success =
            editorRef.current.insertTranscribedText(transcription);
          if (success) {
            console.log(
              "DEBUG: Successfully inserted transcription via standard method"
            );
            return;
          }
        } catch (error) {
          console.error("DEBUG: Error in standard method:", error);
        }
      }

      // Try to access internal editor directly
      if (typeof editorRef.current.getEditor === "function") {
        console.log("DEBUG: Trying to get editor directly");
        try {
          const editor = editorRef.current.getEditor();
          if (editor) {
            console.log("DEBUG: Got editor directly, attempting insertion");

            // Create a paragraph block
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
                  text: transcription,
                  styles: {},
                },
              ],
              children: [],
            };

            console.log(
              "DEBUG: Editor operations available:",
              Object.keys(editor)
            );

            // Try inserting directly
            if (typeof editor.insertBlocks === "function") {
              console.log("DEBUG: Using insertBlocks");

              if (editor.topLevelBlocks && editor.topLevelBlocks.length > 0) {
                const lastBlock =
                  editor.topLevelBlocks[editor.topLevelBlocks.length - 1];
                editor.insertBlocks([newBlock], lastBlock, "after");
                console.log(
                  "DEBUG: Successfully inserted using direct editor.insertBlocks"
                );
                return;
              } else {
                editor.insertBlocks([newBlock], null, "firstChild");
                console.log(
                  "DEBUG: Successfully inserted at root using direct editor.insertBlocks"
                );
                return;
              }
            }

            // Try another approach by getting the document
            if (editor.document) {
              console.log(
                "DEBUG: Document available, length:",
                editor.document.length
              );
            }
          }
        } catch (error) {
          console.error("DEBUG: Error accessing direct editor:", error);
        }
      }

      console.warn("DEBUG: All direct insertion approaches failed");
      Alert.alert("Transcription Result", transcription, [{ text: "OK" }]);
    } catch (error) {
      console.error("Error in transcription handler:", error);
      Alert.alert("Transcription Result", transcription, [{ text: "OK" }]);
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

      {/* Voice Recorder Component */}
      <VoiceRecorder
        onTranscriptionComplete={handleTranscriptionComplete}
        theme={theme}
        isKeyboardVisible={isKeyboardVisible}
        keyboardHeight={keyboardHeight}
      />
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
