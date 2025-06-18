/**
 * Utility functions for handling undo/redo history operations
 */
import Toast from "react-native-toast-message";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Persist undo and redo stacks to AsyncStorage
 * @param {string} pageId - Current page ID
 * @param {Array} undoStack - Current undo stack
 * @param {Array} redoStack - Current redo stack
 */
const persistHistoryStacks = async (pageId, undoStack, redoStack) => {
  if (!pageId) return;

  try {
    const undoStackKey = `undoStack_${pageId}`;
    const redoStackKey = `redoStack_${pageId}`;

    // Save undo stack
    if (undoStack.length > 0) {
      await AsyncStorage.setItem(undoStackKey, JSON.stringify(undoStack));
      console.log(`Persisted undo stack with ${undoStack.length} items`);
    } else {
      await AsyncStorage.removeItem(undoStackKey);
      console.log("Removed empty undo stack from storage");
    }

    // Save redo stack
    if (redoStack.length > 0) {
      await AsyncStorage.setItem(redoStackKey, JSON.stringify(redoStack));
      console.log(`Persisted redo stack with ${redoStack.length} items`);
    } else {
      await AsyncStorage.removeItem(redoStackKey);
      console.log("Removed empty redo stack from storage");
    }
  } catch (error) {
    console.error("Error persisting history stacks:", error);
  }
};

/**
 * Handle undo operation
 * @param {Array} undoStack - Current undo stack
 * @param {Array} editorContent - Current editor content
 * @param {Function} setUndoStack - State setter for undo stack
 * @param {Function} setRedoStack - State setter for redo stack
 * @param {Function} setEditorContent - State setter for editor content
 * @param {Function} setInitialContent - State setter for initial content
 * @param {Object} currentPage - Current page object
 * @param {Function} storageSavePage - Function to save page to storage
 * @param {Function} setCurrentPage - State setter for current page
 * @param {Function} setForceRefresh - State setter for force refresh
 * @param {Object} editorRef - Reference to editor component
 * @param {Function} setIsUndoRedoOperation - State setter for undo/redo operation flag
 * @param {Function} setLastMajorChange - State setter for last major change
 * @returns {Promise<void>}
 */
export const handleUndo = async (
  undoStack,
  editorContent,
  setUndoStack,
  setRedoStack,
  setEditorContent,
  setInitialContent,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setForceRefresh,
  editorRef,
  setIsUndoRedoOperation,
  setLastMajorChange = null
) => {
  try {
    console.log("Handling undo with local storage approach");

    if (undoStack.length === 0) {
      console.log("No undo history available");
      Toast.show({
        type: "info",
        text1: "Cannot Undo",
        text2: "No more actions to undo",
        visibilityTime: 2000,
      });
      return;
    }

    // Set the flag to prevent adding to history during this operation
    setIsUndoRedoOperation(true);

    // Get the last state from the undo stack
    const prevStack = [...undoStack];
    const prevState = prevStack.pop();
    setUndoStack(prevStack);

    // Create updated redo stack with current content
    let updatedRedoStack = [];
    if (editorContent) {
      updatedRedoStack = [editorContent];
      setRedoStack((prevRedoStack) => [...prevRedoStack, editorContent]);
    }

    // Update editor content with the previous state
    setEditorContent(prevState);
    setInitialContent(prevState);

    // Update last major change if the setter is provided
    if (setLastMajorChange) {
      setLastMajorChange(prevState);
    }

    // Save to storage
    if (currentPage) {
      const contentJsonString = JSON.stringify(prevState);
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
        editorRef.current.setContent(prevState);
      }

      // Persist updated history stacks - get current redo stack state via a callback
      setRedoStack((currentRedoStack) => {
        // Persist the stacks after we have the current state
        persistHistoryStacks(currentPage.id, prevStack, currentRedoStack);
        return currentRedoStack; // Return unchanged to avoid state update loop
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Undid last change",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error performing undo:", error);
    Toast.show({
      type: "error",
      text1: "Undo Error",
      text2: "Failed to undo",
      visibilityTime: 2000,
    });
    setIsUndoRedoOperation(false);
  }
};

/**
 * Handle redo operation
 * @param {Array} redoStack - Current redo stack
 * @param {Array} editorContent - Current editor content
 * @param {Function} setUndoStack - State setter for undo stack
 * @param {Function} setRedoStack - State setter for redo stack
 * @param {Function} setEditorContent - State setter for editor content
 * @param {Function} setInitialContent - State setter for initial content
 * @param {Object} currentPage - Current page object
 * @param {Function} storageSavePage - Function to save page to storage
 * @param {Function} setCurrentPage - State setter for current page
 * @param {Function} setForceRefresh - State setter for force refresh
 * @param {Object} editorRef - Reference to editor component
 * @param {Function} setIsUndoRedoOperation - State setter for undo/redo operation flag
 * @param {Function} setLastMajorChange - State setter for last major change
 * @returns {Promise<void>}
 */
export const handleRedo = async (
  redoStack,
  editorContent,
  setUndoStack,
  setRedoStack,
  setEditorContent,
  setInitialContent,
  currentPage,
  storageSavePage,
  setCurrentPage,
  setForceRefresh,
  editorRef,
  setIsUndoRedoOperation,
  setLastMajorChange = null
) => {
  try {
    console.log("Handling redo with local storage approach");

    if (redoStack.length === 0) {
      console.log("No redo history available");
      Toast.show({
        type: "info",
        text1: "Cannot Redo",
        text2: "No more actions to redo",
        visibilityTime: 2000,
      });
      return;
    }

    // Set the flag to prevent adding to history during this operation
    setIsUndoRedoOperation(true);

    // Get the last state from the redo stack
    const prevRedoStack = [...redoStack];
    const nextState = prevRedoStack.pop();
    setRedoStack(prevRedoStack);

    // Create updated undo stack with current content
    let updatedUndoStack = [];
    if (editorContent) {
      updatedUndoStack = [editorContent];
      setUndoStack((prevUndoStack) => [...prevUndoStack, editorContent]);
    }

    // Update editor content with the next state
    setEditorContent(nextState);
    setInitialContent(nextState);

    // Update last major change if the setter is provided
    if (setLastMajorChange) {
      setLastMajorChange(nextState);
    }

    // Save to storage
    if (currentPage) {
      const contentJsonString = JSON.stringify(nextState);
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
        editorRef.current.setContent(nextState);
      }

      // Persist updated history stacks - get current undo stack state via a callback
      setUndoStack((currentUndoStack) => {
        // Persist the stacks after we have the current state
        persistHistoryStacks(currentPage.id, currentUndoStack, prevRedoStack);
        return currentUndoStack; // Return unchanged to avoid state update loop
      });

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "Redid last undone change",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error performing redo:", error);
    Toast.show({
      type: "error",
      text1: "Redo Error",
      text2: "Failed to redo",
      visibilityTime: 2000,
    });
    setIsUndoRedoOperation(false);
  }
};

/**
 * Handle UNDO command from voice
 * @param {Object} commandResult - Command result object
 * @param {Function} handleUndoWrapper - Function to handle undo operation
 * @param {Array} undoStack - Current undo stack
 */
export const handleUndoCommand = async (
  commandResult,
  handleUndoWrapper,
  undoStack
) => {
  try {
    // Get the number of steps to undo (default to 1)
    const steps = commandResult.steps || 1;

    // Perform undo operations for the specified number of steps
    for (let i = 0; i < steps; i++) {
      if (undoStack.length > 0) {
        await handleUndoWrapper();
      } else {
        break;
      }
    }

    if (undoStack.length === 0 && steps > 0) {
      Toast.show({
        type: "info",
        text1: "Cannot Undo",
        text2: "No more actions to undo",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error performing undo command:", error);
    Toast.show({
      type: "error",
      text1: "Undo Error",
      text2: "Failed to undo",
      visibilityTime: 2000,
    });
  }
};

/**
 * Handle REDO command from voice
 * @param {Object} commandResult - Command result object
 * @param {Function} handleRedoWrapper - Function to handle redo operation
 * @param {Array} redoStack - Current redo stack
 */
export const handleRedoCommand = async (
  commandResult,
  handleRedoWrapper,
  redoStack
) => {
  try {
    // Get the number of steps to redo (default to 1)
    const steps = commandResult.steps || 1;

    // Perform redo operations for the specified number of steps
    for (let i = 0; i < steps; i++) {
      if (redoStack.length > 0) {
        await handleRedoWrapper();
      } else {
        break;
      }
    }

    if (redoStack.length === 0 && steps > 0) {
      Toast.show({
        type: "info",
        text1: "Cannot Redo",
        text2: "No more actions to redo",
        visibilityTime: 2000,
      });
    }
  } catch (error) {
    console.error("Error performing redo command:", error);
    Toast.show({
      type: "error",
      text1: "Redo Error",
      text2: "Failed to redo",
      visibilityTime: 2000,
    });
  }
};

export default {
  handleUndo,
  handleRedo,
  handleUndoCommand,
  handleRedoCommand,
};
