import { useState, useRef, useCallback, useEffect } from "react";
import debounce from "lodash.debounce";
import { sanitizeContentBlocks } from "../utils/contentUtils";
import { updateNote } from "../services/noteService";
import { useAuth } from "../contexts/AuthContext";

/**
 * Custom hook for managing editor content with history tracking
 * @param {Object} currentPage - Current page object
 * @param {Function} storageSavePage - Function to save page to storage
 * @param {Function} setCurrentPage - State setter for current page
 * @param {string} title - Page title
 * @param {string} icon - Page icon
 * @returns {Object} - Editor content state and methods
 */
const useEditorContent = (
  currentPage,
  storageSavePage,
  setCurrentPage,
  title,
  icon
) => {
  // Get user from auth context
  const { user } = useAuth();

  // Content state
  const [editorContent, setEditorContent] = useState(null);
  const [initialContent, setInitialContent] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(0);
  const [recentTranscription, setRecentTranscription] = useState("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [lastSavedContent, setLastSavedContent] = useState(null);

  // History state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [isUndoRedoOperation, setIsUndoRedoOperation] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Refs
  const editorRef = useRef(null);
  const saveTimer = useRef(null);
  const savingIndicatorTimer = useRef(null);
  const savingOperationInProgress = useRef(false);

  // Initialize content from page
  useEffect(() => {
    if (currentPage) {
      try {
        let content = null;
        setIsInitialLoad(true);

        // Parse content from page
        if (currentPage.contentJson) {
          try {
            content = JSON.parse(currentPage.contentJson);

            // Verify content is an array
            if (!Array.isArray(content)) {
              console.error(
                "Content is not an array, creating default content"
              );
              throw new Error("Content is not an array");
            }
          } catch (parseError) {
            console.error("Error parsing content JSON:", parseError);
            content = null;
          }
        }
        // If contentJson is not available, try using content directly
        else if (currentPage.content && Array.isArray(currentPage.content)) {
          console.log("Using content array directly");
          content = currentPage.content;
        }

        // Sanitize content to ensure valid format
        const sanitizedContent = sanitizeContentBlocks(content);
        console.log(
          `Initializing editor with ${sanitizedContent?.length || 0} blocks`
        );

        // Set initial content
        setInitialContent(sanitizedContent);
        setEditorContent(sanitizedContent);
        setLastSavedContent(sanitizedContent);

        // Reset history
        setUndoStack([]);
        setRedoStack([]);
        setCanUndo(false);
        setCanRedo(false);

        // After a short delay, allow saving again
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 500);
      } catch (error) {
        console.error("Error initializing page content:", error);
        // Create default content if parsing fails
        const defaultContent = [
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
                text: title || "Untitled",
                styles: {},
              },
            ],
            children: [],
          },
        ];

        setInitialContent(defaultContent);
        setEditorContent(defaultContent);
        setLastSavedContent(defaultContent);

        // After a short delay, allow saving again
        setTimeout(() => {
          setIsInitialLoad(false);
        }, 500);
      }
    }
  }, [currentPage, title]);

  // Update canUndo and canRedo based on stack state
  useEffect(() => {
    setCanUndo(undoStack.length > 0);
    setCanRedo(redoStack.length > 0);
  }, [undoStack, redoStack]);

  // Function to compare content deeply
  const areContentsEqual = (content1, content2) => {
    if (!content1 || !content2) return false;
    if (content1 === content2) return true;

    try {
      const str1 = JSON.stringify(content1);
      const str2 = JSON.stringify(content2);
      return str1 === str2;
    } catch (e) {
      console.error("Error comparing contents:", e);
      return false;
    }
  };

  // Debounced save function
  const debouncedSave = useCallback(
    debounce(async (content) => {
      if (!currentPage || !content || isInitialLoad) return;
      if (savingOperationInProgress.current) return;
      if (areContentsEqual(content, lastSavedContent)) {
        console.log("Content unchanged, skipping save");
        setIsSaving(false);
        return;
      }

      try {
        savingOperationInProgress.current = true;
        // Show saving indicator immediately for better feedback
        setIsSaving(true);

        // Make sure content is properly structured as an array
        let contentToSave = Array.isArray(content) ? [...content] : [];

        // Remove any trailing empty blocks
        while (
          contentToSave.length > 1 && // Keep at least one block
          contentToSave[contentToSave.length - 1]?.type === "paragraph" &&
          (!contentToSave[contentToSave.length - 1]?.content ||
            contentToSave[contentToSave.length - 1]?.content.length === 0 ||
            (contentToSave[contentToSave.length - 1]?.content.length === 1 &&
              contentToSave[contentToSave.length - 1]?.content[0]?.type ===
                "text" &&
              !contentToSave[contentToSave.length - 1]?.content[0]?.text))
        ) {
          console.log("Removing trailing empty block before saving");
          contentToSave.pop();
        }

        // Ensure all blocks have proper content
        contentToSave = contentToSave.map((block) => {
          // Deep clone the block to avoid reference issues
          const processedBlock = JSON.parse(JSON.stringify(block));

          // If the block has no content array or empty content, add a default text node
          if (
            !processedBlock.content ||
            !Array.isArray(processedBlock.content) ||
            processedBlock.content.length === 0
          ) {
            return {
              ...processedBlock,
              content: [{ type: "text", text: "", styles: {} }],
            };
          }

          // Ensure text nodes have at least an empty string
          if (processedBlock.content) {
            processedBlock.content = processedBlock.content.map((item) => {
              if (item.type === "text" && item.text === undefined) {
                return { ...item, text: "" };
              }
              return item;
            });
          }

          return processedBlock;
        });

        const contentJsonString = JSON.stringify(contentToSave);

        const updatedPage = {
          ...currentPage,
          title: title || currentPage.title,
          icon: icon || currentPage.icon,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        console.log("Saving page to storage:", {
          id: updatedPage.id,
          title: updatedPage.title,
          icon: updatedPage.icon,
          contentLength: contentJsonString.length,
          blockCount: contentToSave.length,
        });

        const savedPage = await storageSavePage(updatedPage);

        if (savedPage) {
          console.log("Page saved successfully to storage");
          setCurrentPage(savedPage);
          setLastSavedContent(contentToSave);

          // Save to Supabase if user is authenticated
          if (user && user.id) {
            console.log("Saving content to Supabase for user:", user.id);
            try {
              const result = await updateNote(user.id, currentPage.id, {
                title: title || currentPage.title,
                icon: icon || currentPage.icon,
                content: contentToSave, // Send processed content directly as object
                contentJson: contentJsonString, // Also send as string for backward compatibility
              });

              if (result && result.success) {
                console.log("Content saved to Supabase successfully");
              } else {
                console.error("Error saving to Supabase:", result?.error);
              }
            } catch (supabaseError) {
              console.error(
                "Exception saving content to Supabase:",
                supabaseError
              );
            }
          } else {
            console.warn("User not authenticated, skipping Supabase save");
          }
        } else {
          console.error("Failed to save page to storage");
        }
      } catch (error) {
        console.error("Error saving page:", error);
      } finally {
        // Always clear saving indicator
        savingOperationInProgress.current = false;
        setIsSaving(false);
      }
    }, 1500), // Increased debounce time to reduce frequent saves
    [
      currentPage,
      storageSavePage,
      setCurrentPage,
      title,
      icon,
      isInitialLoad,
      user,
      lastSavedContent,
    ]
  );

  // Handle content change
  const handleContentChange = useCallback(
    (newContent) => {
      // Skip if content is the same or during initial load
      if (
        isInitialLoad ||
        !newContent ||
        areContentsEqual(newContent, editorContent)
      ) {
        return;
      }

      // Add current content to undo stack if not an undo/redo operation
      if (!isUndoRedoOperation && editorContent) {
        setUndoStack((prev) => [...prev, editorContent]);
        setRedoStack([]);
      } else {
        setIsUndoRedoOperation(false);
      }

      // Update content state
      setEditorContent(newContent);

      // Save content
      debouncedSave(newContent);
    },
    [editorContent, isUndoRedoOperation, debouncedSave, isInitialLoad]
  );

  // Force save function (non-debounced)
  const handleSave = useCallback(async () => {
    if (!currentPage || !editorContent) return;
    if (savingOperationInProgress.current) return;
    if (areContentsEqual(editorContent, lastSavedContent)) {
      console.log("Content unchanged, skipping force save");
      return currentPage;
    }

    try {
      savingOperationInProgress.current = true;
      // Show saving indicator immediately
      setIsSaving(true);

      // Cancel any pending debounced save
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
      debouncedSave.cancel();

      // Make sure content is properly structured as an array
      let contentToSave = Array.isArray(editorContent)
        ? [...editorContent]
        : [];

      // Remove any trailing empty blocks
      while (
        contentToSave.length > 1 && // Keep at least one block
        contentToSave[contentToSave.length - 1]?.type === "paragraph" &&
        (!contentToSave[contentToSave.length - 1]?.content ||
          contentToSave[contentToSave.length - 1]?.content.length === 0 ||
          (contentToSave[contentToSave.length - 1]?.content.length === 1 &&
            contentToSave[contentToSave.length - 1]?.content[0]?.type ===
              "text" &&
            !contentToSave[contentToSave.length - 1]?.content[0]?.text))
      ) {
        console.log("Removing trailing empty block before force saving");
        contentToSave.pop();
      }

      // Ensure all blocks have proper content
      contentToSave = contentToSave.map((block) => {
        // Deep clone the block to avoid reference issues
        const processedBlock = JSON.parse(JSON.stringify(block));

        // If the block has no content array or empty content, add a default text node
        if (
          !processedBlock.content ||
          !Array.isArray(processedBlock.content) ||
          processedBlock.content.length === 0
        ) {
          return {
            ...processedBlock,
            content: [{ type: "text", text: "", styles: {} }],
          };
        }

        // Ensure text nodes have at least an empty string
        if (processedBlock.content) {
          processedBlock.content = processedBlock.content.map((item) => {
            if (item.type === "text" && item.text === undefined) {
              return { ...item, text: "" };
            }
            return item;
          });
        }

        return processedBlock;
      });

      const contentJsonString = JSON.stringify(contentToSave);

      const updatedPage = {
        ...currentPage,
        title: title || currentPage.title,
        icon: icon || currentPage.icon,
        contentJson: contentJsonString,
        updatedAt: Date.now(),
      };

      console.log("Force saving page to storage:", {
        id: updatedPage.id,
        title: updatedPage.title,
        icon: updatedPage.icon,
        contentLength: contentJsonString.length,
        blockCount: contentToSave.length,
      });

      const savedPage = await storageSavePage(updatedPage);

      if (savedPage) {
        console.log("Page force saved successfully to storage");
        setCurrentPage(savedPage);
        setLastSavedContent(contentToSave);

        // Save to Supabase if user is authenticated
        if (user && user.id) {
          console.log("Force saving content to Supabase for user:", user.id);
          try {
            const result = await updateNote(user.id, currentPage.id, {
              title: title || currentPage.title,
              icon: icon || currentPage.icon,
              content: contentToSave, // Send processed content directly as object
              contentJson: contentJsonString, // Also send as string for backward compatibility
            });

            if (result && result.success) {
              console.log("Content force saved to Supabase successfully");
            } else {
              console.error("Error force saving to Supabase:", result?.error);
            }
          } catch (supabaseError) {
            console.error(
              "Exception force saving content to Supabase:",
              supabaseError
            );
          }
        } else {
          console.warn("User not authenticated, skipping Supabase force save");
        }

        return savedPage;
      } else {
        console.error("Failed to force save page to storage");
        return null;
      }
    } catch (error) {
      console.error("Error force saving page:", error);
      return null;
    } finally {
      // Always clear saving indicator
      savingOperationInProgress.current = false;
      setIsSaving(false);
    }
  }, [
    currentPage,
    editorContent,
    storageSavePage,
    setCurrentPage,
    title,
    icon,
    debouncedSave,
    user,
    lastSavedContent,
  ]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      // Cancel any pending saves
      debouncedSave.cancel();

      // Clear any pending timers
      if (savingIndicatorTimer.current) {
        clearTimeout(savingIndicatorTimer.current);
      }

      // Save any pending changes
      if (editorContent && currentPage && !isInitialLoad) {
        handleSave();
      }
    };
  }, [debouncedSave, handleSave, editorContent, currentPage, isInitialLoad]);

  return {
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
  };
};

export default useEditorContent;
