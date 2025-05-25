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
} from "@blocknote/react";
import "./editor.css";
import "./toolbar.css";
import "./keyboard-toolbar.css";
import { useEffect, useRef, useState } from "react";
import { selectionDisablerScript } from "./selectionDisabler";
import KeyboardToolbar from "./KeyboardToolbar";

export default function HelloWorld({
  title = "Untitled Note",
  icon = "document-text",
  keyboardHeight = 0,
  isKeyboardVisible = false,
}) {
  // Use a ref to track whether component is mounted
  const isMounted = useRef(false);
  const editorContainerRef = useRef(null);
  const [initialized, setInitialized] = useState(false);
  // Track editor after it's fully initialized
  const [editorInstance, setEditorInstance] = useState(null);

  // Log that we're creating a new editor instance (for debugging)
  console.log("Creating BlockNote editor instance");

  // Creates a new editor instance with custom settings
  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        level: 1,
        content: title,
      },
      {
        type: "paragraph",
        content: "Start typing your note here...",
      },
    ],
    domAttributes: {
      editor: {
        class: "blocknote-editor",
        style: "height: 100%; width: 100%; overflow-y: auto; padding: 16px;",
      },
    },
    // Enable debug logging for BlockNote
    enableDebugLogging: true,
  });

  // Log that we have an editor instance
  console.log(
    "Editor created:",
    !!editor,
    "with document:",
    editor?.document?.length || 0
  );

  // Update the title when it changes
  useEffect(() => {
    if (editor && initialized) {
      try {
        // Get the blocks - use editor.document, not getBlocks
        const blocks = editor.document;
        console.log("Document blocks:", blocks.length);

        // Check if first block is a heading
        if (blocks.length > 0 && blocks[0].type === "heading") {
          // Update the heading content with the new title
          editor.updateBlock(blocks[0], {
            content: title,
          });
          console.log("Updated title block");
        } else {
          // If no heading exists, insert one at the beginning
          editor.insertBlocks(
            [
              {
                type: "heading",
                level: 1,
                content: title,
              },
            ],
            blocks.length > 0 ? blocks[0].id : null,
            "before"
          );
          console.log("Inserted new title block");
        }

        // Store the fully initialized editor
        setEditorInstance(editor);
        console.log("Editor instance stored");

        // Log available editor methods for debugging
        console.log(
          "Editor methods:",
          Object.getOwnPropertyNames(editor).filter(
            (prop) => typeof editor[prop] === "function"
          )
        );
      } catch (error) {
        console.error("Error updating title:", error);
      }
    }
  }, [title, editor, initialized]);

  // Enable browser-based editing with proper mount check
  useEffect(() => {
    isMounted.current = true;
    console.log("Editor mounting, will focus soon");

    // Only focus if component is mounted
    if (isMounted.current && editor) {
      const timeoutId = setTimeout(() => {
        if (isMounted.current) {
          try {
            editor.focus();
            setInitialized(true);
            setEditorInstance(editor);
            console.log("Editor focused and initialized");
          } catch (error) {
            console.log("Focus error:", error);
          }
        }
      }, 500); // Give more time for initialization

      return () => {
        clearTimeout(timeoutId);
        isMounted.current = false;
      };
    }
  }, [editor]);

  // Disable context menu and selection UI
  useEffect(() => {
    if (!editorContainerRef.current) return;

    // Disable context menu
    const disableContextMenu = (e) => {
      e.preventDefault();
      return false;
    };

    // Add event listeners to disable context menu
    const container = editorContainerRef.current;
    container.addEventListener("contextmenu", disableContextMenu);

    // Inject the selection disabler script
    const script = document.createElement("script");
    script.textContent = selectionDisablerScript;
    document.head.appendChild(script);

    // Also try to find and manipulate all contentEditable elements
    const findAndSetupContentEditables = () => {
      const editables = document.querySelectorAll('[contenteditable="true"]');
      editables.forEach((el) => {
        el.addEventListener("contextmenu", disableContextMenu);
        el.style.webkitTouchCallout = "none";

        // Prevent selection UI but still allow selection
        el.addEventListener("touchstart", () => {
          el.style.webkitTouchCallout = "none";
        });
      });
    };

    // Run once and then periodically to catch dynamically added elements
    findAndSetupContentEditables();
    const interval = setInterval(findAndSetupContentEditables, 1000);

    return () => {
      container.removeEventListener("contextmenu", disableContextMenu);
      clearInterval(interval);
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  // Insert custom icon styles into the document
  useEffect(() => {
    if (!document) return;

    // Create a style element for the icon
    const iconStyle = document.createElement("style");
    iconStyle.textContent = `
      .editor-icon {
        position: absolute;
        top: 10px;
        right: 20px;
        font-size: 24px;
        opacity: 0.5;
        color: #007AFF;
      }
      
      /* Hide icons from printing */
      @media print {
        .editor-icon {
          display: none;
        }
      }
    `;
    document.head.appendChild(iconStyle);

    return () => {
      if (iconStyle.parentNode) {
        iconStyle.parentNode.removeChild(iconStyle);
      }
    };
  }, []);

  // Log whenever editorInstance changes
  useEffect(() => {
    if (editorInstance) {
      console.log(
        "Editor instance updated:",
        !!editorInstance,
        "with document:",
        editorInstance.document?.length || 0,
        "and can get text cursor:",
        typeof editorInstance.getTextCursorPosition === "function"
      );
    }
  }, [editorInstance]);

  // Log when keyboard height changes
  useEffect(() => {
    console.log("Keyboard height in web component:", keyboardHeight);
    console.log("Keyboard visible:", isKeyboardVisible);
  }, [keyboardHeight, isKeyboardVisible]);

  // Renders the editor instance using a React component
  return (
    <div
      ref={editorContainerRef}
      style={{
        height: `calc(100vh - 120px - ${keyboardHeight}px)`, // Adjust for keyboard height
        marginTop: "10px",
        padding: "10px",
        WebkitUserSelect: "none",
        WebkitTouchCallout: "none",

        width: "100%",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Display the icon in the top right corner */}
      <div
        className="editor-icon"
        style={{
          position: "absolute",
          top: "10px",
          right: "20px",
          opacity: 0.5,
        }}
      >
        <i className={`ion-${icon}`} style={{ fontSize: "24px" }}></i>
      </div>

      <BlockNoteView
        editor={editor}
        editable={true}
        formattingToolbar={false} // Disable default toolbar
        sideMenu={false}
        slashMenu={true}
      >
        <FormattingToolbarController
          formattingToolbar={() => (
            <FormattingToolbar>
              <BlockTypeSelect key={"blockTypeSelect"} />

              <BasicTextStyleButton
                basicTextStyle={"bold"}
                key={"boldStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"italic"}
                key={"italicStyleButton"}
              />
              <BasicTextStyleButton
                basicTextStyle={"underline"}
                key={"underlineStyleButton"}
              />

              <ColorStyleButton key={"colorStyleButton"} />

              <CreateLinkButton key={"createLinkButton"} />
            </FormattingToolbar>
          )}
        />
      </BlockNoteView>

      {/* Add the keyboard-aware toolbar - pass the tracked instance and keyboard info */}
      {editor && (
        <KeyboardToolbar
          editor={editor}
          keyboardHeight={keyboardHeight}
          isKeyboardVisible={isKeyboardVisible}
        />
      )}
    </div>
  );
}
