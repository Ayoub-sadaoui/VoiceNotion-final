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
  NestBlockButton,
  TextAlignButton,
  UnnestBlockButton,
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
            padding: "12px",
            margin: "10px 0",
            borderRadius: "8px",
            background: "rgba(0, 120, 212, 0.1)",
            cursor: "pointer",
            border: "1px solid rgba(0, 120, 212, 0.3)",
            transition: "all 0.2s ease",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

// Create custom schema with our page link block
const schema = BlockNoteSchema.create({
  blockSpecs: {
    ...defaultBlockSpecs,
    pageLink: PageLinkBlock,
  },
});

// Custom toolbar with page link insertion
const CustomToolbar = ({ editor, onCreatePageLink }) => {
  return (
    <FormattingToolbar>
      <BlockTypeSelect editor={editor} />
      <div
        style={{
          width: 1,
          backgroundColor: "#ddd",
          height: 24,
          margin: "0 10px",
        }}
      />
      <BasicTextStyleButton editor={editor} />
      <ColorStyleButton editor={editor} />
      <TextAlignButton editor={editor} />
      <CreateLinkButton editor={editor} />
      <div
        style={{
          width: 1,
          backgroundColor: "#ddd",
          height: 24,
          margin: "0 10px",
        }}
      />
      <NestBlockButton editor={editor} />
      <UnnestBlockButton editor={editor} />
      <div
        style={{
          width: 1,
          backgroundColor: "#ddd",
          height: 24,
          margin: "0 10px",
        }}
      />
      <button
        className="bn-button"
        onClick={onCreatePageLink}
        title="Insert Page Link"
        style={{
          display: "flex",
          alignItems: "center",
          padding: "4px 8px",
          cursor: "pointer",
          backgroundColor: "transparent",
          border: "none",
          borderRadius: "4px",
          color: "#444",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f0f0f0")}
        onMouseOut={(e) =>
          (e.currentTarget.style.backgroundColor = "transparent")
        }
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="9" y1="15" x2="15" y2="15"></line>
        </svg>
        <span style={{ marginLeft: "5px" }}>Page</span>
      </button>
    </FormattingToolbar>
  );
};

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
  } = props;

  // Use a ref to track whether component is mounted
  const isMountedRef = useRef(false);
  const editorInstance = useRef(null);

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

  // State for dialog to create a new page
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

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
        setShowDeleteConfirm(true);
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
    if (onDeletePage && currentPageId) {
      onDeletePage(currentPageId);
    }
    setShowDeleteConfirm(false);
  };

  // Render keyboard toolbar when keyboard is visible
  const renderKeyboardToolbar = () => {
    if (isKeyboardVisible) {
      return (
        <div
          style={{
            position: "absolute",
            bottom: `${keyboardHeight}px`,
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
    <div style={{ height: "100%" }}>
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
        // Replace default toolbar with our custom one
        formattingToolbar={(props) => (
          <CustomToolbar {...props} onCreatePageLink={handleCreatePageLink} />
        )}
      />
      {renderKeyboardToolbar()}
      {renderDeleteConfirmDialog()}
    </div>
  );
});

export default HelloWorld;
