/**
 * Voice Command Patterns
 *
 * This file defines the patterns and examples for voice commands
 * that can be used for content editing in VoiceNotion.
 */

// Command categories for organizing command patterns
const COMMAND_CATEGORIES = {
  TEXT_FORMATTING: "TEXT_FORMATTING",
  TEXT_SELECTION: "TEXT_SELECTION",
  CONTENT_MODIFICATION: "CONTENT_MODIFICATION",
  BLOCK_TRANSFORMATION: "BLOCK_TRANSFORMATION",
  UNDO_REDO: "UNDO_REDO",
};

// Command types for specific operations
const COMMAND_TYPES = {
  // Text formatting
  APPLY_BOLD: "APPLY_BOLD",
  APPLY_ITALIC: "APPLY_ITALIC",
  APPLY_UNDERLINE: "APPLY_UNDERLINE",
  REMOVE_FORMATTING: "REMOVE_FORMATTING",
  CHANGE_TEXT_COLOR: "CHANGE_TEXT_COLOR",

  // Text selection
  SELECT_TEXT: "SELECT_TEXT",
  SELECT_BLOCK: "SELECT_BLOCK",
  SELECT_RANGE: "SELECT_RANGE",
  SELECT_ALL: "SELECT_ALL",

  // Content modification
  REPLACE_TEXT: "REPLACE_TEXT",
  INSERT_AT_POSITION: "INSERT_AT_POSITION",
  APPEND_TEXT: "APPEND_TEXT",
  PREPEND_TEXT: "PREPEND_TEXT",
  DELETE_SELECTION: "DELETE_SELECTION",
  DELETE_RANGE: "DELETE_RANGE",

  // Block transformation
  CHANGE_BLOCK_TYPE: "CHANGE_BLOCK_TYPE",
  CHANGE_HEADING_LEVEL: "CHANGE_HEADING_LEVEL",
  CONVERT_TO_LIST: "CONVERT_TO_LIST",

  // Undo/Redo
  UNDO: "UNDO",
  REDO: "REDO",
  UNDO_MULTIPLE: "UNDO_MULTIPLE",
};

// Command patterns with examples and their corresponding intents
const COMMAND_PATTERNS = [
  // Text formatting patterns
  {
    category: COMMAND_CATEGORIES.TEXT_FORMATTING,
    type: COMMAND_TYPES.APPLY_BOLD,
    patterns: ["make * bold", "bold *", "apply bold to *", "make * strong"],
    examples: [
      "Make the last paragraph bold",
      "Bold the text that says project timeline",
      "Apply bold to the first heading",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_FORMATTING,
    type: COMMAND_TYPES.APPLY_ITALIC,
    patterns: [
      "make * italic",
      "italicize *",
      "apply italic to *",
      "make * slanted",
    ],
    examples: [
      "Make the first heading italic",
      "Italicize the text that mentions customer feedback",
      "Apply italic to the last sentence",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_FORMATTING,
    type: COMMAND_TYPES.APPLY_UNDERLINE,
    patterns: ["make * underlined", "underline *", "apply underline to *"],
    examples: [
      "Make the deadline date underlined",
      "Underline the text that says project timeline",
      "Apply underline to the important notes",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_FORMATTING,
    type: COMMAND_TYPES.REMOVE_FORMATTING,
    patterns: [
      "remove formatting from *",
      "clear formatting of *",
      "make * plain text",
      "remove styles from *",
    ],
    examples: [
      "Remove formatting from the selected text",
      "Clear formatting of the first paragraph",
      "Make the heading plain text",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_FORMATTING,
    type: COMMAND_TYPES.CHANGE_TEXT_COLOR,
    patterns: [
      "change * color to *",
      "make * color *",
      "set * color to *",
      "change the color of * to *",
    ],
    examples: [
      "Change the heading color to blue",
      "Make the last paragraph color red",
      "Set the title color to green",
      "Change the color of all headings to blue",
    ],
  },

  // Text selection patterns
  {
    category: COMMAND_CATEGORIES.TEXT_SELECTION,
    type: COMMAND_TYPES.SELECT_BLOCK,
    patterns: [
      "select * paragraph",
      "select * heading",
      "select * list",
      "select * block",
    ],
    examples: [
      "Select the last paragraph",
      "Select the first heading",
      "Select the third list",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_SELECTION,
    type: COMMAND_TYPES.SELECT_TEXT,
    patterns: [
      "select the text *",
      "select text that says *",
      "select the words *",
      "select phrase *",
    ],
    examples: [
      "Select the text project timeline",
      "Select text that says customer feedback",
      "Select the words next steps",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_SELECTION,
    type: COMMAND_TYPES.SELECT_RANGE,
    patterns: [
      "select from * to *",
      "select between * and *",
      "select text from * to *",
    ],
    examples: [
      "Select from 'project timeline' to 'next steps'",
      "Select between 'customer feedback' and 'action items'",
      "Select text from the beginning to 'conclusion'",
    ],
  },
  {
    category: COMMAND_CATEGORIES.TEXT_SELECTION,
    type: COMMAND_TYPES.SELECT_ALL,
    patterns: ["select all *", "select all text", "select everything"],
    examples: ["Select all headings", "Select all text", "Select everything"],
  },

  // Content modification patterns
  {
    category: COMMAND_CATEGORIES.CONTENT_MODIFICATION,
    type: COMMAND_TYPES.REPLACE_TEXT,
    patterns: ["replace * with *", "change * to *", "substitute * with *"],
    examples: [
      "Replace 'customer feedback' with 'client comments'",
      "Change the heading 'Ingredients' to 'Required Ingredients'",
      "Substitute yesterday's date with today's date",
    ],
  },
  {
    category: COMMAND_CATEGORIES.CONTENT_MODIFICATION,
    type: COMMAND_TYPES.DELETE_SELECTION,
    patterns: ["delete *", "remove *", "erase *"],
    examples: [
      "Delete the last paragraph",
      "Remove the text about customer feedback",
      "Erase the heading 'Old Section'",
    ],
  },
  {
    category: COMMAND_CATEGORIES.CONTENT_MODIFICATION,
    type: COMMAND_TYPES.DELETE_RANGE,
    patterns: [
      "delete everything after *",
      "delete from * to *",
      "remove text between * and *",
    ],
    examples: [
      "Delete everything after 'next steps'",
      "Delete from 'project timeline' to the end",
      "Remove text between 'introduction' and 'conclusion'",
    ],
  },
  {
    category: COMMAND_CATEGORIES.CONTENT_MODIFICATION,
    type: COMMAND_TYPES.APPEND_TEXT,
    patterns: ["add * to the end of *", "append * to *", "add * after *"],
    examples: [
      "Add 'urgent' to the end of the first task",
      "Append 'review required' to the last paragraph",
      "Add 'by tomorrow' after the deadline",
    ],
  },
  {
    category: COMMAND_CATEGORIES.CONTENT_MODIFICATION,
    type: COMMAND_TYPES.PREPEND_TEXT,
    patterns: [
      "add * to the beginning of *",
      "prepend * to *",
      "add * before *",
    ],
    examples: [
      "Add 'Important: ' to the beginning of the first paragraph",
      "Prepend 'DRAFT: ' to the title",
      "Add 'Note: ' before the last sentence",
    ],
  },

  // Block transformation patterns
  {
    category: COMMAND_CATEGORIES.BLOCK_TRANSFORMATION,
    type: COMMAND_TYPES.CHANGE_BLOCK_TYPE,
    patterns: ["convert * to a *", "change * to *", "make * a *"],
    examples: [
      "Convert the paragraph about timeline to a bulleted list",
      "Change the last paragraph to a quote block",
      "Make this text a code block",
    ],
  },
  {
    category: COMMAND_CATEGORIES.BLOCK_TRANSFORMATION,
    type: COMMAND_TYPES.CHANGE_HEADING_LEVEL,
    patterns: [
      "change * to heading level *",
      "make * heading *",
      "convert * to h*",
    ],
    examples: [
      "Change the first heading to heading level 2",
      "Make the title heading 1",
      "Convert the subtitle to h3",
    ],
  },
  {
    category: COMMAND_CATEGORIES.BLOCK_TRANSFORMATION,
    type: COMMAND_TYPES.CONVERT_TO_LIST,
    patterns: ["convert * to * list", "make * a * list", "change * to * list"],
    examples: [
      "Convert this paragraph to a bullet list",
      "Make these items a numbered list",
      "Change the steps to a todo list",
    ],
  },

  // Undo/Redo patterns
  {
    category: COMMAND_CATEGORIES.UNDO_REDO,
    type: COMMAND_TYPES.UNDO,
    patterns: ["undo", "undo last change", "undo that"],
    examples: ["Undo", "Undo last change", "Undo that"],
  },
  {
    category: COMMAND_CATEGORIES.UNDO_REDO,
    type: COMMAND_TYPES.REDO,
    patterns: ["redo", "redo last change", "redo that"],
    examples: ["Redo", "Redo last change", "Redo that"],
  },
  {
    category: COMMAND_CATEGORIES.UNDO_REDO,
    type: COMMAND_TYPES.UNDO_MULTIPLE,
    patterns: ["undo * changes", "undo last * changes", "go back * steps"],
    examples: [
      "Undo 3 changes",
      "Undo the last two changes",
      "Go back 5 steps",
    ],
  },
];

export { COMMAND_CATEGORIES, COMMAND_TYPES, COMMAND_PATTERNS };
