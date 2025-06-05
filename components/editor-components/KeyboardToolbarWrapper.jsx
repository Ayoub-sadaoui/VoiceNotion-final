"use dom";

import React from "react";
import KeyboardToolbar from "../../components/KeyboardToolbar";

/**
 * A wrapper component for the keyboard toolbar that renders it when the keyboard is visible
 */
const KeyboardToolbarWrapper = ({
  editor,
  onCreatePageLink,
  keyboardHeight,
  isKeyboardVisible,
}) => {
  if (!isKeyboardVisible) return null;

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
        onCreatePageLink={onCreatePageLink}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
      />
    </div>
  );
};

export default KeyboardToolbarWrapper;
