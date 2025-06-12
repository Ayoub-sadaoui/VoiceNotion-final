"use dom";

import React from "react";
import KeyboardToolbar from "../KeyboardToolbar";

/**
 * A wrapper component for the keyboard toolbar that renders it when the keyboard is visible
 */
const KeyboardToolbarWrapper = ({
  editor,
  onCreatePageLink,
  keyboardHeight,
  isKeyboardVisible,
  theme = "light",
}) => {
  if (!isKeyboardVisible) return null;

  const themeString = typeof theme === "string" ? theme : "light";
  const isDark = themeString === "dark";

  // Define theme colors based on theme name
  const themeColors = isDark
    ? {
        primary: "#0A84FF", // iOS blue dark
        secondaryText: "#CCCCCC",
        toolbar: {
          background: "#1A1A1A",
          border: "#333333",
        },
      }
    : {
        primary: "#007AFF", // iOS blue
        secondaryText: "#666666",
        toolbar: {
          background: "#FAFAFA",
          border: "#EEEEEE",
        },
      };

  return (
    <div
      style={{
        position: "fixed",
        bottom: keyboardHeight + 50,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
      className={`theme-${themeString}`}
    >
      <KeyboardToolbar
        editor={editor}
        onCreatePageLink={onCreatePageLink}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
        themeColors={themeColors}
        isDark={isDark}
      />
    </div>
  );
};

export default KeyboardToolbarWrapper;
