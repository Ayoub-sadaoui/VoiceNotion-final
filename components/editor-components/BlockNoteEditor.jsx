"use dom";

import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import "../editor.css";
import "../toolbar.css";
import "../keyboard-toolbar.css";
import { selectionDisablerScript } from "../selectionDisabler";

// Import our custom components
import EditorToolbars from "./EditorToolbars";
import KeyboardToolbarWrapper from "./KeyboardToolbarWrapper";
import ConfirmDialog from "./ConfirmDialog";
import editorSchema from "./editorSchema";
import TranscriptionHandler from "./TranscriptionHandler";

/**
 * Main editor component that uses BlockNote
 */
const BlockNoteEditor = forwardRef((props, ref) => {
  const {
    initialContent,
    theme = "light",
    onChange,
    onNavigateToPage,
    onCreateNestedPage,
    onDeletePage,
    keyboardHeight = 0,
    isKeyboardVisible = false,
    currentPageId,
    nestedPages = [],
    recentTranscription = null,
  } = props;

  // Use a ref to track whether component is mounted
  const isMountedRef = useRef(false);
  const editorInstance = useRef(null);
  const [contentInitialized, setContentInitialized] = useState(false);

  // State for dialog to create a new page
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  // Creates a new editor instance with custom settings
  const editor = useCreateBlockNote({
    initialContent: initialContent || [
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
            text: "start typing ",
            styles: {},
          },
        ],
        children: [],
      },
    ],
    // Enable debug logging for BlockNote
    enableDebugLogging: true,
    // Use our custom schema with the page link block
    schema: editorSchema,
    // Add safer defaults for editor
    domAttributes: {
      editor: {
        class: "blocknote-editor",
        style: "height: 100%; min-height: 150px; width: 100%;",
      },
      block: {
        style: "margin: 0.5em 0;",
      },
    },
    onError: (error) => {
      console.error("BlockNote editor error:", error);
    },
  });

  // Save the editor instance to ref so we can access it later
  editorInstance.current = editor;

  // Function to check if any page links were deleted and delete the corresponding pages
  const checkForDeletedPageLinks = useCallback(() => {
    if (!editor || !nestedPages || nestedPages.length === 0) return;

    // Get all page link blocks currently in the editor
    const currentPageLinks = [];
    const allBlocks = editor.topLevelBlocks;

    // Collect all page link blocks
    allBlocks.forEach((block) => {
      if (block.type === "pageLink") {
        currentPageLinks.push(block.props.pageId);
      }
    });

    // Find pages that exist in nestedPages but not in the editor (they were deleted)
    const deletedPageIds = nestedPages
      .filter((page) => !currentPageLinks.includes(page.id))
      .map((page) => page.id);

    // Delete these pages if any were found
    if (deletedPageIds.length > 0) {
      console.log("Detected deleted page link blocks:", deletedPageIds);
      deletedPageIds.forEach((pageId) => {
        if (onDeletePage) {
          console.log("Deleting page due to removed page link:", pageId);
          onDeletePage(pageId, false); // The 'false' flag indicates this is from block deletion
        }
      });
    }
  }, [editor, nestedPages, onDeletePage]);

  // Add the change handler to the editor instance
  useEffect(() => {
    if (editor && onChange) {
      // Set up the change handler on the editor instance
      const unsubscribe = editor.onChange(() => {
        // Check if any page link blocks were deleted
        checkForDeletedPageLinks();

        // Call the onChange handler with the latest content
        onChange(editor.topLevelBlocks);
      });

      // Cleanup when component unmounts
      return () => {
        unsubscribe();
      };
    }
  }, [editor, onChange, checkForDeletedPageLinks]);

  // Store the navigation callback in the editor's storage
  useEffect(() => {
    if (editor && onNavigateToPage) {
      // Initialize the storage for our custom block if needed
      if (!editor._tiptapEditor.storage.pageLink) {
        editor._tiptapEditor.storage.pageLink = {};
      }
      // Store the callback in the editor's storage
      editor._tiptapEditor.storage.pageLink.onNavigateToPage = onNavigateToPage;
    }
  }, [editor, onNavigateToPage]);

  // Effect to add page link blocks for nested pages when the editor is initialized
  useEffect(() => {
    if (!editor || !nestedPages) return;

    console.log(
      `Validating page links - ${nestedPages.length} nested pages available`
    );

    // If we have nested pages and initialContent, let's check if we need to add page links
    if (nestedPages.length > 0 && editor.topLevelBlocks) {
      console.log("Checking for missing page links...");

      // Get existing page link blocks
      const existingPageLinkIds = [];
      const existingPageLinkBlocks = [];
      const invalidPageLinkBlocks = [];

      editor.topLevelBlocks.forEach((block) => {
        if (block.type === "pageLink") {
          // Check if this is a valid link (matches a nested page)
          const matchingPage = nestedPages.find(
            (page) => page.id === block.props.pageId
          );

          if (matchingPage) {
            // This is a valid page link
            existingPageLinkIds.push(block.props.pageId);
            existingPageLinkBlocks.push(block);
          } else {
            // This is an invalid page link that doesn't match any nested page
            console.log(
              `Found invalid page link to ${block.props.pageId} (${block.props.pageTitle})`
            );
            invalidPageLinkBlocks.push(block);
          }
        }
      });

      // Remove invalid page link blocks
      if (invalidPageLinkBlocks.length > 0) {
        console.log(
          `Removing ${invalidPageLinkBlocks.length} invalid page link blocks`
        );
        editor.removeBlocks(invalidPageLinkBlocks);
      }

      // Only add missing page links if we haven't initialized content yet
      if (!contentInitialized) {
        // Find pages that don't have corresponding page link blocks
        const missingPageLinks = nestedPages.filter(
          (page) => !existingPageLinkIds.includes(page.id)
        );

        if (missingPageLinks.length > 0) {
          console.log("Found missing page links:", missingPageLinks.length);

          // Add missing page link blocks
          const lastBlock =
            editor.topLevelBlocks.length > 0
              ? editor.topLevelBlocks[editor.topLevelBlocks.length - 1]
              : null;

          const newBlocks = missingPageLinks.map((page) => ({
            type: "pageLink",
            props: {
              pageId: page.id,
              pageTitle: page.title || "Untitled Page",
              pageIcon: page.icon || "📄",
            },
          }));

          if (newBlocks.length > 0) {
            if (lastBlock) {
              // Insert after the last block
              editor.insertBlocks(newBlocks, lastBlock, "after");
            } else {
              // If there are no blocks, insert at the beginning
              editor.insertBlocks(newBlocks, null, "firstChild");
            }
            console.log("Added missing page links:", newBlocks.length);
          }
        }

        setContentInitialized(true);
      }
    }
  }, [editor, nestedPages, contentInitialized]);

  // Handle creating a new page link from toolbar button
  const handleCreatePageLink = () => {
    // First check if we have the callback to create pages
    if (onCreateNestedPage) {
      // Create a temporary title for the new page
      const mockPageTitle = "New Linked Page";
      const mockPageIcon = "📄";

      console.log("Creating new nested page...");

      // Call the parent component's function to create the actual page
      onCreateNestedPage(mockPageTitle, mockPageIcon)
        .then((newPage) => {
          if (newPage && newPage.id) {
            console.log("Inserting page link for:", newPage.title);
            TranscriptionHandler.insertPageLinkBlock(
              editor,
              newPage.id,
              newPage.title,
              newPage.icon
            );
          } else {
            console.warn("Created page is invalid or missing ID");
          }
        })
        .catch((error) => {
          console.error("Failed to create nested page:", error);
          // Insert error message as text
          try {
            const blocks = editor.topLevelBlocks;
            const lastBlock =
              blocks.length > 0 ? blocks[blocks.length - 1] : null;

            if (lastBlock) {
              editor.insertBlocks(
                [
                  {
                    type: "paragraph",
                    props: { textAlignment: "left" },
                    content: [
                      {
                        type: "text",
                        text: "[Could not create page]",
                        styles: { textColor: "red" },
                      },
                    ],
                  },
                ],
                lastBlock,
                "after"
              );
            }
          } catch (err) {
            console.error("Error inserting error message:", err);
          }
        });
    } else {
      console.warn("onCreateNestedPage callback not provided");
    }
  };

  // Handle deleting the current page
  const handleDeleteCurrentPage = () => {
    if (onDeletePage && pageToDelete) {
      onDeletePage(pageToDelete, true); // The 'true' flag indicates this is a user-initiated deletion
    }
    setShowDeleteConfirm(false);
    setPageToDelete(null);
  };

  // Effect to disable text selection handling on iOS
  useEffect(() => {
    isMountedRef.current = true;

    // Add the script to disable selection handling
    const script = document.createElement("script");
    script.textContent = selectionDisablerScript;
    document.head.appendChild(script);

    return () => {
      isMountedRef.current = false;
      document.head.removeChild(script);
    };
  }, []);

  // Handle recentTranscription changes
  useEffect(() => {
    if (recentTranscription && editor) {
      console.log("BlockNoteEditor: New transcription detected, updating UI");

      // Ensure the editor is focused and visible
      try {
        // First focus the editor
        editor.focus();

        // Then scroll to the bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          try {
            const editorElement = document.querySelector(".blocknote-editor");
            if (editorElement) {
              // Scroll to bottom with animation
              editorElement.scrollTo({
                top: editorElement.scrollHeight,
                behavior: "smooth",
              });
              console.log("Scrolled editor to latest content");

              // Create a brief visual highlight effect for the new content
              const paragraphs = editorElement.querySelectorAll("p");
              if (paragraphs.length > 0) {
                const lastParagraph = paragraphs[paragraphs.length - 1];
                // Add a temporary highlight class
                lastParagraph.classList.add("highlight-new-content");
                // Remove it after animation completes
                setTimeout(() => {
                  lastParagraph.classList.remove("highlight-new-content");
                }, 2000);
              }
            }
          } catch (scrollError) {
            console.error("Error scrolling editor:", scrollError);
          }
        }, 200);
      } catch (error) {
        console.error("Error updating UI after transcription:", error);
      }
    }
  }, [recentTranscription, editor]);

  // Expose methods to the parent component
  useImperativeHandle(
    ref,
    () => {
      // Create the return object with all the methods we want to expose
      return {
        // Function to get the editor content
        getContent: () => {
          if (editor) {
            return editor.topLevelBlocks;
          }
          return null;
        },

        // Function to set the editor content
        setContent: (content) => {
          if (editor && content) {
            editor.replaceBlocks(
              editor.document?.map((block) => block.id) || [],
              content
            );
            return true;
          }
          return false;
        },

        // Function to insert a page link block
        insertPageLink: (pageId, pageTitle, pageIcon) => {
          return TranscriptionHandler.insertPageLinkBlock(
            editor,
            pageId,
            pageTitle,
            pageIcon
          );
        },

        // Function to delete the current page
        deleteCurrentPage: () => {
          if (onDeletePage && currentPageId) {
            setPageToDelete(currentPageId);
            setShowDeleteConfirm(true);
          }
        },

        // Function to insert transcribed text
        insertTranscribedText: (text) => {
          console.log("insertTranscribedText called with:", text);
          return TranscriptionHandler.insertTranscribedText(editor, text);
        },

        // Provide direct access to the editor
        getEditor: () => {
          return editor;
        },

        // Remove page links by ID
        removePageLinks: (pageIds) => {
          if (!editor || !Array.isArray(pageIds)) return false;

          try {
            const blocksToRemove = [];
            editor.topLevelBlocks.forEach((block) => {
              if (
                block.type === "pageLink" &&
                pageIds.includes(block.props.pageId)
              ) {
                blocksToRemove.push(block);
              }
            });

            if (blocksToRemove.length > 0) {
              editor.removeBlocks(blocksToRemove);
              return true;
            }
            return false;
          } catch (error) {
            console.error("Error removing page links:", error);
            return false;
          }
        },

        // Remove a single page link
        removePageLink: (pageId) => {
          if (!editor || !pageId) return false;

          try {
            const blocksToRemove = editor.topLevelBlocks.filter(
              (block) =>
                block.type === "pageLink" && block.props.pageId === pageId
            );

            if (blocksToRemove.length > 0) {
              editor.removeBlocks(blocksToRemove);
              return true;
            }
            return false;
          } catch (error) {
            console.error("Error removing page link:", error);
            return false;
          }
        },

        // Add a focusEditor method to focus the editor and ensure content updates
        focusEditor: () => {
          console.log("BlockNoteEditor: Attempting to focus editor");
          if (editor) {
            try {
              // Focus the editor
              editor.focus();

              // Scroll to bottom for newly added content
              try {
                const editorElement =
                  document.querySelector(".blocknote-editor");
                if (editorElement) {
                  editorElement.scrollTop = editorElement.scrollHeight;
                  console.log("Scrolled editor to bottom");
                }
              } catch (scrollError) {
                console.error("Error scrolling editor:", scrollError);
              }

              return true;
            } catch (error) {
              console.error("Error focusing editor:", error);
              return false;
            }
          }
          return false;
        },
      };
    },
    [editor, nestedPages, onDeletePage, onCreateNestedPage, onNavigateToPage]
  );

  // Renders the editor instance using a React component
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        overflowY: "auto",
        overflowX: "hidden",
        WebkitOverflowScrolling: "touch",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
      className="editor-scroll-container"
    >
      <BlockNoteView
        editor={editor}
        editable={true}
        sideMenu={false}
        slashMenu={true}
        theme={theme}
        onChange={() => {
          // Call the onChange handler provided by the native side
          if (onChange) {
            onChange(editor.topLevelBlocks);
          }
        }}
        formattingToolbar={false}
        domAttributes={{
          editor: {
            class: "blocknote-editor custom-editor",
            style:
              "height: 100%; min-height: 150px; width: 100%; user-select: text; -webkit-touch-callout: none;",
          },
          block: {
            style: "margin: 0.5em 0;",
          },
        }}
      >
        <EditorToolbars />
      </BlockNoteView>

      <KeyboardToolbarWrapper
        editor={editor}
        onCreatePageLink={handleCreatePageLink}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
      />

      <ConfirmDialog
        show={showDeleteConfirm}
        title="Delete Page"
        message="Are you sure you want to delete this page? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDeleteCurrentPage}
        onCancel={() => setShowDeleteConfirm(false)}
      />
    </div>
  );
});

export default BlockNoteEditor;
