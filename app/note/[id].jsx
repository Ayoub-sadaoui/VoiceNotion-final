import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  forwardRef,
  useImperativeHandle,
} from "react";
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
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { useTheme } from "../../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import usePageStorage from "../../hooks/usePageStorage";
import HelloWorld from "../../components/Editor.web";
import debounce from "lodash.debounce";

// API Key for Google Cloud Speech-to-Text
// SECURITY WARNING: For production, this should be moved to a secure backend
const GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY =
  "AIzaSyBUjmj5WK8mqBhLlhyx-5-J3blXa9v8ZzQ"; // REPLACE THIS!

// This component is a native wrapper around our DOM Editor.web.jsx component
const Editor = forwardRef((props, ref) => {
  // ... existing code ...

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

    // Add a method to insert transcribed text
    insertTranscription: (text) => {
      if (editorRef.current && editorRef.current._blockNoteEditor) {
        try {
          // Create a new paragraph block
          const newBlock = { type: "paragraph", content: text };

          // Try to insert after the last block
          if (
            editorRef.current._blockNoteEditor.document &&
            editorRef.current._blockNoteEditor.document.length > 0
          ) {
            const lastBlockId =
              editorRef.current._blockNoteEditor.document[
                editorRef.current._blockNoteEditor.document.length - 1
              ].id;
            editorRef.current._blockNoteEditor.insertBlocks(
              [newBlock],
              lastBlockId,
              "after"
            );
            return true;
          } else {
            // Try inserting at root
            editorRef.current._blockNoteEditor.insertBlocks(
              [newBlock],
              "root",
              "after"
            );
            return true;
          }
        } catch (error) {
          console.error("Error inserting transcription:", error);
          return false;
        }
      }
      return false;
    },

    // Delete the current page
    deleteCurrentPage: () => {
      if (editorRef.current && currentPageId) {
        editorRef.current.deleteCurrentPage(currentPageId);
      }
    },
  }));
}); // Close the Editor component

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

  // Recording state
  const [recording, setRecording] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState(null);

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
              const savedPage = await savePage(updatedPage);
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
  }, [currentPage, getChildrenOfPage, editorContent, savePage, title, icon]);

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

  // Alternative approach to transcribe audio using file URI instead of Base64
  const transcribeAudioAlternative = async (audioUri) => {
    try {
      console.log("Starting alternative transcription process for:", audioUri);

      if (!audioUri) {
        console.error("No audio URI provided for transcription");
        return null;
      }

      // For debugging - add a short delay to ensure file is fully written
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Check if file exists and get info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      console.log("File info:", fileInfo);

      if (!fileInfo.exists) {
        console.error("Audio file does not exist at specified URI");
        return null;
      }

      // Get file extension from URI
      const fileExtension = audioUri.split(".").pop().toLowerCase();
      console.log("File extension:", fileExtension);

      // Prepare request to Speech-to-Text API using custom approach - this is an alternative
      // that we'll try if the direct Base64 approach fails

      // First, try the main approach
      const transcription = await transcribeAudio(audioUri);

      if (transcription) {
        return transcription;
      } else {
        console.log(
          "Main transcription approach failed, please check your API key and account setup"
        );
        Alert.alert(
          "Transcription Issue",
          "There was a problem with the transcription service. Please verify your Google Cloud API key and ensure the Speech-to-Text API is enabled in your Google Cloud Console."
        );
        return null;
      }
    } catch (error) {
      console.error("Error in alternative transcription method:", error);
      return null;
    }
  };

  // Handle voice record button press
  const handleVoiceRecordPress = async () => {
    try {
      // If we're already recording, stop the recording
      if (isRecording) {
        const uri = await stopRecording();
        // Process the recording for transcription
        if (uri) {
          console.log("Starting transcription of recorded audio...");
          const transcription = await transcribeAudioAlternative(uri);

          // Check if we have valid transcription text
          if (transcription) {
            console.log("Final transcription result:", transcription);

            // Debug available methods on the editor ref
            console.log(
              "Editor ref methods:",
              Object.keys(editorRef.current || {})
            );

            // Check if editor reference exists
            if (editorRef.current) {
              try {
                // Force direct access to the DOM component if it exists
                if (
                  editorRef.current._reactInternals?.child?.child?.stateNode
                ) {
                  console.log("Found DOM component via _reactInternals");
                  const domComponent =
                    editorRef.current._reactInternals.child.child.stateNode;
                  if (
                    typeof domComponent.insertTranscribedText === "function"
                  ) {
                    const success =
                      domComponent.insertTranscribedText(transcription);
                    if (success) {
                      console.log(
                        "Successfully inserted text via DOM component"
                      );
                      return;
                    }
                  }
                }

                // Try using the insertTranscribedText method first
                if (
                  typeof editorRef.current.insertTranscribedText === "function"
                ) {
                  const success =
                    editorRef.current.insertTranscribedText(transcription);
                  if (success) {
                    console.log(
                      "Successfully inserted transcription into editor"
                    );
                    return;
                  } else {
                    console.warn(
                      "insertTranscribedText returned false, trying fallback approaches"
                    );
                  }
                } else {
                  console.warn(
                    "insertTranscribedText method not found on editor ref"
                  );
                }

                // Fallback approach - try to access the editor directly
                if (typeof editorRef.current.getEditor === "function") {
                  const editor = editorRef.current.getEditor();
                  if (editor) {
                    console.log("Got editor instance, inserting text directly");

                    // Create a properly formatted paragraph block
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

                    // Get the current blocks
                    const blocks = editor.topLevelBlocks;

                    // Insert the block
                    if (blocks && blocks.length > 0) {
                      const lastBlock = blocks[blocks.length - 1];
                      editor.insertBlocks([newBlock], lastBlock, "after");
                      console.log(
                        "Successfully inserted text using direct editor access"
                      );
                      return;
                    } else {
                      editor.insertBlocks([newBlock], null, "firstChild");
                      console.log("Successfully inserted text at root level");
                      return;
                    }
                  }
                }

                // If all else fails, show an alert with the transcription
                Alert.alert("Transcription Result", transcription, [
                  {
                    text: "OK",
                    onPress: () =>
                      console.log("User acknowledged transcription"),
                  },
                ]);
              } catch (editorError) {
                console.error("Error inserting text into editor:", editorError);
                // Show alert with transcription so user can manually copy
                Alert.alert("Transcription Result", transcription, [
                  {
                    text: "OK",
                    onPress: () =>
                      console.log("User acknowledged transcription"),
                  },
                ]);
              }
            } else {
              console.warn("Editor reference is not available");
              // Show alert with transcription so user can manually copy
              Alert.alert("Transcription Result", transcription, [
                {
                  text: "OK",
                  onPress: () => console.log("User acknowledged transcription"),
                },
              ]);
            }
          } else {
            console.warn("No transcription result available to insert");
          }
        }
        return;
      }

      // Otherwise check permissions and start recording
      console.log("Requesting microphone permission...");
      const { status } = await Audio.requestPermissionsAsync();
      console.log("Permission status:", status);

      if (status !== "granted") {
        Alert.alert(
          "Permission Required",
          "Microphone permission is needed to use voice recording features.",
          [{ text: "OK" }]
        );
        return;
      }

      // Permission is granted, start recording
      await startRecording();
    } catch (error) {
      console.error("Error in voice recording process:", error);
      Alert.alert("Error", "Failed to handle voice recording.");
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

  // Start recording function
  const startRecording = async () => {
    try {
      console.log("Starting recording...");

      // Set audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false, // Or true, depending on desired behavior
        staysActiveInBackground: false,
      });

      // Use AMR format which is well-supported by Google Speech-to-Text
      const { recording: newRecording } = await Audio.Recording.createAsync({
        android: {
          extension: ".amr",
          outputFormat: Audio.AndroidOutputFormat.AMR_NB,
          audioEncoder: Audio.AndroidAudioEncoder.AMR_NB,
          sampleRate: 8000, // AMR_NB uses 8kHz
          numberOfChannels: 1,
          bitRate: 12200, // Standard for AMR_NB
        },
        ios: {
          extension: ".m4a", // iOS doesn't support AMR natively, fallback to AAC
          outputFormat: Audio.IOSOutputFormat.MPEG4AAC,
          audioQuality: Audio.IOSAudioQuality.HIGH,
          sampleRate: 44100,
          numberOfChannels: 1,
          bitRate: 128000,
        },
        web: {
          mimeType: "audio/mp4",
          bitsPerSecond: 128000,
        },
      });

      // Update state
      setRecording(newRecording);
      setIsRecording(true);
      console.log("Recording started");
    } catch (error) {
      console.error("Failed to start recording:", error);
      Alert.alert("Error", "Failed to start recording. Please try again.");
    }
  };

  // Stop recording function
  const stopRecording = async () => {
    console.log("Stopping recording...");
    if (!recording) {
      console.warn("No active recording to stop");
      return null;
    }

    try {
      // Stop the recording
      await recording.stopAndUnloadAsync();

      // Get the recorded URI
      const uri = recording.getURI();
      console.log("Recording stopped and stored at:", uri);

      // Reset recording state and save URI
      setRecording(null);
      setIsRecording(false);
      setRecordedUri(uri);

      return uri;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      Alert.alert("Error", "Failed to stop recording.");
      setIsRecording(false);
      setRecording(null);
      return null;
    }
  };

  // Transcribe audio using Google Cloud Speech-to-Text API
  const transcribeAudio = async (audioUri) => {
    try {
      console.log("Starting transcription process for:", audioUri);

      // Check if URI exists
      if (!audioUri) {
        console.error("No audio URI provided for transcription");
        return null;
      }

      // Get file extension from URI to determine encoding
      const fileExtension = audioUri.split(".").pop().toLowerCase();
      console.log("File extension detected:", fileExtension);

      // Set encoding based on file extension
      let encoding = "AMR";
      let sampleRate = 8000;

      if (fileExtension === "m4a") {
        encoding = "AMR"; // Using AMR for m4a as it's more compatible
        sampleRate = 44100;
      } else if (fileExtension === "amr") {
        encoding = "AMR";
        sampleRate = 8000;
      }

      console.log(`Using encoding: ${encoding}, sample rate: ${sampleRate}`);

      // Read the audio file as Base64
      const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      console.log(
        `Read audio file successfully, size: ${base64Audio.length} bytes`
      );

      // Prepare request body for Google Cloud Speech-to-Text API
      const requestBody = {
        config: {
          encoding: encoding,
          sampleRateHertz: sampleRate,
          languageCode: "en-US",
          audioChannelCount: 1,
          enableAutomaticPunctuation: true,
        },
        audio: {
          content: base64Audio,
        },
      };

      // Log the first few characters of the base64 content to verify format
      console.log(
        "Base64 content preview:",
        base64Audio.substring(0, 50) + "..."
      );

      // Make API request
      console.log(
        `Sending request to Google Cloud Speech-to-Text API with ${encoding} encoding...`
      );
      const response = await fetch(
        `https://speech.googleapis.com/v1/speech:recognize?key=${GOOGLE_CLOUD_SPEECH_TO_TEXT_API_KEY}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      // Check response status
      if (!response.ok) {
        const errorText = await response.text();
        console.error("API Error:", response.status, errorText);
        return null;
      }

      // Parse response
      const responseData = await response.json();
      console.log(
        "Google Cloud Speech-to-Text API Raw Response:",
        JSON.stringify(responseData, null, 2)
      );

      // Extract transcription text if available
      if (
        responseData &&
        responseData.results &&
        responseData.results.length > 0 &&
        responseData.results[0].alternatives &&
        responseData.results[0].alternatives.length > 0
      ) {
        const transcription =
          responseData.results[0].alternatives[0].transcript;
        console.log("Transcription successful:", transcription);
        return transcription;
      } else {
        console.warn(
          "No transcription result returned - Try speaking more clearly or for longer"
        );
        Alert.alert(
          "No Speech Detected",
          "No speech was detected in the recording. Please try again and speak clearly."
        );
        return null;
      }
    } catch (error) {
      console.error("Error during transcription:", error);
      Alert.alert(
        "Transcription Error",
        "Failed to transcribe audio: " + error.message
      );
      return null;
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
      <TouchableOpacity style={[styles.backButton]} onPress={handleGoBack}>
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

      {/* Voice Recording Button */}
      <TouchableOpacity
        style={[
          styles.voiceButton,
          {
            backgroundColor: isRecording ? "#FF3B30" : theme.primary,
            bottom: isKeyboardVisible ? keyboardHeight + 50 : 60,
          },
        ]}
        onPress={handleVoiceRecordPress}
      >
        <Ionicons name={isRecording ? "stop" : "mic"} size={28} color="white" />
      </TouchableOpacity>
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
    top: 20,
    left: 15,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  savingIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    top: 20,
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
    paddingTop: 50,
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
    fontSize: 36,
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 4,
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
  voiceButton: {
    position: "absolute",
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 9999,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
});
