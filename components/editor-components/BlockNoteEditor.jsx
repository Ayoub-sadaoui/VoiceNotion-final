"use dom";

import React, {
  useEffect,
  forwardRef,
  useImperativeHandle,
  useState,
  useRef,
  useCallback,
} from "react";
import { BlockNoteView } from "@blocknote/mantine";
import "@blocknote/core/fonts/inter.css";
import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import "../editor.css";
import "../toolbar.css";
import "../keyboard-toolbar.css";
import { selectionDisablerScript } from "../selectionDisabler";

// Import our custom components
import * as ImagePicker from "expo-image-picker";
import { uploadImageAsync } from "../../services/supabase/storage";
import EditorToolbars from "./EditorToolbars";
import KeyboardToolbarWrapper from "./KeyboardToolbarWrapper";
import ConfirmDialog from "./ConfirmDialog";
import editorSchema from "./editorSchema";
import TranscriptionHandler from "./TranscriptionHandler";

// Dropdown fix style
const dropdownFixStyle = `
  /* Emergency fix for dropdown visibility */
  .bn-container [role="menu"],
  .bn-container [role="listbox"],
  .bn-container .bn-popover,
  .bn-container .bn-dropdown,
  .bn-container .bn-menu,
  .bn-container .bn-color-picker,
  .bn-container .bn-block-type-dropdown-menu {
    position: fixed !important;
    z-index: 99999 !important;
    visibility: visible !important;
    opacity: 1 !important;
    transform: none !important;
    max-height: none !important;
    overflow: visible !important;
    pointer-events: auto !important;
  }
`;

/**
 * Main editor component that uses BlockNote
 */
const BlockNoteEditor = forwardRef((props, ref) => {
  const {
    initialContent,
    theme = "light",
    onChange,
    onNavigateToPage,
    onCreateNestedPage,
    onDeletePage,
    keyboardHeight = 0,
    isKeyboardVisible = false,
    currentPageId,
    nestedPages = [],
    recentTranscription = null,
    getPageById,
  } = props;

  // Use a ref to track whether component is mounted
  const isMountedRef = useRef(false);
  const editorInstance = useRef(null);
  const editorContainerRef = useRef(null);
  const [contentInitialized, setContentInitialized] = useState(false);
  const [isStabilizing, setIsStabilizing] = useState(true); // New flag to prevent rapid changes

  // Stabilization period - prevent rapid changes for the first few seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsStabilizing(false);
      console.log("Editor stabilization period ended");
    }, 3000); // 3 second stabilization period

    return () => clearTimeout(timer);
  }, [currentPageId]);

  // State for dialog to create a new page
  const [showCreatePageDialog, setShowCreatePageDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pageToDelete, setPageToDelete] = useState(null);

  // Reset delete dialog state when component mounts or page changes
  useEffect(() => {
    setShowDeleteConfirm(false);
    setPageToDelete(null);
    console.log("Reset delete dialog state for page:", currentPageId);
  }, [currentPageId]);

  // Additional safety check to prevent unwanted delete dialogs
  useEffect(() => {
    if (showDeleteConfirm && !pageToDelete) {
      console.warn("Delete dialog is showing but no page to delete, resetting");
      setShowDeleteConfirm(false);
    }
  }, [showDeleteConfirm, pageToDelete]);

  const handleImageUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      alert("Sorry, we need camera roll permissions to make this work!");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images, // Reverted to formerly deprecated but stable API to fix crash
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return;
    }

    const image = result.assets[0];

    try {
      // Pass the entire image asset, not just the URI
      const publicUrl = await uploadImageAsync(image);

      if (publicUrl && editor) {
        const currentBlock = editor.getTextCursorPosition().block;
        editor.insertBlocks(
          [
            {
              type: "image",
              props: {
                url: publicUrl,
              },
            },
          ],
          currentBlock,
          "after"
        );
      }
    } catch (error) {
      console.error("Image upload failed:", error);
      alert("Image upload failed. Please try again.");
    }
  };

  // Apply theme class to document when theme changes
  useEffect(() => {
    // Add theme class to document body
    if (typeof document !== "undefined") {
      // Ensure theme is a string
      const themeString = typeof theme === "string" ? theme : "light";
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(`theme-${themeString}`);
    }
  }, [theme]);

  /**
   * Helper function to safely access the editor's internal storage
   *
   * @param {Object} editor - The BlockNote editor instance
   * @param {string} storageKey - The key to access in the editor's storage
   * @param {any} value - Optional value to set in the storage
   * @returns {any} The storage value if only getting, or true if setting was successful
   *
   * NOTE: This is using a private API (_tiptapEditor) which may change in future versions.
   * This wrapper isolates the implementation detail and should be updated if BlockNote
   * provides a public API for custom storage in the future.
   */
  const accessEditorStorage = (editor, storageKey, value = undefined) => {
    if (!editor || !storageKey) return null;

    try {
      // Check if the private API exists
      if (!editor._tiptapEditor || !editor._tiptapEditor.storage) {
        console.warn("Editor internal storage API not available");
        return null;
      }

      // Create storage namespace if it doesn't exist
      if (!editor._tiptapEditor.storage[storageKey]) {
        editor._tiptapEditor.storage[storageKey] = {};
      }

      // Set value if provided
      if (value !== undefined) {
        editor._tiptapEditor.storage[storageKey] = value;
        return true;
      }

      // Return the storage object
      return editor._tiptapEditor.storage[storageKey];
    } catch (error) {
      console.error(
        `Error accessing editor storage for key: ${storageKey}`,
        error
      );
      return null;
    }
  };

  // Creates a new editor instance with custom settings
  const editor = useCreateBlockNote({
    initialContent: initialContent || [
      {
        type: "heading",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
          level: 1,
        },
        content: [
          {
            type: "text",
            text: "start typing ",
            styles: {},
          },
        ],
        children: [],
      },
    ],
    // Enable debug logging for BlockNote
    enableDebugLogging: true,
    // Use our custom schema with the page link block
    schema: editorSchema,
    // Add safer defaults for editor
    domAttributes: {
      editor: {
        class: "blocknote-editor",
        style: "height: 100%; min-height: 150px; width: 100vw;  ",
      },
      block: {
        style: "margin: 0.5em 0;",
      },
    },
    // Configure history behavior to limit the changes that create undo/redo points
    _saveFullHistoryOnEveryChange: false, // Custom property to control history granularity
    tiptapOptions: {
      history: {
        // These options help determine when history points are created
        newGroupDelay: 1000, // Increase delay to group more changes together
      },
    },
    onError: (error) => {
      console.error("BlockNote editor error:", error);
    },
  });

  // Save the editor instance to ref so we can access it later
  editorInstance.current = editor;

  // Function to check for deleted page links and delete corresponding pages
  const checkForDeletedPageLinks = useCallback(() => {
    if (!editor || !nestedPages || nestedPages.length === 0 || isStabilizing)
      return;

    // Get all page link blocks currently in the editor
    const currentPageLinks = [];
    const allBlocks = editor.topLevelBlocks;

    // Collect all page link blocks
    allBlocks.forEach((block) => {
      if (block.type === "pageLink" && block.props?.pageId) {
        currentPageLinks.push(block.props.pageId);
      }
    });

    // Create a set of page IDs that currently exist in nestedPages for quick lookup
    const existingPageIds = new Set(nestedPages.map((page) => page.id));

    // Find page links in the editor that reference pages which no longer exist in nestedPages
    const deletedPageIds = currentPageLinks.filter(
      (pageId) => !existingPageIds.has(pageId)
    );

    // Delete these pages if any were found
    if (deletedPageIds.length > 0) {
      console.log("Detected deleted page link blocks:", deletedPageIds);
      deletedPageIds.forEach((pageId) => {
        if (onDeletePage) {
          console.log("Deleting page due to removed page link:", pageId);
          onDeletePage(pageId, false); // The 'false' flag indicates this is from block deletion
        }
      });
    }
  }, [editor, nestedPages, onDeletePage, isStabilizing]); // Add the change handler to the editor instance
  useEffect(() => {
    if (editor && onChange) {
      let lastChangeTime = 0;
      let changeCount = 0;
      const throttleDelay = 300; // Increased throttle delay to reduce firing frequency
      let lastContentHash = "";
      let lastBlockCount = editor.topLevelBlocks
        ? editor.topLevelBlocks.length
        : 0;
      let lastBlockIds = editor.topLevelBlocks
        ? editor.topLevelBlocks.map((b) => b.id).join(",")
        : "";

      // Store reference to the original undo/redo methods
      const originalUndo = editor.undo;
      const originalRedo = editor.redo;

      // Override the undo/redo methods to ensure they always work properly
      editor.undo = (...args) => {
        console.log("Custom undo called");
        return originalUndo.apply(editor, args);
      };

      editor.redo = (...args) => {
        console.log("Custom redo called");
        return originalRedo.apply(editor, args);
      };

      // Set up the change handler on the editor instance
      const unsubscribe = editor.onChange(() => {
        // Skip all changes during stabilization period
        if (isStabilizing) {
          console.log("Skipping change during stabilization period");
          return;
        }

        const now = Date.now();
        changeCount++;

        // If too many changes in a short time, skip to prevent infinite loops
        if (changeCount > 5) {
          console.warn("Too many rapid changes detected, throttling heavily");
          setTimeout(() => {
            changeCount = 0;
          }, 2000);
          return;
        }

        if (now - lastChangeTime < throttleDelay) {
          return; // Skip this change if it's too soon after the last one
        }
        lastChangeTime = now;

        // Get current blocks
        const currentBlocks = editor.topLevelBlocks;

        // Check if blocks were added or removed (structure change)
        const currentBlockCount = currentBlocks.length;
        const currentBlockIds = currentBlocks.map((b) => b.id).join(",");
        const blocksChangedStructurally =
          currentBlockCount !== lastBlockCount ||
          currentBlockIds !== lastBlockIds;

        // Update block tracking for next comparison
        lastBlockCount = currentBlockCount;
        lastBlockIds = currentBlockIds;

        // Create a simple hash to detect if content actually changed
        const contentHash = JSON.stringify(
          currentBlocks.map((block) => ({
            type: block.type,
            content: block.content,
            props: block.props,
          }))
        );

        // Only process if content actually changed
        if (contentHash === lastContentHash) {
          return;
        }

        // If this is a structural change (block added/removed/moved), mark it
        // to ensure the history point is saved properly
        if (blocksChangedStructurally) {
          console.log(
            "Block structure changed - ensuring history point is saved"
          );
          // We let the history point be saved by not returning early
        } else if (!editor._saveFullHistoryOnEveryChange) {
          // For non-structural changes (just typing in a block), we don't want
          // to create history points if the editor config doesn't require it
          // This check prevents undo/redo for every keystroke
          console.log("Text-only change detected - not creating history point");
        }

        lastContentHash = contentHash;

        // Only process blocks if there are meaningful changes
        const processedBlocks = [...currentBlocks];

        // Only remove empty blocks if we have more than 2 blocks and the user isn't actively typing
        if (processedBlocks.length > 2) {
          const lastBlock = processedBlocks[processedBlocks.length - 1];

          // Check if it's an empty paragraph that's auto-generated
          if (
            lastBlock.type === "paragraph" &&
            (!lastBlock.content ||
              !lastBlock.content.length ||
              (lastBlock.content.length === 1 &&
                lastBlock.content[0].type === "text" &&
                !lastBlock.content[0].text.trim()))
          ) {
            // Only remove if it's clearly auto-generated (not user-created)
            if (!lastBlock.id.includes("user-created")) {
              processedBlocks.pop();
              console.log("Removed automatically added empty block at the end");
            }
          }
        }

        // Reset change count after successful processing
        changeCount = Math.max(0, changeCount - 1);

        // Check for deleted page links (but only occasionally to avoid performance issues)
        if (contentInitialized && !isStabilizing && Math.random() < 0.3) {
          // Only check 30% of the time to avoid excessive checking
          setTimeout(() => {
            checkForDeletedPageLinks();
          }, 500); // Small delay to avoid immediate triggering
        }

        // Call the onChange handler with the processed content
        onChange(processedBlocks);
      });

      // Cleanup when component unmounts
      return () => {
        unsubscribe();
      };
    }
  }, [
    editor,
    onChange,
    isStabilizing,
    contentInitialized,
    checkForDeletedPageLinks,
  ]);

  // Effect to sync editor with external content changes - DISABLED to prevent infinite loops
  // This was causing infinite loops with page link insertion and auto-save
  /*
  useEffect(() => {
    // Only run on updates, not on initial mount, by checking contentInitialized
    // Also prevent syncing if we're currently adding page links
    if (
      contentInitialized &&
      editor &&
      initialContent &&
      Array.isArray(initialContent)
    ) {
      const currentBlocks = editor.topLevelBlocks;

      // Don't sync if the content is essentially the same (ignoring minor changes)
      const currentContentStr = JSON.stringify(currentBlocks);
      const initialContentStr = JSON.stringify(initialContent);

      if (currentContentStr !== initialContentStr) {
        console.log("Syncing editor content with external changes");
        try {
          editor.replaceBlocks(currentBlocks, initialContent);
        } catch (error) {
          console.error("Error syncing editor content:", error);
        }
      }
    }
  }, [initialContent, editor, contentInitialized]);
  */

  // Store the navigation callback and getPageById function in the editor's storage
  useEffect(() => {
    if (editor) {
      // Use the wrapper function to safely access editor storage
      const pageLinkStorage = accessEditorStorage(editor, "pageLink") || {};

      // Always store the navigation function, even if undefined
      pageLinkStorage.onNavigateToPage = onNavigateToPage || null;

      // Create a fallback getPageById function that uses nestedPages if the prop function is not available
      const fallbackGetPageById = (pageId) => {
        console.log(`Fallback getPageById called for: ${pageId}`);
        if (getPageById) {
          console.log("Using provided getPageById function");
          return getPageById(pageId);
        }
        // Fallback to searching in nestedPages
        console.log("Using nestedPages fallback search");
        const foundPage = nestedPages.find(
          (page) => page && page.id === pageId
        );
        console.log(
          `Found page in nestedPages:`,
          foundPage ? foundPage.title : "not found"
        );
        return foundPage || null;
      };

      // Always store getPageById function, even if undefined
      // Add debugging to ensure getPageById is correct
      console.log("Setting getPageById function:", !!getPageById);
      console.log("Available nestedPages count:", nestedPages.length);
      pageLinkStorage.getPageById = fallbackGetPageById;

      // Store the functions in editor storage
      accessEditorStorage(editor, "pageLink", pageLinkStorage);
      console.log(
        "Updated pageLink storage with fallback getPageById function"
      );
    }
  }, [editor, onNavigateToPage, getPageById, nestedPages]);

  // Effect to sync page link blocks with nested pages (comprehensive synchronization)
  useEffect(() => {
    if (!editor || isStabilizing) return;

    // Reduce delay for more responsive updates
    const timeoutId = setTimeout(() => {
      console.log(
        `Page links comprehensive sync - ${
          nestedPages ? nestedPages.length : 0
        } nested pages available, contentInitialized: ${contentInitialized}`
      );

      // Console.log the getPageById function to debug
      const getPageByIdFunc =
        editor._tiptapEditor?.storage?.pageLink?.getPageById;
      console.log("Current getPageById function available:", !!getPageByIdFunc);

      if (editor.topLevelBlocks) {
        console.log("Performing comprehensive page links synchronization...");

        // Get all existing page link blocks
        const existingPageLinkBlocks = [];
        const blocksToUpdate = [];
        const blocksToRemove = [];

        editor.topLevelBlocks.forEach((block, index) => {
          if (block.type === "pageLink" && block.props?.pageId) {
            existingPageLinkBlocks.push({
              block,
              index,
              pageId: block.props.pageId,
              currentTitle: block.props.pageTitle,
              currentIcon: block.props.pageIcon,
            });
          }
        });

        // Create a map of current nested pages for quick lookup
        const nestedPagesMap = new Map();
        if (nestedPages && Array.isArray(nestedPages)) {
          nestedPages.forEach((page) => {
            // Only add pages that have an id
            if (page && page.id) {
              nestedPagesMap.set(page.id, page);
            } else {
              console.warn("Skipping nested page with missing ID:", page);
            }
          });
        }

        // Check existing page link blocks and update them
        existingPageLinkBlocks.forEach((linkInfo) => {
          let correspondingPage = nestedPagesMap.get(linkInfo.pageId);

          // If not found in nestedPages, try using getPageById function
          if (!correspondingPage && getPageByIdFunc) {
            try {
              correspondingPage = getPageByIdFunc(linkInfo.pageId);
              console.log(
                `Retrieved page via getPageById for ${linkInfo.pageId}:`,
                correspondingPage?.title
              );
            } catch (error) {
              console.warn("Error calling getPageById:", error);
            }
          }

          if (!correspondingPage) {
            // Page no longer exists - mark for removal
            blocksToRemove.push(linkInfo.block);
            console.log(
              `Marking page link for removal: ${linkInfo.pageId} (page deleted)`
            );
          } else if (
            linkInfo.currentTitle !== correspondingPage.title ||
            linkInfo.currentIcon !== correspondingPage.icon
          ) {
            // Page exists but title/icon changed - mark for update
            blocksToUpdate.push({
              block: linkInfo.block,
              newTitle: correspondingPage.title || "Untitled Page",
              newIcon: correspondingPage.icon || "📄",
              pageId: linkInfo.pageId,
            });
            console.log(
              `Marking page link for update: ${linkInfo.pageId} (title: "${linkInfo.currentTitle}" -> "${correspondingPage.title}")`
            );
          }
        });

        // Find pages that don't have corresponding page link blocks (new pages)
        const existingPageLinkIds = existingPageLinkBlocks.map(
          (link) => link.pageId
        );
        const missingPageLinks =
          nestedPages && Array.isArray(nestedPages)
            ? nestedPages.filter(
                (page) =>
                  page && page.id && !existingPageLinkIds.includes(page.id)
              )
            : [];

        // Execute the synchronization operations with retry logic
        const maxAttempts = 3;

        // Function to execute an editor operation with retries
        const executeWithRetry = (operation, opName, attempts = 0) => {
          if (attempts >= maxAttempts) {
            console.warn(`Max retry attempts reached for ${opName}`);
            return false;
          }

          try {
            operation();
            return true;
          } catch (error) {
            console.error(
              `Error during ${opName} (attempt ${attempts + 1}):`,
              error
            );
            setTimeout(() => {
              executeWithRetry(operation, opName, attempts + 1);
            }, 100 * Math.pow(2, attempts));
            return false;
          }
        };

        try {
          // 1. Remove deleted page links
          if (blocksToRemove.length > 0) {
            console.log(
              `Removing ${blocksToRemove.length} deleted page link blocks`
            );
            blocksToRemove.forEach((block) => {
              executeWithRetry(() => {
                editor.removeBlocks([block]);
              }, `removing page link block ${block.props?.pageId || "unknown"}`);
            });
          }

          // 2. Update existing page links with new titles/icons
          if (blocksToUpdate.length > 0) {
            console.log(`Updating ${blocksToUpdate.length} page link blocks`);
            blocksToUpdate.forEach((updateInfo) => {
              executeWithRetry(() => {
                editor.updateBlock(updateInfo.block, {
                  type: "pageLink",
                  props: {
                    pageId: updateInfo.block.props.pageId,
                    pageTitle: updateInfo.newTitle,
                    pageIcon: updateInfo.newIcon,
                  },
                });

                // Also dispatch a page update event for immediate propagation
                if (typeof window !== "undefined") {
                  try {
                    const event = new CustomEvent("pageUpdated", {
                      detail: {
                        pageId: updateInfo.pageId,
                        title: updateInfo.newTitle,
                        icon: updateInfo.newIcon,
                      },
                    });
                    window.dispatchEvent(event);
                  } catch (eventError) {
                    console.warn(
                      "Error dispatching page update event:",
                      eventError
                    );
                  }
                }
              }, `updating page link block ${updateInfo.block.props?.pageId || "unknown"}`);
            });
          }

          // 3. Add missing page link blocks for new pages
          if (missingPageLinks.length > 0) {
            console.log(
              `Adding ${missingPageLinks.length} new page link blocks`
            );

            executeWithRetry(() => {
              const lastBlock =
                editor.topLevelBlocks.length > 0
                  ? editor.topLevelBlocks[editor.topLevelBlocks.length - 1]
                  : null;

              const newBlocks = missingPageLinks.map((page) => ({
                type: "pageLink",
                props: {
                  pageId: page.id,
                  pageTitle: page.title || "Untitled Page",
                  pageIcon: page.icon || "📄",
                },
              }));

              if (lastBlock) {
                editor.insertBlocks(newBlocks, lastBlock, "after");
              } else {
                editor.insertBlocks(newBlocks, null, "firstChild");
              }
            }, "adding new page link blocks");
          }

          console.log("Page links synchronization completed successfully");
        } catch (error) {
          console.error("Error during page links synchronization:", error);
        }

        // Only set content initialized on the first run to track initial load
        if (!contentInitialized) {
          setContentInitialized(true);
          console.log("Content initialization completed");
        }
      } else if (
        !contentInitialized &&
        (!nestedPages || nestedPages.length === 0)
      ) {
        // If there are no nested pages, still mark as initialized
        setContentInitialized(true);
        console.log("Content initialization completed (no nested pages)");
      }
    }, 200); // Reduced delay for more responsive updates

    return () => clearTimeout(timeoutId);
  }, [editor, nestedPages, contentInitialized, isStabilizing, getPageById]); // Added getPageById to dependencies to trigger updates when it changes

  // Handle creating a new page link from toolbar button
  const handleCreatePageLink = () => {
    console.log("=== Add page button clicked ===");

    // First check if we have the callback to create pages
    if (onCreateNestedPage) {
      console.log("onCreateNestedPage callback available, proceeding...");

      // Create a temporary title for the new page
      const mockPageTitle = "New Linked Page";
      const mockPageIcon = "📄";

      console.log("Creating new nested page with title:", mockPageTitle);

      // Call the parent component's function to create the actual page
      onCreateNestedPage(mockPageTitle, mockPageIcon)
        .then((newPage) => {
          console.log("Page creation result:", newPage);

          if (newPage && newPage.id) {
            console.log("Successfully created page:", newPage.title);

            // Manually insert the page link block with retry mechanism
            const maxAttempts = 3;

            const attemptInsert = (attempt = 0) => {
              try {
                console.log(
                  `Manually inserting page link block for: ${
                    newPage.id
                  } (attempt ${attempt + 1})`
                );

                // Find the last block to insert after
                const blocks = editor.topLevelBlocks;
                const lastBlock =
                  blocks.length > 0 ? blocks[blocks.length - 1] : null;

                // Create a new page link block
                const pageLinkBlock = {
                  type: "pageLink",
                  props: {
                    pageId: newPage.id,
                    pageTitle: newPage.title || "Untitled Page",
                    pageIcon: newPage.icon || "📄",
                  },
                };

                // Insert the block
                if (lastBlock) {
                  editor.insertBlocks([pageLinkBlock], lastBlock, "after");
                } else {
                  editor.insertBlocks([pageLinkBlock], null, "firstChild");
                }

                console.log(
                  "Page link block inserted successfully for:",
                  newPage.id
                );

                // Ensure the block is visible - scroll to it
                setTimeout(() => {
                  if (editorContainerRef.current) {
                    const editorElement =
                      editorContainerRef.current.querySelector(
                        ".blocknote-editor"
                      );
                    if (editorElement) {
                      editorElement.scrollTo({
                        top: editorElement.scrollHeight,
                        behavior: "smooth",
                      });
                    }
                  }
                }, 100);

                // Also dispatch a page creation/update event so other components are aware
                if (typeof window !== "undefined") {
                  try {
                    // Use the cross-platform event dispatcher from PageManager if available
                    if (
                      typeof window.PageManager !== "undefined" &&
                      typeof window.PageManager.dispatchPageUpdateEvent ===
                        "function"
                    ) {
                      window.PageManager.dispatchPageUpdateEvent(newPage);
                    } else {
                      // Fallback to basic event dispatch
                      const event = new CustomEvent("pageUpdated", {
                        detail: {
                          pageId: newPage.id,
                          title: newPage.title || "Untitled Page",
                          icon: newPage.icon || "📄",
                        },
                      });
                      window.dispatchEvent(event);
                      document.dispatchEvent(event);
                    }
                  } catch (eventError) {
                    console.warn(
                      "Error dispatching page update event:",
                      eventError
                    );
                  }
                }

                return true;
              } catch (insertError) {
                console.error(
                  `Error inserting page link block (attempt ${attempt + 1}):`,
                  insertError
                );

                if (attempt < maxAttempts - 1) {
                  console.log(
                    `Retrying insertion in ${100 * Math.pow(2, attempt)}ms`
                  );
                  setTimeout(
                    () => attemptInsert(attempt + 1),
                    100 * Math.pow(2, attempt)
                  );
                } else {
                  console.log(
                    "Falling back to automatic sync via nestedPages effect"
                  );

                  // Force a refresh of nestedPages via the effect
                  if (onCreateNestedPage) {
                    setForceRefresh((prev) => prev + 1);
                  }
                }
                return false;
              }
            };

            // Start the insertion attempt
            attemptInsert();
          } else {
            console.warn("Created page is invalid or missing ID:", newPage);
          }
        })
        .catch((error) => {
          console.error("Failed to create nested page:", error);
          // Insert error message as text
          try {
            const blocks = editor.topLevelBlocks;
            const lastBlock =
              blocks.length > 0 ? blocks[blocks.length - 1] : null;

            if (lastBlock) {
              editor.insertBlocks(
                [
                  {
                    type: "paragraph",
                    props: { textAlignment: "left" },
                    content: [
                      {
                        type: "text",
                        text: "[Could not create page]",
                        styles: { textColor: "red" },
                      },
                    ],
                  },
                ],
                lastBlock,
                "after"
              );
            }
          } catch (err) {
            console.error("Error inserting error message:", err);
          }
        });
    } else {
      console.warn("onCreateNestedPage callback not provided");
    }
  };

  // Handle deleting the current page
  const handleDeleteCurrentPage = () => {
    console.log("=== handleDeleteCurrentPage called ===");
    console.log("pageToDelete:", pageToDelete);
    console.log("onDeletePage callback:", !!onDeletePage);

    if (onDeletePage && pageToDelete) {
      console.log("Executing delete for page:", pageToDelete);
      onDeletePage(pageToDelete, true); // The 'true' flag indicates this is a user-initiated deletion
    } else {
      console.warn("Cannot execute delete - missing callback or pageToDelete", {
        hasCallback: !!onDeletePage,
        pageToDelete: pageToDelete,
      });
    }

    // Always reset the dialog state
    setShowDeleteConfirm(false);
    setPageToDelete(null);
    console.log("Delete dialog state reset");
  };

  // Effect to disable text selection handling on iOS
  useEffect(() => {
    isMountedRef.current = true;

    // Add the script to disable selection handling
    const script = document.createElement("script");
    script.textContent = selectionDisablerScript;
    document.head.appendChild(script);

    return () => {
      isMountedRef.current = false;
      document.head.removeChild(script);
    };
  }, []);

  // Handle recentTranscription changes
  useEffect(() => {
    if (recentTranscription && editor && editorContainerRef.current) {
      console.log("BlockNoteEditor: New transcription detected, updating UI");

      // Ensure the editor is focused and visible
      try {
        // First focus the editor
        editor.focus();

        // Then scroll to the bottom after a short delay to ensure DOM is updated
        setTimeout(() => {
          try {
            // Access the editor element through our ref
            const editorElement =
              editorContainerRef.current.querySelector(".blocknote-editor");
            if (editorElement) {
              // Scroll to bottom with animation
              editorElement.scrollTo({
                top: editorElement.scrollHeight,
                behavior: "smooth",
              });
              console.log("Scrolled editor to latest content");

              // Find the last paragraph for highlighting
              const lastBlock =
                editor.topLevelBlocks[editor.topLevelBlocks.length - 1];
              if (lastBlock && lastBlock.id) {
                // Try to find the DOM element by blockId which is more reliable
                const blockElement = editorContainerRef.current.querySelector(
                  `[data-id="${lastBlock.id}"]`
                );
                if (blockElement) {
                  // Add a temporary highlight class
                  blockElement.classList.add("highlight-new-content");
                  // Remove it after animation completes
                  setTimeout(() => {
                    blockElement.classList.remove("highlight-new-content");
                  }, 2000);
                }
              }
            }
          } catch (scrollError) {
            console.error("Error scrolling editor:", scrollError);
          }
        }, 200);
      } catch (error) {
        console.error("Error updating UI after transcription:", error);
      }
    }
  }, [recentTranscription, editor]);

  // Handle incoming command messages for voice commands
  const handleVoiceCommand = useCallback(
    (command) => {
      try {
        if (!command || !command.type) {
          console.error("Invalid command received:", command);
          return { success: false, error: "Invalid command" };
        }

        console.log("BlockNoteEditor: Handling voice command:", command.type);

        switch (command.type) {
          case "FORMATTING":
            // Apply formatting to selected text
            if (
              command.formatType &&
              TranscriptionHandler.FORMAT_TYPES[
                command.formatType.toUpperCase()
              ]
            ) {
              return TranscriptionHandler.applyFormatting(
                editor,
                TranscriptionHandler.FORMAT_TYPES[
                  command.formatType.toUpperCase()
                ]
              );
            }
            return false;

          case "SELECTION":
            // Handle text selection
            if (
              command.blockId &&
              command.startOffset !== undefined &&
              command.endOffset !== undefined
            ) {
              return TranscriptionHandler.selectText(
                editor,
                command.blockId,
                command.startOffset,
                command.endOffset
              );
            }
            return false;

          case "REPLACE_TEXT":
            // Handle text replacement
            if (command.findText && command.replaceWith !== undefined) {
              return TranscriptionHandler.replaceText(
                editor,
                command.findText,
                command.replaceWith,
                command.targetBlockIds
              );
            }
            return false;

          case "BLOCK_MODIFICATION":
            // Handle block type changes
            if (
              command.modificationType === "CHANGE_TYPE" &&
              command.blockId &&
              command.newType
            ) {
              return TranscriptionHandler.changeBlockType(
                editor,
                command.blockId,
                command.newType,
                command.props || {}
              );
            }
            return false;

          case "UNDO":
            // Handle undo operation
            return TranscriptionHandler.undo(editor, command.steps || 1);

          case "REDO":
            // Handle redo operation
            return TranscriptionHandler.redo(editor, command.steps || 1);

          default:
            console.warn(`Unknown command type: ${command.type}`);
            return false;
        }
      } catch (error) {
        console.error("Error handling voice command:", error);
        return false;
      }
    },
    [editor]
  );

  // Expose methods to the parent component
  useImperativeHandle(
    ref,
    () => {
      // Create the return object with all the methods we want to expose
      return {
        // Function to get the editor content
        getContent: () => {
          if (editor) {
            return editor.topLevelBlocks;
          }
          return null;
        },

        // Function to set the editor content
        setContent: (content) => {
          if (editor && content) {
            editor.replaceBlocks(
              editor.document?.map((block) => block.id) || [],
              content
            );
            return true;
          }
          return false;
        },

        // Function to get the currently selected/focused block ID
        getCurrentBlockId: () => {
          if (editor) {
            try {
              console.log("Getting current block ID from editor");

              // Use the TranscriptionHandler's getCurrentBlock function
              const currentBlock = TranscriptionHandler.getCurrentBlock(editor);
              if (currentBlock && currentBlock.id) {
                console.log(`Found current block with ID: ${currentBlock.id}`);
                return currentBlock.id;
              }

              // If TranscriptionHandler method fails, fall back to previous implementation
              // Try to get the current selection
              const selection = editor.getSelection();

              if (selection && selection.anchor && selection.anchor.blockId) {
                console.log(
                  `Current selection in block: ${selection.anchor.blockId}`
                );
                return selection.anchor.blockId;
              }

              // If no selection, try to get the focused block from TipTap editor state
              if (editor._tiptapEditor && editor._tiptapEditor.state) {
                const { state } = editor._tiptapEditor;

                // Check if there's a selection
                if (state.selection) {
                  // Get the block node at the current selection
                  const $anchor = state.selection.$anchor;
                  if ($anchor) {
                    // Try to find the closest block node
                    let depth = $anchor.depth;
                    while (depth > 0) {
                      const node = $anchor.node(depth);
                      if (node && node.attrs && node.attrs.id) {
                        console.log(
                          `Found block at depth ${depth} with ID: ${node.attrs.id}`
                        );
                        return node.attrs.id;
                      }
                      depth--;
                    }

                    // If we get here, try the direct node
                    const node = $anchor.node();
                    if (node && node.attrs && node.attrs.id) {
                      console.log(`Direct node has ID: ${node.attrs.id}`);
                      return node.attrs.id;
                    }
                  }
                }

                // Try to get the document's last node as fallback
                const lastNode = state.doc.lastChild;
                if (lastNode && lastNode.attrs && lastNode.attrs.id) {
                  console.log(
                    `Using last node ID as fallback: ${lastNode.attrs.id}`
                  );
                  return lastNode.attrs.id;
                }
              }

              // If all else fails, try to get the last block from BlockNote API
              const blocks = editor.topLevelBlocks;
              if (blocks && blocks.length > 0) {
                const lastBlock = blocks[blocks.length - 1];
                console.log(
                  `Using last block ID from API as fallback: ${lastBlock.id}`
                );
                return lastBlock.id;
              }

              console.warn("Could not determine current block ID");
            } catch (error) {
              console.error("Error getting current block ID:", error);
            }
          }
          return null;
        },

        // Function to insert a page link block
        insertPageLink: (pageId, pageTitle, pageIcon) => {
          return TranscriptionHandler.insertPageLinkBlock(
            editor,
            pageId,
            pageTitle,
            pageIcon
          );
        },

        // Function to delete the current page
        deleteCurrentPage: () => {
          console.log("=== deleteCurrentPage called ===");
          console.log("onDeletePage callback:", !!onDeletePage);
          console.log("currentPageId:", currentPageId);

          if (onDeletePage && currentPageId) {
            console.log(
              "Setting up delete confirmation for page:",
              currentPageId
            );
            setPageToDelete(currentPageId);
            setShowDeleteConfirm(true);
          } else {
            console.warn("Cannot delete page - missing callback or pageId", {
              hasCallback: !!onDeletePage,
              pageId: currentPageId,
            });
          }
        },

        // Function to insert transcribed text - DEPRECATED
        // Use direct AsyncStorage approach in note/[id].jsx via insertTranscriptionDirectly() instead
        insertTranscribedText: (text) => {
          console.warn(
            "BlockNoteEditor.insertTranscribedText is deprecated. Use direct AsyncStorage approach instead via insertTranscriptionDirectly."
          );
          return false;
        },

        // Provide direct access to the editor
        getEditor: () => {
          return editor;
        },

        // Remove page links by ID
        removePageLinksById: (pageId) => {
          if (!editor || !pageId) {
            return false;
          }

          try {
            // Get all blocks from the document
            const blocks = editor.document || [];
            const pageLinkBlocks = [];

            // Find all page link blocks for the given pageId
            const findPageLinks = (block) => {
              if (block.type === "pageLink" && block.props?.pageId === pageId) {
                pageLinkBlocks.push(block.id);
              }

              if (block.children && Array.isArray(block.children)) {
                block.children.forEach(findPageLinks);
              }
            };

            // Search for links
            blocks.forEach(findPageLinks);

            // If we found any links, delete them
            if (pageLinkBlocks.length > 0) {
              console.log(
                `Removing ${pageLinkBlocks.length} links to page ${pageId}`
              );
              pageLinkBlocks.forEach((blockId) => {
                editor.removeBlocks([blockId]);
              });
              return true;
            } else {
              return false;
            }
          } catch (error) {
            console.error("Error removing page links:", error);
            return false;
          }
        },

        focusEditor: () => {
          console.log("BlockNoteEditor: Attempting to focus editor");
          if (editor) {
            try {
              // Focus the editor
              editor.focus();

              // Scroll to bottom for newly added content
              try {
                const editorElement =
                  editorContainerRef.current?.querySelector(
                    ".blocknote-editor"
                  );
                if (editorElement) {
                  editorElement.scrollTop = editorElement.scrollHeight;
                  console.log("Scrolled editor to bottom");
                }
              } catch (scrollError) {
                console.error("Error scrolling editor:", scrollError);
              }

              return true;
            } catch (error) {
              console.error("Error focusing editor:", error);
              return false;
            }
          }
          return false;
        },

        // New methods for voice commands

        // Execute a command for voice interaction
        executeVoiceCommand: (command) => {
          return handleVoiceCommand(command);
        },

        // Find text in the editor content
        findText: (searchText) => {
          if (!editor || !searchText) {
            return [];
          }
          return TranscriptionHandler.findTextInBlocks(editor, searchText);
        },

        // Apply formatting to selected text
        applyFormatting: (formatType) => {
          if (!editor || !formatType) {
            return false;
          }
          return TranscriptionHandler.applyFormatting(editor, formatType);
        },

        // Perform undo operation
        undo: (steps = 1) => {
          if (!editor) {
            return false;
          }
          return TranscriptionHandler.undo(editor, steps);
        },

        // Perform redo operation
        redo: (steps = 1) => {
          if (!editor) {
            return false;
          }
          return TranscriptionHandler.redo(editor, steps);
        },
      };
    },
    [
      editor,
      nestedPages,
      onDeletePage,
      onCreateNestedPage,
      onNavigateToPage,
      handleVoiceCommand,
    ]
  );

  // Renders the editor instance using a React component
  return (
    <div className="editor-container">
      <style dangerouslySetInnerHTML={{ __html: dropdownFixStyle }} />
      <div
        ref={editorContainerRef}
        style={{
          height: "100%",
          width: "100%",
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
          position: "relative",
          display: "flex",
          flexDirection: "column",
        }}
        className={`editor-scroll-container theme-${
          typeof theme === "string" ? theme : "light"
        }`}
      >
        <BlockNoteView
          editor={editor}
          editable={true}
          sideMenu={false}
          slashMenu={true}
          theme={theme}
          onChange={() => {
            // Call the onChange handler provided by the native side
            if (onChange) {
              onChange(editor.topLevelBlocks);
            }
          }}
          formattingToolbar={false}
          domAttributes={{
            editor: {
              class: `blocknote-editor custom-editor theme-${
                typeof theme === "string" ? theme : "light"
              }`,
              style:
                "height: 100%; min-height: 150px; width: 100%; user-select: text; -webkit-touch-callout: none;",
            },
            block: {
              style: "margin: 0.5em 0;",
            },
          }}
        >
          <EditorToolbars />
        </BlockNoteView>

        <KeyboardToolbarWrapper
          editor={editor}
          onCreatePageLink={handleCreatePageLink}
          onUploadImage={handleImageUpload}
          keyboardHeight={keyboardHeight}
          isKeyboardVisible={isKeyboardVisible}
          theme={typeof theme === "string" ? theme : "light"}
        />

        <ConfirmDialog
          show={showDeleteConfirm}
          title="Delete Page"
          message="Are you sure you want to delete this page? This action cannot be undone."
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleDeleteCurrentPage}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      </div>
    </div>
  );
});

export default BlockNoteEditor;
