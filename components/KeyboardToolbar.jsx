import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet, Text } from "react-native";
import ToolbarIcon from "./ToolbarIcon";

// Simple custom toolbar buttons with theme-aware colors
const ToolbarButton = ({
  iconType,
  onPress,
  isActive,
  tooltip,
  themeColors,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.toolbarButton,
        isActive && [
          styles.activeButton,
          { backgroundColor: `${themeColors.primary}20` }, // 20 is hex for 12% opacity
        ],
      ]}
      onPress={onPress}
      accessibilityLabel={tooltip}
      accessibilityRole="button"
    >
      <ToolbarIcon
        type={iconType}
        fill={isActive ? themeColors.primary : themeColors.secondaryText}
      />
    </TouchableOpacity>
  );
};

const KeyboardToolbar = ({
  editor,
  keyboardHeight = 0,
  isKeyboardVisible = false,
  onCreatePageLink, // Function to create new linked page
  onDeletePage, // Function to delete current page
  themeColors = {
    primary: "#007AFF",
    secondaryText: "#666666",
    toolbar: {
      background: "#fbfbfb",
      border: "#eeeeee",
    },
  },
  isDark = false,
}) => {
  // State for tracking button visibility
  const [showPageOptions, setShowPageOptions] = useState(false);

  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false,
    link: false,
    heading1: false,
    heading2: false,
    heading3: false,
    bulletList: false,
    numberedList: false,
    quote: false,
    code: false,
  });

  // Helper function to safely focus the editor
  const focusEditor = () => {
    try {
      if (!editor) return false;

      // Use BlockNote's built-in focus method if available
      if (typeof editor.focus === "function") {
        editor.focus();
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error focusing editor:", error);
      return false;
    }
  };

  // Function to safely apply formatting
  const applyFormat = (format) => {
    try {
      // Focus editor first
      focusEditor();

      if (!editor) {
        console.log("Editor instance is not available");
        return;
      }

      // Try to get cursor position - if it fails, don't proceed with text formatting
      let cursorPosition;
      try {
        cursorPosition = editor.getTextCursorPosition();
        if (!cursorPosition) {
          console.log("No cursor position found");
        }
      } catch (error) {
        console.error("Error getting cursor position:", error);
      }

      // Handle different formatting actions
      switch (format) {
        case "bold":
          editor.addMark("bold");
          break;
        case "italic":
          editor.addMark("italic");
          break;
        case "underline":
          editor.addMark("underline");
          break;
        case "link":
          // Try to create a link if possible
          if (typeof editor.createLink === "function") {
            editor.createLink("");
          }
          break;
        case "heading1":
          editor.updateBlock(cursorPosition.block, {
            type: "heading",
            props: { level: 1 },
          });
          break;
        case "heading2":
          editor.updateBlock(cursorPosition.block, {
            type: "heading",
            props: { level: 2 },
          });
          break;
        case "heading3":
          editor.updateBlock(cursorPosition.block, {
            type: "heading",
            props: { level: 3 },
          });
          break;
        case "bulletList":
          editor.updateBlock(cursorPosition.block, {
            type: "bulletListItem",
          });
          break;
        case "numberedList":
          editor.updateBlock(cursorPosition.block, {
            type: "numberedListItem",
          });
          break;
        case "quote":
          editor.updateBlock(cursorPosition.block, {
            type: "quote",
          });
          break;
        case "code":
          editor.updateBlock(cursorPosition.block, {
            type: "code",
          });
          break;
        case "createPage":
          if (onCreatePageLink && typeof onCreatePageLink === "function") {
            onCreatePageLink();
          }
          break;
        case "deletePage":
          if (onDeletePage && typeof onDeletePage === "function") {
            onDeletePage();
          }
          break;
        default:
          console.log(`Unknown format: ${format}`);
          break;
      }

      // Set focus back to editor after a short delay
      setTimeout(() => {
        try {
          focusEditor();
        } catch (error) {
          console.error("Error focusing editor after format:", error);
        }
      }, 10);
    } catch (error) {
      console.error("Error applying format:", error);
    }
  };

  // Check current marks and block type for highlighting active state
  const checkActiveFormats = () => {
    if (!editor) return;

    try {
      // Get current selection info from BlockNote if available
      const cursorPosition = editor.getTextCursorPosition();
      if (!cursorPosition) return;

      // Check text formatting (marks)
      const marks = cursorPosition.marks || {};

      // Update text formatting status
      setActiveFormats((prev) => ({
        ...prev,
        bold: !!marks.bold,
        italic: !!marks.italic,
        underline: !!marks.underline,
        link: !!marks.link,
      }));

      // Check block type
      if (cursorPosition.block) {
        const block = cursorPosition.block;
        const blockType = block.type;
        const blockLevel = block.props?.level;

        // Reset all block types first
        const newActiveFormats = {
          ...activeFormats,
          heading1: false,
          heading2: false,
          heading3: false,
          bulletList: false,
          numberedList: false,
          quote: false,
          code: false,
        };

        // Set the active block type
        if (blockType === "heading") {
          if (blockLevel === 1) newActiveFormats.heading1 = true;
          if (blockLevel === 2) newActiveFormats.heading2 = true;
          if (blockLevel === 3) newActiveFormats.heading3 = true;
        } else if (blockType === "bulletListItem") {
          newActiveFormats.bulletList = true;
        } else if (blockType === "numberedListItem") {
          newActiveFormats.numberedList = true;
        } else if (blockType === "quote") {
          newActiveFormats.quote = true;
        } else if (blockType === "code") {
          newActiveFormats.code = true;
        }

        setActiveFormats((prev) => ({
          ...prev,
          ...newActiveFormats,
        }));
      }
    } catch (error) {
      console.error("Error checking active formats:", error);
    }
  };

  // Check active formatting periodically
  useEffect(() => {
    if (!editor) return;

    // Setup interval to check formatting
    const interval = setInterval(checkActiveFormats, 500);

    return () => {
      clearInterval(interval);
    };
  }, [editor]);

  // Log keyboard height changes
  useEffect(() => {
    console.log("KeyboardToolbar receiving keyboard height:", keyboardHeight);
  }, [keyboardHeight, isKeyboardVisible]);

  // Always show the toolbar when editor is available
  const shouldShowToolbar = !!editor;

  if (!shouldShowToolbar) return null;

  // Calculate toolbar position based on keyboard
  const toolbarBottomPosition = isKeyboardVisible ? keyboardHeight + 10 : 20;

  return (
    <View
      style={[
        styles.toolbarContainer,
        { bottom: 0, backgroundColor: themeColors.toolbar.background },
      ]}
    >
      <View
        style={[
          styles.keyboardToolbar,
          {
            backgroundColor: "transparent",
            borderTopColor: themeColors.toolbar.border,
            borderTopWidth: 1,
          },
        ]}
      >
        {/* Block formatting buttons */}
        <View
          style={[
            styles.toolbarGroup,
            { borderRightColor: themeColors.toolbar.border },
          ]}
        >
          <ToolbarButton
            iconType="heading1"
            onPress={() => applyFormat("heading1")}
            isActive={activeFormats.heading1}
            tooltip="Heading 1"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="heading2"
            onPress={() => applyFormat("heading2")}
            isActive={activeFormats.heading2}
            tooltip="Heading 2"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="heading3"
            onPress={() => applyFormat("heading3")}
            isActive={activeFormats.heading3}
            tooltip="Heading 3"
            themeColors={themeColors}
          />
        </View>

        {/* List buttons */}
        <View
          style={[
            styles.toolbarGroup,
            { borderRightColor: themeColors.toolbar.border },
          ]}
        >
          <ToolbarButton
            iconType="bulletList"
            onPress={() => applyFormat("bulletList")}
            isActive={activeFormats.bulletList}
            tooltip="Bullet List"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="numberedList"
            onPress={() => applyFormat("numberedList")}
            isActive={activeFormats.numberedList}
            tooltip="Numbered List"
            themeColors={themeColors}
          />
        </View>

        {/* Special blocks */}
        <View
          style={[
            styles.toolbarGroup,
            { borderRightColor: themeColors.toolbar.border },
          ]}
        >
          <ToolbarButton
            iconType="quote"
            onPress={() => applyFormat("quote")}
            isActive={activeFormats.quote}
            tooltip="Quote Block"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="code"
            onPress={() => applyFormat("code")}
            isActive={activeFormats.code}
            tooltip="Code Block"
            themeColors={themeColors}
          />
        </View>

        {/* Text formatting buttons */}
        <View
          style={[
            styles.toolbarGroup,
            { borderRightColor: themeColors.toolbar.border },
          ]}
        >
          <ToolbarButton
            iconType="bold"
            onPress={() => applyFormat("bold")}
            isActive={activeFormats.bold}
            tooltip="Bold"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="italic"
            onPress={() => applyFormat("italic")}
            isActive={activeFormats.italic}
            tooltip="Italic"
            themeColors={themeColors}
          />
          <ToolbarButton
            iconType="underline"
            onPress={() => applyFormat("underline")}
            isActive={activeFormats.underline}
            tooltip="Underline"
            themeColors={themeColors}
          />
        </View>

        {/* Page operations */}
        {(onCreatePageLink || onDeletePage) && (
          <View style={[styles.toolbarGroup, { borderRightWidth: 0 }]}>
            {onCreatePageLink && (
              <ToolbarButton
                iconType="addPage"
                onPress={() => applyFormat("createPage")}
                isActive={false}
                tooltip="Create Nested Page"
                themeColors={themeColors}
              />
            )}
            {onDeletePage && (
              <ToolbarButton
                iconType="deletePage"
                onPress={() => applyFormat("deletePage")}
                isActive={false}
                tooltip="Delete Current Page"
                themeColors={themeColors}
              />
            )}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  toolbarContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    overflowX: "scroll",
    justifyContent: "center",
    alignItems: "flex-start",
    zIndex: 1000,
  },
  keyboardToolbar: {
    flexDirection: "row",
    paddingHorizontal: 8,
    paddingVertical: 2,
    width: "100%",
  },
  toolbarGroup: {
    flexDirection: "row",
    marginHorizontal: 2,
    overflowX: "scroll",
    paddingRight: 10,
    position: "relative",
  },
  toolbarButton: {
    padding: 8,
    margin: 2,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 40,
    minHeight: 40,
  },
  activeButton: {
    backgroundColor: "rgba(0, 122, 255, 0.15)",
  },
});

export default KeyboardToolbar;
