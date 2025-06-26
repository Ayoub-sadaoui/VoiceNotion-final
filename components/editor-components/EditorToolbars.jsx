"use dom";

import React from "react";
import {
  BasicTextStyleButton,
  BlockTypeSelect,
  ColorStyleButton,
  CreateLinkButton,
  FormattingToolbar,
  FormattingToolbarController,
  TextAlignButton,
  useBlockNoteEditor,
} from "@blocknote/react";

/**
 * Custom Undo Button component
 */
const UndoButton = () => {
  const editor = useBlockNoteEditor();

  const handleUndo = () => {
    if (editor && editor.canUndo()) {
      console.log("Executing undo from custom button");
      editor.undo();
    } else {
      console.log("Cannot undo - no more history");
    }
  };

  return (
    <button
      className="bn-button"
      onClick={handleUndo}
      title="Undo"
      style={{
        padding: "8px",
        cursor: "pointer",
        borderRadius: "4px",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M8 3a5 5 0 1 1-4.546 2.914.5.5 0 0 0-.908-.417A6 6 0 1 0 8 2v1z" />
        <path d="M8 4.466V.534a.25.25 0 0 0-.41-.192L5.23 2.308a.25.25 0 0 0 0 .384l2.36 1.966A.25.25 0 0 0 8 4.466z" />
      </svg>
    </button>
  );
};

/**
 * Custom Redo Button component
 */
const RedoButton = () => {
  const editor = useBlockNoteEditor();

  const handleRedo = () => {
    if (editor && editor.canRedo()) {
      console.log("Executing redo from custom button");
      editor.redo();
    } else {
      console.log("Cannot redo - at latest history point");
    }
  };

  return (
    <button
      className="bn-button"
      onClick={handleRedo}
      title="Redo"
      style={{
        padding: "8px",
        cursor: "pointer",
        borderRadius: "4px",
        border: "none",
        background: "transparent",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        fill="currentColor"
        viewBox="0 0 16 16"
      >
        <path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z" />
        <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z" />
      </svg>
    </button>
  );
};

/**
 * Component that renders the main formatting toolbar for the editor
 */
const EditorToolbars = () => {
  return (
    <FormattingToolbarController
      formattingToolbar={() => (
        <div
          style={{
            width: "96%",
            maxWidth: "100vw",
            position: "relative",
            zIndex: 100,
          }}
        >
          <FormattingToolbar className="custom-formatting-toolbar bn-formatting-toolbar">
            <BlockTypeSelect key="blockTypeSelect" />

            <BasicTextStyleButton basicTextStyle="bold" key="boldStyleButton" />
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
  );
};

export default EditorToolbars;
