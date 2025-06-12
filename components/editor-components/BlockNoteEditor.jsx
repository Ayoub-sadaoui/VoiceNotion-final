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
  const editorContainerRef = useRef(null);
  const [contentInitialized, setContentInitialized] = useState(false);

  // State for dialog to create a new page
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  // Apply theme class to document when theme changes
  useEffect(() => {
    // Add theme class to document body
    if (typeof document !== "undefined") {
      // Ensure theme is a string
      const themeString = typeof theme === "string" ? theme : "light";
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(`theme-${themeString}`);
    }
  }, [theme]);

  /**
   * Helper function to safely access the editor's internal storage
   *
   * @param {Object} editor - The BlockNote editor instance
   * @param {string} storageKey - The key to access in the editor's storage
   * @param {any} value - Optional value to set in the storage
   * @returns {any} The storage value if only getting, or true if setting was successful
   *
   * NOTE: This is using a private API (_tiptapEditor) which may change in future versions.
   * This wrapper isolates the implementation detail and should be updated if BlockNote
   * provides a public API for custom storage in the future.
   */
  const accessEditorStorage = (editor, storageKey, value = undefined) => {
    if (!editor || !storageKey) return null;

    try {
      // Check if the private API exists
      if (!editor._tiptapEditor || !editor._tiptapEditor.storage) {
        console.warn("Editor internal storage API not available");
        return null;
      }

      // Create storage namespace if it doesn't exist
      if (!editor._tiptapEditor.storage[storageKey]) {
        editor._tiptapEditor.storage[storageKey] = {};
      }

      // Set value if provided
      if (value !== undefined) {
        editor._tiptapEditor.storage[storageKey] = value;
        return true;
      }

      // Return the storage object
      return editor._tiptapEditor.storage[storageKey];
    } catch (error) {
      console.error(
        `Error accessing editor storage for key: ${storageKey}`,
        error
      );
      return null;
    }
  };

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

        // Process content before passing to onChange handler
        const currentBlocks = editor.topLevelBlocks;

        // Filter out any empty blocks at the end that might be automatically added
        const processedBlocks = [...currentBlocks];

        // If there's more than one block, check if the last one is an empty paragraph
        if (processedBlocks.length > 1) {
          const lastBlock = processedBlocks[processedBlocks.length - 1];

          // Check if it's an empty paragraph (no content or empty text)
          if (
            lastBlock.type === "paragraph" &&
            (!lastBlock.content ||
              !lastBlock.content.length ||
              (lastBlock.content.length === 1 &&
                lastBlock.content[0].type === "text" &&
                !lastBlock.content[0].text))
          ) {
            // If this is an automatically added empty block, remove it
            if (!lastBlock.id.includes("user-created")) {
              processedBlocks.pop();
              console.log("Removed automatically added empty block at the end");
            }
          }
        }

        // Call the onChange handler with the processed content
        onChange(processedBlocks);
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
      // Use the wrapper function to safely access editor storage
      const pageLinkStorage = accessEditorStorage(editor, "pageLink") || {};
      pageLinkStorage.onNavigateToPage = onNavigateToPage;
      accessEditorStorage(editor, "pageLink", pageLinkStorage);
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
    if (recentTranscription && editor && editorContainerRef.current) {
      console.log("BlockNoteEditor: New transcription detected, updating UI");

      // Ensure the editor is focused and visible
      try {
        // First focus the editor
        editor.focus();

        // Then scroll to the bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          try {
            // Access the editor element through our ref
            const editorElement =
              editorContainerRef.current.querySelector(".blocknote-editor");
            if (editorElement) {
              // Scroll to bottom with animation
              editorElement.scrollTo({
                top: editorElement.scrollHeight,
                behavior: "smooth",
              });
              console.log("Scrolled editor to latest content");

              // Find the last paragraph for highlighting
              const lastBlock =
                editor.topLevelBlocks[editor.topLevelBlocks.length - 1];
              if (lastBlock && lastBlock.id) {
                // Try to find the DOM element by blockId which is more reliable
                const blockElement = editorContainerRef.current.querySelector(
                  `[data-id="${lastBlock.id}"]`
                );
                if (blockElement) {
                  // Add a temporary highlight class
                  blockElement.classList.add("highlight-new-content");
                  // Remove it after animation completes
                  setTimeout(() => {
                    blockElement.classList.remove("highlight-new-content");
                  }, 2000);
                }
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

  // Handle incoming command messages for voice commands
  const handleVoiceCommand = useCallback(
    (command) => {
      try {
        if (!command || !command.type) {
          console.error("Invalid command received:", command);
          return { success: false, error: "Invalid command" };
        }

        console.log("BlockNoteEditor: Handling voice command:", command.type);

        switch (command.type) {
          case "FORMATTING":
            // Apply formatting to selected text
            if (
              command.formatType &&
              TranscriptionHandler.FORMAT_TYPES[
                command.formatType.toUpperCase()
              ]
            ) {
              return TranscriptionHandler.applyFormatting(
                editor,
                TranscriptionHandler.FORMAT_TYPES[
                  command.formatType.toUpperCase()
                ]
              );
            }
            return false;

          case "SELECTION":
            // Handle text selection
            if (
              command.blockId &&
              command.startOffset !== undefined &&
              command.endOffset !== undefined
            ) {
              return TranscriptionHandler.selectText(
                editor,
                command.blockId,
                command.startOffset,
                command.endOffset
              );
            }
            return false;

          case "REPLACE_TEXT":
            // Handle text replacement
            if (command.findText && command.replaceWith !== undefined) {
              return TranscriptionHandler.replaceText(
                editor,
                command.findText,
                command.replaceWith,
                command.targetBlockIds
              );
            }
            return false;

          case "BLOCK_MODIFICATION":
            // Handle block type changes
            if (
              command.modificationType === "CHANGE_TYPE" &&
              command.blockId &&
              command.newType
            ) {
              return TranscriptionHandler.changeBlockType(
                editor,
                command.blockId,
                command.newType,
                command.props || {}
              );
            }
            return false;

          case "UNDO":
            // Handle undo operation
            return TranscriptionHandler.undo(editor, command.steps || 1);

          case "REDO":
            // Handle redo operation
            return TranscriptionHandler.redo(editor, command.steps || 1);

          default:
            console.warn(`Unknown command type: ${command.type}`);
            return false;
        }
      } catch (error) {
        console.error("Error handling voice command:", error);
        return false;
      }
    },
    [editor]
  );

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

        // Function to get the currently selected/focused block ID
        getCurrentBlockId: () => {
          if (editor) {
            try {
              console.log("Getting current block ID from editor");

              // Use the TranscriptionHandler's getCurrentBlock function
              const currentBlock = TranscriptionHandler.getCurrentBlock(editor);
              if (currentBlock && currentBlock.id) {
                console.log(`Found current block with ID: ${currentBlock.id}`);
                return currentBlock.id;
              }

              // If TranscriptionHandler method fails, fall back to previous implementation
              // Try to get the current selection
              const selection = editor.getSelection();

              if (selection && selection.anchor && selection.anchor.blockId) {
                console.log(
                  `Current selection in block: ${selection.anchor.blockId}`
                );
                return selection.anchor.blockId;
              }

              // If no selection, try to get the focused block from TipTap editor state
              if (editor._tiptapEditor && editor._tiptapEditor.state) {
                const { state } = editor._tiptapEditor;

                // Check if there's a selection
                if (state.selection) {
                  // Get the block node at the current selection
                  const $anchor = state.selection.$anchor;
                  if ($anchor) {
                    // Try to find the closest block node
                    let depth = $anchor.depth;
                    while (depth > 0) {
                      const node = $anchor.node(depth);
                      if (node && node.attrs && node.attrs.id) {
                        console.log(
                          `Found block at depth ${depth} with ID: ${node.attrs.id}`
                        );
                        return node.attrs.id;
                      }
                      depth--;
                    }

                    // If we get here, try the direct node
                    const node = $anchor.node();
                    if (node && node.attrs && node.attrs.id) {
                      console.log(`Direct node has ID: ${node.attrs.id}`);
                      return node.attrs.id;
                    }
                  }
                }

                // Try to get the document's last node as fallback
                const lastNode = state.doc.lastChild;
                if (lastNode && lastNode.attrs && lastNode.attrs.id) {
                  console.log(
                    `Using last node ID as fallback: ${lastNode.attrs.id}`
                  );
                  return lastNode.attrs.id;
                }
              }

              // If all else fails, try to get the last block from BlockNote API
              const blocks = editor.topLevelBlocks;
              if (blocks && blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                console.log(
                  `Using last block ID from API as fallback: ${lastBlock.id}`
                );
                return lastBlock.id;
              }

              console.warn("Could not determine current block ID");
            } catch (error) {
              console.error("Error getting current block ID:", error);
            }
          }
          return null;
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

        // Function to insert transcribed text - DEPRECATED
        // Use direct AsyncStorage approach in note/[id].jsx via insertTranscriptionDirectly() instead
        insertTranscribedText: (text) => {
          console.warn(
            "BlockNoteEditor.insertTranscribedText is deprecated. Use direct AsyncStorage approach instead via insertTranscriptionDirectly."
          );
          return false;
        },

        // Provide direct access to the editor
        getEditor: () => {
          return editor;
        },

        // Remove page links by ID
        removePageLinksById: (pageId) => {
          if (!editor || !pageId) {
            return false;
          }

          try {
            // Get all blocks from the document
            const blocks = editor.document || [];
            const pageLinkBlocks = [];

            // Find all page link blocks for the given pageId
            const findPageLinks = (block) => {
              if (block.type === "pageLink" && block.props?.pageId === pageId) {
                pageLinkBlocks.push(block.id);
              }

              if (block.children && Array.isArray(block.children)) {
                block.children.forEach(findPageLinks);
              }
            };

            // Search for links
            blocks.forEach(findPageLinks);

            // If we found any links, delete them
            if (pageLinkBlocks.length > 0) {
              console.log(
                `Removing ${pageLinkBlocks.length} links to page ${pageId}`
              );
              pageLinkBlocks.forEach((blockId) => {
                editor.removeBlocks([blockId]);
              });
              return true;
            } else {
              return false;
            }
          } catch (error) {
            console.error("Error removing page links:", error);
            return false;
          }
        },

        focusEditor: () => {
          console.log("BlockNoteEditor: Attempting to focus editor");
          if (editor) {
            try {
              // Focus the editor
              editor.focus();

              // Scroll to bottom for newly added content
              try {
                const editorElement =
                  editorContainerRef.current?.querySelector(
                    ".blocknote-editor"
                  );
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

        // New methods for voice commands

        // Execute a command for voice interaction
        executeVoiceCommand: (command) => {
          return handleVoiceCommand(command);
        },

        // Find text in the editor content
        findText: (searchText) => {
          if (!editor || !searchText) {
            return [];
          }
          return TranscriptionHandler.findTextInBlocks(editor, searchText);
        },

        // Apply formatting to selected text
        applyFormatting: (formatType) => {
          if (!editor || !formatType) {
            return false;
          }
          return TranscriptionHandler.applyFormatting(editor, formatType);
        },

        // Perform undo operation
        undo: (steps = 1) => {
          if (!editor) {
            return false;
          }
          return TranscriptionHandler.undo(editor, steps);
        },

        // Perform redo operation
        redo: (steps = 1) => {
          if (!editor) {
            return false;
          }
          return TranscriptionHandler.redo(editor, steps);
        },
      };
    },
    [
      editor,
      nestedPages,
      onDeletePage,
      onCreateNestedPage,
      onNavigateToPage,
      handleVoiceCommand,
    ]
  );

  // Renders the editor instance using a React component
  return (
    <div
      ref={editorContainerRef}
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
      className={`editor-scroll-container theme-${
        typeof theme === "string" ? theme : "light"
      }`}
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
        htmlAttributes={{
          editor: {
            class: `blocknote-editor custom-editor theme-${
              typeof theme === "string" ? theme : "light"
            }`,
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
        theme={typeof theme === "string" ? theme : "light"}
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
