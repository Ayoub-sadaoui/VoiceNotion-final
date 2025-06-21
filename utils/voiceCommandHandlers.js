// Voice command handler utilities for NoteScreen
import Toast from "react-native-toast-message";
import geminiService from "../services/geminiService";
import { validateBlockFormat } from "./blockOperations";

/**
 * Create a paragraph block with the given text
 * @param {string} text - Text for the paragraph
 * @returns {Object} - Block object
 */
export const createParagraphBlock = (text) => {
  return {
    type: "paragraph",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
    },
    content: [
      {
        type: "text",
        text: text,
        styles: {},
      },
    ],
    children: [],
  };
};

/**
 * Create a heading block for AI-generated content
 * @param {string} headerText - Text for the heading
 * @returns {Object} - Block object
 */
export const createAIHeaderBlock = (headerText) => {
  return {
    type: "heading",
    props: {
      textColor: "default",
      backgroundColor: "default",
      textAlignment: "left",
      level: 3,
    },
    content: [
      {
        type: "text",
        text: headerText,
        styles: {
          bold: true,
        },
      },
    ],
    children: [],
  };
};

/**
 * Handle AI content insertion commands
 */
export const handleAIContentCommand = async (
  commandResult,
  insertTranscriptionDirectly
) => {
  if (!commandResult.blocks || !Array.isArray(commandResult.blocks)) {
    console.error("Invalid AI content format:", commandResult);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "The AI response was in an invalid format",
      visibilityTime: 2000,
    });
    return false;
  }

  // Create appropriate header text based on action type
  let headerText = "AI Answer";
  if (commandResult.action === "INSERT_AI_SUMMARY") {
    headerText = "AI Summary";
  } else if (commandResult.action === "INSERT_AI_COMPLETION") {
    headerText = "AI Completion";
  } else if (commandResult.action === "INSERT_AI_REWRITE") {
    headerText = "AI Rewrite";
  }

  // Create a header block to indicate what type of AI content this is
  const headerBlock = createAIHeaderBlock(headerText);

  // Insert the header followed by the AI-generated blocks
  const blocksToInsert = [headerBlock, ...commandResult.blocks];
  const success = insertTranscriptionDirectly(blocksToInsert, false);

  if (success) {
    Toast.show({
      type: "success",
      text1: headerText + " Added",
      text2: `The AI ${headerText.toLowerCase()} has been added to your note`,
      visibilityTime: 2000,
    });
    return true;
  } else {
    Toast.show({
      type: "error",
      text1: "Error",
      text2: `Failed to add ${headerText.toLowerCase()} to note`,
      visibilityTime: 2000,
    });
    return false;
  }
};

/**
 * Handle delete block command
 */
export const handleDeleteBlockCommand = async (
  commandResult,
  editorContent,
  initialContent,
  editorRef,
  setEditorContent,
  setInitialContent,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setForceRefresh,
  setIsSaving
) => {
  try {
    setIsSaving(true);
    console.log("Executing delete block command with:", commandResult);

    // Get the latest content
    const currentContent = editorContent || initialContent || [];
    if (!currentContent || currentContent.length === 0) {
      console.warn("No content to delete blocks from");
      Toast.show({
        type: "info",
        text1: "No Content",
        text2: "There are no blocks to delete",
        visibilityTime: 2000,
      });
      setIsSaving(false);
      return;
    }

    // Validate block IDs to delete
    if (
      !commandResult.targetBlockIds ||
      !Array.isArray(commandResult.targetBlockIds) ||
      commandResult.targetBlockIds.length === 0
    ) {
      console.warn("No valid block IDs to delete");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Could not determine which block(s) to delete",
        visibilityTime: 2000,
      });
      setIsSaving(false);
      return;
    }

    // Simple approach: Create a new array without the blocks to delete
    const blocksToDelete = new Set(commandResult.targetBlockIds);
    console.log("Creating Set of blocks to delete:", blocksToDelete);

    // Create a simple copy of the content without the blocks to delete
    const filteredContent = currentContent.filter((block) => {
      const shouldKeep = !blocksToDelete.has(block.id);
      if (!shouldKeep) {
        console.log(`Removing block with ID ${block.id} of type ${block.type}`);
      }
      return shouldKeep;
    });

    // Update state with the new content
    setEditorContent(filteredContent);
    setInitialContent(filteredContent);

    // Save to storage
    if (currentPage) {
      const contentJsonString = JSON.stringify(filteredContent);
      const updatedPage = {
        ...currentPage,
        contentJson: contentJsonString,
        updatedAt: Date.now(),
      };

      const savedPage = await storageSavePage(updatedPage);
      setCurrentPage(savedPage);

      // Force refresh the editor
      setForceRefresh((prev) => prev + 10);

      // Try to update the editor content directly if possible
      if (
        editorRef.current &&
        typeof editorRef.current.setContent === "function"
      ) {
        try {
          console.log("Updating editor content directly");
          editorRef.current.setContent(filteredContent);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              editorRef.current.focusEditor();
            }
          }, 50);
        } catch (editorError) {
          console.error("Error updating editor content:", editorError);
        }
      }

      // Show success message
      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Block deleted successfully",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error executing delete command:", error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Failed to delete block(s)",
      visibilityTime: 2000,
    });
  } finally {
    setIsSaving(false);
  }
};

/**
 * Handle insert content command
 */
export const handleInsertContentCommand = async (
  commandResult,
  insertTranscriptionDirectly,
  setIsSaving
) => {
  try {
    const content = commandResult.content;
    if (!content) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No content provided to insert",
        visibilityTime: 2000,
      });
      return;
    }

    // Set loading state to indicate processing
    setIsSaving(true);

    try {
      // Process the content through Gemini to create structured blocks based on context
      const structuredResult =
        await geminiService.processTranscriptionWithGemini(content);

      let inserted = false;

      if (structuredResult.success && structuredResult.blocks) {
        // If Gemini successfully created structured blocks, insert them
        inserted = await insertTranscriptionDirectly(
          structuredResult.blocks,
          false
        );
        console.log("Inserted structured blocks for content");
      } else {
        // Fall back to inserting raw text if structuring fails
        inserted = await insertTranscriptionDirectly(content, true);
        console.log("Fell back to inserting raw text");
      }

      if (
        inserted &&
        typeof content === "string" &&
        content.trim().length > 0
      ) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Content added",
          visibilityTime: 2000,
        });
      }
    } catch (processingError) {
      console.error("Error processing content structure:", processingError);

      // Fall back to inserting as raw text if the processing fails
      const inserted = await insertTranscriptionDirectly(content, true);

      if (
        inserted &&
        typeof content === "string" &&
        content.trim().length > 0
      ) {
        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Content added (as plain text)",
          visibilityTime: 2000,
        });
      }
    }
  } catch (error) {
    console.error("Error inserting content:", error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Failed to add content",
      visibilityTime: 2000,
    });
  } finally {
    setIsSaving(false);
  }
};

/**
 * Handle create page command
 */
export const handleCreatePageCommand = async (
  commandResult,
  currentPage,
  createNewPage,
  handleSave,
  storageSavePage,
  insertTranscriptionDirectly,
  loadNestedPages,
  router,
  setIsSaving
) => {
  try {
    const { pageTitle, pageContent } = commandResult;

    if (!pageTitle) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No page title provided",
        visibilityTime: 2000,
      });
      return;
    }

    // Save current page first
    await handleSave();

    // Create a new page
    const newPage = await createNewPage(
      currentPage.id, // Make it a child of current page
      pageTitle,
      "📄" // Default icon
    );

    if (!newPage || !newPage.id) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create new page",
        visibilityTime: 2000,
      });
      return;
    }

    // Add page link to current page with FIXED CONTENT STRUCTURE
    // PageLinkBlock expects content: "none", so create with empty content array
    const pageLinkBlock = {
      type: "pageLink",
      props: {
        pageId: newPage.id,
        pageTitle: newPage.title,
        pageIcon: newPage.icon,
      },
      content: [],
      children: [],
    };

    // Insert page link into the current page
    await insertTranscriptionDirectly(pageLinkBlock, false);

    // If we have content for the new page, add it to the new page
    if (pageContent) {
      // Set a temporary loading state
      setIsSaving(true);

      try {
        // Process the content through Gemini to create structured blocks
        const structuredResult =
          await geminiService.processTranscriptionWithGemini(pageContent);

        // Create initial blocks for the new page with proper structure
        const headingBlock = {
          type: "heading",
          props: {
            level: 1,
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: newPage.title,
              styles: {},
            },
          ],
          children: [],
        };

        // Determine what content blocks to use based on Gemini result
        let contentBlocks = [];

        if (structuredResult.success && structuredResult.blocks) {
          // Use the structured blocks from Gemini
          contentBlocks = structuredResult.blocks;
        } else {
          // Fallback to simple paragraph if structuring failed
          contentBlocks = [createParagraphBlock(pageContent)];
        }

        // Combine heading with structured content blocks
        const initialBlocks = [headingBlock, ...contentBlocks];
        const contentJsonString = JSON.stringify(initialBlocks);

        // Save directly to storage without using BlockNote API
        const updatedPage = {
          ...newPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        await storageSavePage(updatedPage);
      } catch (err) {
        console.error("Error processing page content:", err);
        // Fallback to simple paragraph if processing fails
        const headingBlock = {
          type: "heading",
          props: {
            level: 1,
            textColor: "default",
            backgroundColor: "default",
            textAlignment: "left",
          },
          content: [
            {
              type: "text",
              text: newPage.title,
              styles: {},
            },
          ],
          children: [],
        };

        const contentBlock = createParagraphBlock(pageContent);
        const initialBlocks = [headingBlock, contentBlock];
        const contentJsonString = JSON.stringify(initialBlocks);

        // Save the page with fallback content
        const updatedPage = {
          ...newPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        await storageSavePage(updatedPage);
      } finally {
        setIsSaving(false);
      }
    }

    // Reload nested pages to show the new page
    await loadNestedPages();

    // Return the new page for further processing
    return newPage;
  } catch (error) {
    console.error("Error creating new page:", error);
    Toast.show({
      type: "error",
      text1: "Error",
      text2: "Failed to create new page",
      visibilityTime: 2000,
    });
    return null;
  }
};

/**
 * Handle formatting command
 */
export const handleApplyFormattingCommand = async (
  commandResult,
  editorContent,
  initialContent,
  editorRef,
  setEditorContent,
  setInitialContent,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setForceRefresh,
  setIsSaving
) => {
  try {
    // Validate the command result
    if (!commandResult.formattingType) {
      console.warn("Missing formatting type in command");
      Toast.show({
        type: "info",
        text1: "Formatting Error",
        text2: "Please specify what formatting to apply",
        visibilityTime: 2000,
      });
      return;
    }

    // Set loading state
    setIsSaving(true);

    // Get current content
    const currentContent = editorContent || initialContent || [];

    if (currentContent.length === 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No content to format",
        visibilityTime: 2000,
      });
      setIsSaving(false);
      return;
    }

    // Determine what to format
    let targetText = commandResult.targetText;
    let targetBlockIds = commandResult.targetBlockIds;
    let formatType = commandResult.formattingType?.toLowerCase();

    // Handle "last paragraph" type commands
    if (!targetText && !targetBlockIds && formatType) {
      // If no specific target is provided, format the last block
      const lastBlock = currentContent[currentContent.length - 1];
      targetBlockIds = [lastBlock.id];
    }

    // Make a copy of content to modify
    const updatedContent = JSON.parse(JSON.stringify(currentContent));
    let success = false;

    // Apply formatting to target blocks
    for (const block of updatedContent) {
      if (!targetBlockIds || targetBlockIds.includes(block.id)) {
        // Apply to whole block
        if (block.content && Array.isArray(block.content)) {
          block.content.forEach((item) => {
            if (item.type === "text") {
              if (!item.styles) item.styles = {};

              // Apply the formatting
              switch (formatType) {
                case "bold":
                  item.styles.bold = true;
                  break;
                case "italic":
                  item.styles.italic = true;
                  break;
                case "underline":
                  item.styles.underline = true;
                  break;
                case "remove_formatting":
                  item.styles = {};
                  break;
              }
              success = true;
            }
          });
        }
      }
    }

    if (success) {
      // Update state variables
      setEditorContent(updatedContent);
      setInitialContent(updatedContent);

      // Save to storage
      if (currentPage) {
        const contentJsonString = JSON.stringify(updatedContent);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);

        // Force refresh the editor
        setForceRefresh((prev) => prev + 10);

        // Try to update the editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          editorRef.current.setContent(updatedContent);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              editorRef.current.focusEditor();
            }
          }, 50);
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: `Applied ${formatType} formatting`,
          visibilityTime: 2000,
        });
      }
    } else {
      Toast.show({
        type: "error",
        text1: "Formatting Failed",
        text2: "Could not apply formatting",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error applying formatting:", error);
    Toast.show({
      type: "error",
      text1: "Formatting Error",
      text2: "Failed to apply formatting",
      visibilityTime: 2000,
    });
  } finally {
    setIsSaving(false);
  }
};

/**
 * Handle modify block command (convert block types, change properties, etc)
 */
export const handleModifyBlockCommand = async (
  commandResult,
  editorContent,
  initialContent,
  editorRef,
  setEditorContent,
  setInitialContent,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setForceRefresh,
  setIsSaving
) => {
  try {
    // Validate the command result
    if (!commandResult.modificationType) {
      console.warn("Missing modification type in command");
      Toast.show({
        type: "info",
        text1: "Modification Error",
        text2: "Please specify what modification to apply",
        visibilityTime: 2000,
      });
      return;
    }

    console.log("Starting block modification with command:", commandResult);

    // Set loading state
    setIsSaving(true);

    // Get current content
    const currentContent = editorContent || initialContent || [];
    console.log(`Current content has ${currentContent.length} blocks`);

    if (currentContent.length === 0) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "No content to modify",
        visibilityTime: 2000,
      });
      setIsSaving(false);
      return;
    }

    // Make a copy of content to modify
    const updatedContent = JSON.parse(JSON.stringify(currentContent));
    let success = false;

    // Handle different modification types
    const modificationType = commandResult.modificationType;
    console.log(`Modification type: ${modificationType}`);

    if (modificationType === "CONVERT_TO_LIST") {
      // Converting block types (e.g., bullet list to to-do list)
      const newType = commandResult.newType;
      const targetBlockType = commandResult.targetBlockType;
      const targetBlockIds = commandResult.targetBlockIds;

      console.log(`Converting to new type: ${newType}`);
      console.log(`Target block type: ${targetBlockType}`);
      console.log(
        `Target block IDs: ${
          targetBlockIds ? targetBlockIds.join(", ") : "none"
        }`
      );

      // Determine which blocks to modify
      let blocksToModify = [];

      if (targetBlockType) {
        // Modify all blocks of a specific type
        blocksToModify = updatedContent.filter(
          (block) => block.type === targetBlockType
        );
        console.log(
          `Found ${blocksToModify.length} blocks of type ${targetBlockType} to modify`
        );
      } else if (targetBlockIds && targetBlockIds.length > 0) {
        // Modify specific blocks by ID
        blocksToModify = updatedContent.filter((block) =>
          targetBlockIds.includes(block.id)
        );
        console.log(`Found ${blocksToModify.length} blocks by ID to modify`);
      } else {
        // Default to modifying all blocks that match the conversion pattern
        // For bullet to todo, modify all bulletListItems
        if (newType === "checkListItem") {
          blocksToModify = updatedContent.filter(
            (block) => block.type === "bulletListItem"
          );
          console.log(
            `Found ${blocksToModify.length} bullet list items to convert to check list items`
          );
        } else if (newType === "bulletListItem") {
          blocksToModify = updatedContent.filter(
            (block) =>
              block.type === "checkListItem" ||
              block.type === "numberedListItem"
          );
          console.log(
            `Found ${blocksToModify.length} items to convert to bullet list items`
          );
        } else if (newType === "numberedListItem") {
          blocksToModify = updatedContent.filter(
            (block) =>
              block.type === "bulletListItem" || block.type === "checkListItem"
          );
          console.log(
            `Found ${blocksToModify.length} items to convert to numbered list items`
          );
        }
      }

      // Perform the conversion
      if (blocksToModify.length > 0) {
        console.log(`Modifying ${blocksToModify.length} blocks`);
        const blockIds = blocksToModify.map((block) => block.id);

        for (const block of updatedContent) {
          if (blockIds.includes(block.id)) {
            console.log(
              `Converting block ${block.id} from ${block.type} to ${newType}`
            );
            // Convert the block type
            block.type = newType;

            // Add any required properties for the new block type
            if (
              newType === "checkListItem" &&
              !block.props.hasOwnProperty("checked")
            ) {
              block.props.checked = false;
              console.log(`Added checked: false property to block ${block.id}`);
            } else if (
              newType === "heading" &&
              !block.props.hasOwnProperty("level")
            ) {
              block.props.level = commandResult.headingLevel || 2;
              console.log(
                `Added level: ${block.props.level} property to block ${block.id}`
              );
            }

            success = true;
          }
        }
      } else {
        console.log("No blocks found to modify");
      }
    } else if (modificationType === "CHANGE_TYPE") {
      // Similar to CONVERT_TO_LIST but for non-list block types
      // Implementation similar to above
      const newType = commandResult.newType;
      const targetBlockIds = commandResult.targetBlockIds;

      if (targetBlockIds && targetBlockIds.length > 0) {
        for (const block of updatedContent) {
          if (targetBlockIds.includes(block.id)) {
            block.type = newType;

            // Add required properties
            if (newType === "heading" && !block.props.hasOwnProperty("level")) {
              block.props.level = commandResult.headingLevel || 2;
            } else if (
              newType === "checkListItem" &&
              !block.props.hasOwnProperty("checked")
            ) {
              block.props.checked = false;
            }

            success = true;
          }
        }
      }
    }

    // If successful, update state and save
    if (success) {
      console.log("Block modification successful, updating state");

      // Update state variables
      setEditorContent(updatedContent);
      setInitialContent(updatedContent);

      // Save to storage
      if (currentPage) {
        const contentJsonString = JSON.stringify(updatedContent);
        const updatedPage = {
          ...currentPage,
          contentJson: contentJsonString,
          updatedAt: Date.now(),
        };

        console.log("Saving modified content to storage");
        const savedPage = await storageSavePage(updatedPage);
        setCurrentPage(savedPage);

        // Force refresh the editor
        console.log("Forcing editor refresh");
        setForceRefresh((prev) => prev + 10);

        // Try to update the editor content directly if possible
        if (
          editorRef.current &&
          typeof editorRef.current.setContent === "function"
        ) {
          console.log("Updating editor content directly");
          editorRef.current.setContent(updatedContent);

          // Try focusing the editor to ensure refresh
          setTimeout(() => {
            if (typeof editorRef.current.focusEditor === "function") {
              console.log("Focusing editor");
              editorRef.current.focusEditor();
            }
          }, 50);
        }

        Toast.show({
          type: "success",
          text1: "Success",
          text2: "Block(s) modified successfully",
          visibilityTime: 2000,
        });
      }
    } else {
      console.log("Block modification failed - no blocks were modified");
      Toast.show({
        type: "error",
        text1: "Modification Failed",
        text2: "Could not modify blocks",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error modifying blocks:", error);
    Toast.show({
      type: "error",
      text1: "Modification Error",
      text2: "Failed to modify blocks",
      visibilityTime: 2000,
    });
  } finally {
    console.log("Block modification process completed");
    setIsSaving(false);
  }
};

// Export other voice command handlers as needed
export const voiceCommandHandlers = {
  handleAIContentCommand,
  handleDeleteBlockCommand,
  handleInsertContentCommand,
  handleCreatePageCommand,
  handleApplyFormattingCommand,
  handleModifyBlockCommand,
};

export default voiceCommandHandlers;
