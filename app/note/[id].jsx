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
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePageStorage from "../../hooks/usePageStorage";
import HelloWorld from "../../components/Editor.web";
import debounce from "lodash.debounce";

export default function NoteScreen() {
  const { theme, isDark } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const editorRef = useRef(null);

  // Get page storage functionality
  const {
    getPageById,
    savePage,
    createNewPage,
    deletePage,
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

          // Remove the invalid page links
          if (editorRef.current.removePageLinks) {
            editorRef.current.removePageLinks(invalidLinkIds);
          } else {
            // Fallback to removing one by one
            invalidLinkIds.forEach((pageId) => {
              if (editorRef.current.removePageLink) {
                editorRef.current.removePageLink(pageId);
              }
            });
          }

          // Force a save to update the content
          handleSave();
        }
      }
    } catch (err) {
      console.error("Error loading nested pages:", err);
    }
  }, [currentPage, getChildrenOfPage, editorContent, handleSave]);

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

        const savedPage = await savePage(updatedPage);
        console.log("Auto-save completed successfully");
        setCurrentPage(savedPage);
      } catch (err) {
        console.error("Error during auto-save:", err);
      } finally {
        setIsSaving(false);
      }
    }, 1000),
    [currentPage, savePage, title, icon]
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

      setEditorContent(content);
      debouncedSave(content);
    },
    [debouncedSave]
  );

  // Create and navigate to a new nested page
  const handleInsertNestedPage = async () => {
    try {
      setIsSaving(true);
      // Create new page with current page as parent
      const newPage = await createNewPage(currentPage.id, "New Page", "📄");
      console.log("Created nested page:", newPage.id);

      // Insert a page link in the current editor
      if (editorRef.current) {
        try {
          editorRef.current.insertPageLink(
            newPage.id,
            newPage.title,
            newPage.icon
          );
          console.log("Page link inserted successfully");

          // Save the current page with the new link
          await handleSave();

          // Show success message
          // You could add a toast or alert here
        } catch (insertError) {
          console.error("Error inserting page link:", insertError);
        }
      }

      setIsSaving(false);

      // OPTIONAL: Navigate to the new page (comment this out if you want to stay on current page)
      // router.push(`/note/${newPage.id}`);
    } catch (err) {
      console.error("Error creating nested page:", err);
      setIsSaving(false);
    }
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
    if (!currentPage) {
      console.warn("Cannot save: No page loaded");
      return false;
    }

    if (!editorContent) {
      console.warn("Cannot save: No editor content available");
      return true; // Not a critical error, content might just be empty
    }

    setIsSaving(true);
    try {
      console.log("Saving page content:", currentPage.id);

      // Safely stringify the content
      let contentJsonString;
      try {
        contentJsonString = JSON.stringify(editorContent);
        console.log(
          "Content serialized successfully, length:",
          contentJsonString.length
        );
      } catch (serializeErr) {
        console.error("Error serializing content:", serializeErr);
        return false;
      }

      const updatedPage = {
        ...currentPage,
        contentJson: contentJsonString,
        title: title,
        icon: icon,
        updatedAt: Date.now(),
      };

      const savedPage = await savePage(updatedPage);
      console.log("Page saved successfully:", savedPage.id);
      setCurrentPage(savedPage);
      return true;
    } catch (err) {
      console.error("Error saving page:", err);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Handle title change with automatic saving
  const handleTitleChange = (newTitle) => {
    setTitle(newTitle);
    if (currentPage) {
      debouncedSave(editorContent || initialContent);
    }
  };

  // Handle deleting the current page
  const handleDeletePage = async (pageId, isUserInitiated = true) => {
    try {
      if (!pageId) return;

      console.log(
        `Deleting page: ${pageId}, user initiated: ${isUserInitiated}`
      );

      // If this is the current page, we need to navigate away
      const isCurrentPage = pageId === currentPage?.id;
      const parentId = currentPage?.parentId;

      // Get all pages that will be deleted (this page and its descendants)
      const allPages = await loadAllPages();
      const pagesToDelete = collectPageAndDescendants(allPages, pageId);

      console.log(
        `Deleting page ${pageId} and ${pagesToDelete.length - 1} descendants`
      );

      // Delete the page from storage
      const result = await deletePage(pageId);

      if (result) {
        console.log("Page deleted successfully");

        // If this was triggered by block deletion in the editor (not user initiated)
        // and it's not the current page, we don't need to navigate
        if (!isUserInitiated && !isCurrentPage) {
          // Refresh nested pages
          loadNestedPages();
          return;
        }

        // For user-initiated deletion or if we're deleting the current page
        if (isCurrentPage) {
          // Navigate to parent page or home
          if (parentId) {
            router.replace(`/note/${parentId}`);
          } else {
            router.replace("/");
          }
        } else {
          // Remove the page link block from the editor
          if (editorRef.current) {
            // Get IDs of all pages being deleted (including descendants)
            const pageIdsToRemove = pagesToDelete.map((page) => page.id);

            // Remove all page links at once if the new method is available
            if (editorRef.current.removePageLinks) {
              editorRef.current.removePageLinks(pageIdsToRemove);
            } else {
              // Fallback to removing one by one
              editorRef.current.removePageLink(pageId);

              // If there are descendants, remove their page links too
              if (pagesToDelete.length > 1) {
                pagesToDelete.forEach((page) => {
                  if (page.id !== pageId) {
                    editorRef.current.removePageLink(page.id);
                  }
                });
              }
            }
          }

          // Refresh nested pages
          loadNestedPages();
        }
      }
    } catch (err) {
      console.error("Error deleting page:", err);
    }
  };

  // Helper function to collect a page and all its descendants
  const collectPageAndDescendants = (pages, rootId) => {
    const result = [];

    // Find the root page first
    const rootPage = pages.find((page) => page.id === rootId);
    if (rootPage) {
      result.push(rootPage);
    }

    // Recursive function to find all children
    const findChildren = (parentId) => {
      const childrenPages = pages.filter((page) => page.parentId === parentId);

      childrenPages.forEach((child) => {
        result.push(child);
        findChildren(child.id);
      });
    };

    findChildren(rootId);
    return result;
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

      {/* Back button */}
      <TouchableOpacity
        style={[
          styles.backButton,
          { backgroundColor: theme.surface || "#F2F2F7" },
        ]}
        onPress={handleGoBack}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Save indicator */}
      {isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={theme.secondary} />
          <Text style={[styles.savingText, { color: theme.secondaryText }]}>
            Saving...
          </Text>
        </View>
      )}

      {/* Title area */}
      <View style={styles.titleContainer}>
        <Text style={[styles.iconDisplay, { color: theme.text }]}>{icon}</Text>

        <TextInput
          style={[
            styles.titleInput,
            {
              color: theme.text,
              borderBottomColor: `${theme.text}20`,
            },
          ]}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Note Title"
          placeholderTextColor={theme.secondaryText || "#999"}
          maxLength={100}
        />
      </View>

      {/* Editor */}
      <KeyboardAvoidingView
        style={styles.editorContainer}
        behavior={Platform.OS === "ios" ? "padding" : null}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {initialContent ? (
          <HelloWorld
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

      {/* Debug button in dev mode */}
      {__DEV__ && (
        <TouchableOpacity
          style={[styles.debugButton, { backgroundColor: theme.primary }]}
          onPress={() => {
            const debugInfo = {
              pageId: currentPage.id,
              parentId: currentPage.parentId,
              title: title,
              icon: icon,
              hasContent: !!editorContent,
              initialContentBlocks: initialContent ? initialContent.length : 0,
              updatedAt: new Date(currentPage.updatedAt).toLocaleString(),
            };

            console.log("Page Debug Info:", debugInfo);
            alert(`Debug Info:\n${JSON.stringify(debugInfo, null, 2)}`);
          }}
        >
          <MaterialIcons name="bug-report" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 15,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  savingIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    top: 50,
    right: 15,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  savingText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 20,
    paddingBottom: 10,
    width: "100%",
  },
  iconDisplay: {
    fontSize: 24,
    marginRight: 10,
  },
  titleInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
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
  debugButton: {
    position: "absolute",
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
