"use dom";

import "@blocknote/core/fonts/inter.css";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  TextAlignButton,
  useCreateBlockNote,
  createReactBlockSpec,
} from "@blocknote/react";
import "./editor.css";
import "./toolbar.css";
import "./keyboard-toolbar.css";
import {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
  useCallback,
} from "react";
import { selectionDisablerScript } from "./selectionDisabler";
import KeyboardToolbar from "./KeyboardToolbar";
import {
  BlockNoteEditor,
  defaultBlockSchema,
  defaultProps,
  BlockNoteSchema,
  defaultBlockSpecs,
} from "@blocknote/core";

// Create a custom block for page links using the createReactBlockSpec API
const PageLinkBlock = createReactBlockSpec(
  {
    type: "pageLink",
    propSchema: {
      pageId: { default: "" },
      pageTitle: { default: "Untitled Page" },
      pageIcon: { default: "📄" },
    },
    content: "none", // This block doesn't allow content inside it
  },
  {
    render: (props) => {
      const { block, editor } = props;
      console.log("Rendering PageLinkBlock:", block);

      const handleClick = () => {
        // Get the onNavigateToPage from the block's meta
        const onNavigateToPage =
          editor._tiptapEditor.storage.pageLink?.onNavigateToPage;

        // Call the navigation callback
        if (onNavigateToPage && block.props.pageId) {
          console.log("Navigating to page:", block.props.pageId);
          onNavigateToPage(block.props.pageId);
        } else {
          console.warn(
            "Cannot navigate: missing pageId or navigation callback"
          );
        }
      };

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "6px 12px",
            margin: "4px 0",
            borderRadius: "8px",
            background: "rgba(0, 120, 212, 0.1)",
            cursor: "pointer",
            border: "1px solid rgba(0, 120, 212, 0.3)",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            width: "100%",
          }}
          onClick={handleClick}
          onMouseOver={(e) => {
            e.currentTarget.style.background = "rgba(0, 120, 212, 0.15)";
            e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.15)";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = "rgba(0, 120, 212, 0.1)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
          }}
        >
          <div style={{ marginRight: "12px", fontSize: "18px" }}>
            {block.props.pageIcon || "📄"}
          </div>
          <div
            style={{
              flex: 1,
              fontSize: "16px",
              fontWeight: "500",
              color: "rgba(0, 120, 212, 1)",
            }}
          >
            {block.props.pageTitle || "Untitled Page"}
          </div>
          <div
            style={{
              fontSize: "14px",
              opacity: 0.6,
              marginLeft: "8px",
              background: "rgba(0, 120, 212, 0.1)",
              padding: "3px 8px",
              borderRadius: "4px",
            }}
          >
            Open Page ↗
          </div>
        </div>
      );
    },
  }
);

// Create custom schema with our custom blocks
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLinkBlock,
  },
});

// Main editor component
const HelloWorld = forwardRef((props, ref) => {
  const {
    initialContent,
    theme = "light",
    onChange,
    onNavigateToPage,
    onCreateNestedPage, // Function to create a new page
    onDeletePage, // Function to delete a page
    keyboardHeight = 0,
    isKeyboardVisible = false,
    currentPageId, // Current page ID for page operations
    nestedPages = [], // Array of nested pages for the current page
  } = props;

  // Use a ref to track whether component is mounted
  const isMountedRef = useRef(false);
  const editorInstance = useRef(null);
  const [contentInitialized, setContentInitialized] = useState(false);

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
            text: "Welcome to VoiceNotion",
            styles: {},
          },
        ],
        children: [],
      },
    ],
    // Enable debug logging for BlockNote
    enableDebugLogging: true,
    // Use our custom schema with the page link block
    schema: schema,
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

  // State for dialog to create a new page
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

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

  // Expose methods to the native side
  useImperativeHandle(ref, () => ({
    // Method to get editor content as JSON
    getContent: () => {
      return editor.topLevelBlocks;
    },

    // Method to insert a page link block
    insertPageLink: (pageId, pageTitle, pageIcon) => {
      console.log("insertPageLink called with:", pageId, pageTitle, pageIcon);
      insertPageLinkBlock(pageId, pageTitle, pageIcon);
    },

    // Method to delete the current page
    deleteCurrentPage: () => {
      if (currentPageId && onDeletePage) {
        setPageToDelete(currentPageId);
        setShowDeleteConfirm(true);
      }
    },

    // Method to remove a page link block when page is deleted from elsewhere
    removePageLink: (pageId) => {
      if (editor && pageId) {
        console.log("Removing page link for deleted page:", pageId);

        // Find all page link blocks with this pageId
        const blocksToRemove = [];
        editor.topLevelBlocks.forEach((block) => {
          if (block.type === "pageLink" && block.props.pageId === pageId) {
            blocksToRemove.push(block);
          }
        });

        // Remove the blocks if any were found
        if (blocksToRemove.length > 0) {
          editor.removeBlocks(blocksToRemove);
          console.log("Removed page link blocks:", blocksToRemove.length);

          // Ensure changes are saved immediately
          if (onChange) {
            onChange(editor.topLevelBlocks);
          }
        }
      }
    },

    // Method to remove multiple page link blocks at once
    removePageLinks: (pageIds) => {
      if (editor && pageIds && pageIds.length > 0) {
        console.log("Removing multiple page links:", pageIds.length);

        // Find all page link blocks with matching pageIds
        const blocksToRemove = [];
        editor.topLevelBlocks.forEach((block) => {
          if (
            block.type === "pageLink" &&
            pageIds.includes(block.props.pageId)
          ) {
            blocksToRemove.push(block);
          }
        });

        // Remove the blocks if any were found
        if (blocksToRemove.length > 0) {
          editor.removeBlocks(blocksToRemove);
          console.log("Removed page link blocks:", blocksToRemove.length);

          // Ensure changes are saved immediately
          if (onChange) {
            onChange(editor.topLevelBlocks);
          }
        }
      }
    },
  }));

  // Function to insert page link block
  const insertPageLinkBlock = (pageId, pageTitle, pageIcon) => {
    if (!editor) return;

    try {
      console.log("Inserting page link with ID:", pageId, "Title:", pageTitle);

      // Create the page link block structure
      const newPageLinkBlock = {
        type: "pageLink",
        props: {
          pageId: pageId || "",
          pageTitle: pageTitle || "Untitled Page",
          pageIcon: pageIcon || "📄",
        },
      };

      // Get the current selection or use the end of the document
      const blocks = editor.topLevelBlocks;
      const lastBlock = blocks.length > 0 ? blocks[blocks.length - 1] : null;

      if (lastBlock) {
        // Insert after the last block in the document
        editor.insertBlocks([newPageLinkBlock], lastBlock, "after");
      } else {
        // If there are no blocks, just insert our link
        editor.insertBlocks([newPageLinkBlock], null, "firstChild");
      }

      // Try to focus editor after insertion
      setTimeout(() => {
        try {
          if (typeof editor.focus === "function") {
            editor.focus();
          }
        } catch (focusError) {
          console.error("Error focusing editor:", focusError);
        }
      }, 100);

      console.log("Page link inserted for page:", pageId);

      // Ensure changes are saved immediately
      if (onChange) {
        onChange(editor.topLevelBlocks);
      }
    } catch (error) {
      console.error("Error inserting page link:", error);
      // Don't rethrow - just log the error
    }
  };

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
            insertPageLinkBlock(newPage.id, newPage.title, newPage.icon);
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

  // Render keyboard toolbar when keyboard is visible
  const renderKeyboardToolbar = () => {
    if (isKeyboardVisible) {
      return (
        <div
          style={{
            position: "fixed",
            bottom: keyboardHeight + 50,
            left: 0,
            right: 0,
            zIndex: 1000,
          }}
        >
          <KeyboardToolbar
            editor={editor}
            onCreatePageLink={handleCreatePageLink}
            keyboardHeight={keyboardHeight}
            isKeyboardVisible={isKeyboardVisible}
          />
        </div>
      );
    }
    return null;
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

  // Effect to adjust editor container when keyboard appears
  useEffect(() => {
    if (!isMountedRef.current) return;

    console.log("Keyboard visible:", isKeyboardVisible);
  }, [keyboardHeight, isKeyboardVisible]);

  // Render delete confirmation dialog
  const renderDeleteConfirmDialog = () => {
    if (!showDeleteConfirm) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 2000,
        }}
      >
        <div
          style={{
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "8px",
            maxWidth: "300px",
            width: "80%",
          }}
        >
          <h3 style={{ margin: "0 0 15px 0" }}>Delete Page</h3>
          <p style={{ margin: "0 0 20px 0" }}>
            Are you sure you want to delete this page? This action cannot be
            undone.
          </p>
          <div
            style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
          >
            <button
              onClick={() => setShowDeleteConfirm(false)}
              style={{
                padding: "8px 16px",
                border: "1px solid #ddd",
                borderRadius: "4px",
                background: "#f5f5f5",
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteCurrentPage}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                background: "#ff4d4f",
                color: "white",
                cursor: "pointer",
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    );
  };

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
        <FormattingToolbarController
          formattingToolbar={() => (
            <div
              style={{
                width: "96%",
                maxWidth: "100vw",
                overflow: "hidden",
              }}
            >
              <FormattingToolbar className="custom-formatting-toolbar bn-formatting-toolbar">
                <BlockTypeSelect key="blockTypeSelect" />

                <BasicTextStyleButton
                  basicTextStyle="bold"
                  key="boldStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="italic"
                  key="italicStyleButton"
                />
                <BasicTextStyleButton
                  basicTextStyle="underline"
                  key="underlineStyleButton"
                />

                <TextAlignButton
                  textAlignment={"left"}
                  key={"textAlignLeftButton"}
                />
                <TextAlignButton
                  textAlignment={"center"}
                  key={"textAlignCenterButton"}
                />
                <TextAlignButton
                  textAlignment={"right"}
                  key={"textAlignRightButton"}
                />
                <ColorStyleButton key="colorStyleButton" />

                <div
                  style={{
                    width: 1,
                    backgroundColor: "#ddd",
                    height: 24,
                    margin: "0 10px",
                    flexShrink: 0,
                  }}
                />

                <CreateLinkButton key="createLinkButton" />
              </FormattingToolbar>
            </div>
          )}
        />
      </BlockNoteView>

      {renderKeyboardToolbar()}
      {renderDeleteConfirmDialog()}
    </div>
  );
});

export default HelloWorld;
