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
} from "@blocknote/react";

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
            overflow: "visible",
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
