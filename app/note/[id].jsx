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
        // Legacy mode: create a single paragraph block with the raw text
        newBlocks = [createParagraphBlock(transcriptionData)];
      } else {
        // New mode: use the structured blocks directly
        newBlocks = transcriptionData;
      }

      // Create a copy of current content with new blocks appended
      const updatedContent = [...currentContent, ...newBlocks];

      // Store the recent transcription (for UI feedback)
      if (isRawText) {
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
          .then(() => {
            setIsSaving(false);

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

  // Handle transcription completed from VoiceRecorder
  // This uses the preferred approach for adding content: direct AsyncStorage update
  // Rather than using BlockNote API methods directly, we update local state and persist to AsyncStorage
  const handleTranscriptionComplete = async (transcriptionResult) => {
    // Check if we received a valid result
    if (!transcriptionResult) {
      console.warn("Invalid transcription result received");
      return;
    }

    console.log(
      "Received transcription result:",
      JSON.stringify(transcriptionResult, null, 2)
    );

    // If we have successfully parsed blocks from Gemini
    if (transcriptionResult.success) {
      // Check specifically for createNewPage flag
      console.log(
        "Transcription success, createNewPage flag:",
        !!transcriptionResult.createNewPage
      );

      if (transcriptionResult.createNewPage) {
        // Handle new page creation scenario
        console.log(
          "New page request detected:",
          transcriptionResult.pageTitle
        );

        try {
          // Save current page before creating a new one
          await handleSave();

          // 1. Create the new page
          const newPage = await createNewPage(
            currentPage.id, // Use current page as parent
            transcriptionResult.pageTitle || "New Page",
            transcriptionResult.pageIcon || "📄"
          );

          if (!newPage || !newPage.id) {
            console.error("Failed to create new page");
            // Fallback - just add the transcription as text
            insertTranscriptionDirectly(transcriptionResult.rawText, true);
            return;
          }

          console.log("Created new page:", newPage.id, newPage.title);

          // 2. First, create a page link in the current page
          const pageLinkBlock = {
            type: "pageLink",
            props: {
              pageId: newPage.id,
              pageTitle: newPage.title,
              pageIcon: newPage.icon,
            },
          };

          // 3. Insert the page link into the current page
          const inserted = insertTranscriptionDirectly([pageLinkBlock], false);

          if (!inserted) {
            console.error("Failed to insert page link");
            return;
          }

          // 4. Remove the page link from the blocks that will go into the new page
          const contentBlocks = transcriptionResult.blocks.slice(1);

          // 5. Save the content blocks to the new page
          const contentJson = JSON.stringify(contentBlocks);
          const updatedPage = {
            ...newPage,
            contentJson,
            updatedAt: Date.now(),
          };

          const savedPage = await storageSavePage(updatedPage);
          console.log("Saved content to new page:", savedPage.id);

          // 6. Force a reload of nested pages to show the new page
          await loadNestedPages();

          // 7. Show success message
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
          console.error("Error handling new page creation:", error);
          // Fallback to adding raw text
          insertTranscriptionDirectly(transcriptionResult.rawText, true);

          // Show error to user
          Alert.alert(
            "Error",
            "Failed to create new page. The content has been added as text instead."
          );
        }
      } else if (transcriptionResult.blocks) {
        // Regular blocks processing
        console.log(
          "Using structured blocks:",
          transcriptionResult.blocks.length
        );
        insertTranscriptionDirectly(transcriptionResult.blocks, false);
      }
    } else {
      // If unsuccessful or no blocks, use the raw text
      console.log("Using raw text fallback:", transcriptionResult.rawText);
      if (transcriptionResult.rawText) {
        insertTranscriptionDirectly(transcriptionResult.rawText, true);
      } else if (typeof transcriptionResult === "string") {
        // Handle case where we directly receive a string (backward compatibility)
        insertTranscriptionDirectly(transcriptionResult, true);
      } else {
        console.warn("No usable transcription content found");
      }
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
