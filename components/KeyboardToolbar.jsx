import React, { useState, useEffect } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Path } from "react-native-svg";

// Icon components for the toolbar buttons
const BoldIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M8.612 7.018C9.523 6.674 10 6.056 10 5.23c0-1.6-1.209-2.23-3-2.23H4v10h3.837c1.81 0 3.163-.756 3.163-2.5 0-1.145-.53-1.908-1.388-2.211v-.071ZM5.5 4.5h1.232c.906 0 1.384.323 1.384.98 0 .658-.478.847-1.384.847H5.5V4.5Zm1.587 7H5.5V9.179h1.587c.972 0 1.469.304 1.469 1.158 0 .853-.497 1.163-1.469 1.163Z" />
  </Svg>
);

const ItalicIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M7.991 11.674L9.53 4.455c.123-.595.246-.71 1.347-.807l.11-.52H7.211l-.11.52c1.06.096 1.128.212 1.005.807L6.57 11.674c-.123.595-.246.71-1.346.806l-.11.52h3.774l.11-.52c-1.06-.095-1.129-.211-1.006-.806z" />
  </Svg>
);

const UnderlineIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M5.313 3.136h-1.23V9.54c0 2.105 1.47 3.623 3.917 3.623s3.917-1.518 3.917-3.623V3.136h-1.23v6.323c0 1.49-.978 2.57-2.687 2.57-1.709 0-2.687-1.08-2.687-2.57V3.136zM12.5 15h-9v-1h9v1z" />
  </Svg>
);

const LinkIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M4.715 6.542 3.343 7.914a3 3 0 1 0 4.243 4.243l1.828-1.829A3 3 0 0 0 8.586 5.5L8 6.086a1.002 1.002 0 0 0-.154.199 2 2 0 0 1 .861 3.337L6.88 11.45a2 2 0 1 1-2.83-2.83l.793-.792a4.018 4.018 0 0 1-.128-1.287z" />
    <Path d="M6.586 4.672A3 3 0 0 0 7.414 9.5l.775-.776a2 2 0 0 1-.896-3.346L9.12 3.55a2 2 0 1 1 2.83 2.83l-.793.792c.112.42.155.855.128 1.287l1.372-1.372a3 3 0 1 0-4.243-4.243L6.586 4.672z" />
  </Svg>
);

const H1Icon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M8.637 13V3.669H7.379V7.62H2.758V3.67H1.5V13h1.258V8.728h4.62V13h1.259zm5.329 0V3.669h-1.244L10.5 5.316v1.265l2.16-1.565h.062V13h1.244z" />
  </Svg>
);

const H2Icon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M7.638 13V3.669H6.38V7.62H1.759V3.67H.5V13h1.258V8.728h4.62V13h1.259zm3.022-6.733v-.048c0-.889.63-1.668 1.716-1.668.957 0 1.675.608 1.675 1.572 0 .855-.554 1.504-1.067 2.085l-3.513 3.999V13H15.5v-1.094h-4.245v-.075l2.481-2.844c.875-.998 1.586-1.784 1.586-2.953 0-1.463-1.155-2.556-2.919-2.556-1.941 0-2.966 1.326-2.966 2.74v.049h1.223z" />
  </Svg>
);

const H3Icon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M7.637 13V3.669H6.379V7.62H1.758V3.67H.5V13h1.258V8.728h4.62V13h1.259zm3.625-4.272h1.018c1.142 0 1.935.67 1.949 1.674.013 1.005-.78 1.737-2.01 1.73-1.08-.007-1.853-.588-1.935-1.32H9.108c.069 1.327 1.224 2.386 3.083 2.386 1.935 0 3.343-1.155 3.309-2.789-.027-1.51-1.251-2.16-2.037-2.249v-.068c.704-.123 1.764-.91 1.723-2.229-.035-1.353-1.176-2.4-2.954-2.385-1.873.006-2.857 1.162-2.898 2.358h1.196c.062-.69.711-1.299 1.696-1.299.998 0 1.695.622 1.695 1.525.007.922-.718 1.592-1.695 1.592h-.964v1.074z" />
  </Svg>
);

const ListBulletIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path
      fillRule="evenodd"
      d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm-3 1a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2zm0 4a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"
    />
  </Svg>
);

const ListNumberIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path
      fillRule="evenodd"
      d="M5 11.5a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h9a.5.5 0 0 1 0 1h-9a.5.5 0 0 1-.5-.5z"
    />
    <Path d="M1.713 11.865v-.474H2c.217 0 .363-.137.363-.317 0-.185-.158-.31-.361-.31-.223 0-.367.152-.373.31h-.59c.016-.467.373-.787.986-.787.588-.002.954.291.957.703a.595.595 0 0 1-.492.594v.033a.615.615 0 0 1 .569.631c.003.533-.502.8-1.051.8-.656 0-1-.37-1.008-.794h.582c.008.178.186.306.422.309.254 0 .424-.145.422-.35-.002-.195-.155-.348-.414-.348h-.3zm-.004-4.699h-.604v-.035c0-.408.295-.844.958-.844.583 0 .96.326.96.756 0 .389-.257.617-.476.848l-.537.572v.03h1.054V9H1.143v-.395l.957-.99c.138-.142.293-.304.293-.508 0-.18-.147-.32-.342-.32a.33.33 0 0 0-.342.338v.041zM2.564 5h-.635V2.924h-.031l-.598.42v-.567l.629-.443h.635V5z" />
  </Svg>
);

const QuoteIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M12 12a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1h-1.388c0-.351.021-.703.062-1.054.062-.372.166-.703.31-.992.145-.29.331-.517.559-.683.227-.186.516-.279.868-.279V3c-.579 0-1.085.124-1.52.372a3.322 3.322 0 0 0-1.085.992 4.92 4.92 0 0 0-.62 1.458A7.712 7.712 0 0 0 9 7.558V11a1 1 0 0 0 1 1h2Zm-6 0a1 1 0 0 0 1-1V8.558a1 1 0 0 0-1-1H4.612c0-.351.021-.703.062-1.054.062-.372.166-.703.31-.992.145-.29.331-.517.559-.683.227-.186.516-.279.868-.279V3c-.579 0-1.085.124-1.52.372a3.322 3.322 0 0 0-1.085.992 4.92 4.92 0 0 0-.62 1.458A7.712 7.712 0 0 0 3 7.558V11a1 1 0 0 0 1 1h2Z" />
  </Svg>
);

const CodeIcon = () => (
  <Svg
    width={16}
    height={16}
    viewBox="0 0 16 16"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <Path d="M5.854 4.854a.5.5 0 1 0-.708-.708l-3.5 3.5a.5.5 0 0 0 0 .708l3.5 3.5a.5.5 0 0 0 .708-.708L2.707 8l3.147-3.146zm4.292 0a.5.5 0 0 1 .708-.708l3.5 3.5a.5.5 0 0 1 0 .708l-3.5 3.5a.5.5 0 0 1-.708-.708L13.293 8l-3.147-3.146z" />
  </Svg>
);

// Simple custom toolbar buttons
const ToolbarButton = ({ icon, onPress, isActive, tooltip }) => (
  <TouchableOpacity
    style={[styles.toolbarButton, isActive && styles.activeButton]}
    onPress={onPress}
    accessibilityLabel={tooltip}
    accessibilityRole="button"
  >
    {React.cloneElement(icon, { fill: isActive ? "#007AFF" : "#333333" })}
  </TouchableOpacity>
);

const KeyboardToolbar = ({
  editor,
  keyboardHeight = 0,
  isKeyboardVisible = false,
}) => {
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

  // Helper function to focus the editor
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
        const headingLevel = block.props?.level;

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
          if (headingLevel === 1) newActiveFormats.heading1 = true;
          if (headingLevel === 2) newActiveFormats.heading2 = true;
          if (headingLevel === 3) newActiveFormats.heading3 = true;
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

  // Function to apply formatting
  const applyFormat = (format) => {
    try {
      // Focus editor first
      focusEditor();

      if (!editor) {
        console.log("Editor instance is not available");
        return;
      }

      // Get cursor position
      const cursorPosition = editor.getTextCursorPosition();
      if (!cursorPosition) {
        console.log("No cursor position found");
        return;
      }

      // Handle text formatting (using BlockNote API)
      switch (format) {
        case "bold":
          // Check if format is supported by BlockNote
          if (typeof editor.addMark === "function") {
            if (activeFormats.bold) {
              editor.removeMark("bold");
            } else {
              editor.addMark("bold");
            }
          }
          break;

        case "italic":
          // Check if format is supported by BlockNote
          if (typeof editor.addMark === "function") {
            if (activeFormats.italic) {
              editor.removeMark("italic");
            } else {
              editor.addMark("italic");
            }
          }
          break;

        case "underline":
          // Check if format is supported by BlockNote
          if (typeof editor.addMark === "function") {
            if (activeFormats.underline) {
              editor.removeMark("underline");
            } else {
              editor.addMark("underline");
            }
          }
          break;

        case "heading1":
          if (
            cursorPosition.block.type === "heading" &&
            cursorPosition.block.props?.level === 1
          ) {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, {
              type: "heading",
              props: { level: 1 },
            });
          }
          break;

        case "heading2":
          if (
            cursorPosition.block.type === "heading" &&
            cursorPosition.block.props?.level === 2
          ) {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, {
              type: "heading",
              props: { level: 2 },
            });
          }
          break;

        case "heading3":
          if (
            cursorPosition.block.type === "heading" &&
            cursorPosition.block.props?.level === 3
          ) {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, {
              type: "heading",
              props: { level: 3 },
            });
          }
          break;

        case "bulletList":
          if (cursorPosition.block.type === "bulletListItem") {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, {
              type: "bulletListItem",
            });
          }
          break;

        case "numberedList":
          if (cursorPosition.block.type === "numberedListItem") {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, {
              type: "numberedListItem",
            });
          }
          break;

        case "quote":
          if (cursorPosition.block.type === "quote") {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, { type: "quote" });
          }
          break;

        case "code":
          if (cursorPosition.block.type === "code") {
            editor.updateBlock(cursorPosition.block.id, { type: "paragraph" });
          } else {
            editor.updateBlock(cursorPosition.block.id, { type: "code" });
          }
          break;

        default:
          console.log("Unknown format:", format);
      }

      // Update active states after action
      setTimeout(() => {
        checkActiveFormats();
        focusEditor();
      }, 10);
    } catch (error) {
      console.error("Error applying format:", error);
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
    <View style={[styles.toolbarContainer, { bottom: keyboardHeight }]}>
      <View style={styles.keyboardToolbar}>
        {/* Block formatting buttons */}
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon={<H1Icon />}
            onPress={() => applyFormat("heading1")}
            isActive={activeFormats.heading1}
            tooltip="Heading 1"
          />
          <ToolbarButton
            icon={<H2Icon />}
            onPress={() => applyFormat("heading2")}
            isActive={activeFormats.heading2}
            tooltip="Heading 2"
          />
          <ToolbarButton
            icon={<H3Icon />}
            onPress={() => applyFormat("heading3")}
            isActive={activeFormats.heading3}
            tooltip="Heading 3"
          />
        </View>

        {/* List buttons */}
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon={<ListBulletIcon />}
            onPress={() => applyFormat("bulletList")}
            isActive={activeFormats.bulletList}
            tooltip="Bullet List"
          />
          <ToolbarButton
            icon={<ListNumberIcon />}
            onPress={() => applyFormat("numberedList")}
            isActive={activeFormats.numberedList}
            tooltip="Numbered List"
          />
        </View>

        {/* Special blocks */}
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon={<QuoteIcon />}
            onPress={() => applyFormat("quote")}
            isActive={activeFormats.quote}
            tooltip="Quote Block"
          />
          <ToolbarButton
            icon={<CodeIcon />}
            onPress={() => applyFormat("code")}
            isActive={activeFormats.code}
            tooltip="Code Block"
          />
        </View>

        {/* Text formatting buttons */}
        <View style={styles.toolbarGroup}>
          <ToolbarButton
            icon={<BoldIcon />}
            onPress={() => applyFormat("bold")}
            isActive={activeFormats.bold}
            tooltip="Bold"
          />
          <ToolbarButton
            icon={<ItalicIcon />}
            onPress={() => applyFormat("italic")}
            isActive={activeFormats.italic}
            tooltip="Italic"
          />
          <ToolbarButton
            icon={<UnderlineIcon />}
            onPress={() => applyFormat("underline")}
            isActive={activeFormats.underline}
            tooltip="Underline"
          />
        </View>
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
    backgroundColor: "#fbfbfb",

    paddingHorizontal: 8,
    paddingVertical: 4,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  toolbarGroup: {
    flexDirection: "row",
    marginHorizontal: 4,
    borderRightWidth: 1,
    overflowX: "scroll",
    borderRightColor: "#eee",
    paddingRight: 8,
  },
  toolbarButton: {
    padding: 8,
    margin: 2,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  activeButton: {
    backgroundColor: "#e6f7ff",
  },
});

export default KeyboardToolbar;
