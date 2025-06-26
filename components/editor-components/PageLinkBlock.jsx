"use dom";

import React, { useState, useEffect } from "react";
import { createReactBlockSpec } from "@blocknote/react";

// Dynamic Page Link Component that fetches current page data
const DynamicPageLinkContent = ({
  pageId,
  editor,
  initialTitle,
  initialIcon,
}) => {
  const [pageTitle, setPageTitle] = useState(initialTitle || "Untitled Page");
  const [pageIcon, setPageIcon] = useState(initialIcon || "📄");
  const [isLoading, setIsLoading] = useState(false);

  // Function to fetch current page data
  const fetchPageData = async () => {
    if (!pageId || !editor) return;

    try {
      setIsLoading(true);

      // Try to get the page data from the editor's storage
      const storage = editor._tiptapEditor?.storage;
      const getPageByIdFunc = storage?.pageLink?.getPageById;

      // Debug the storage to help diagnose issues
      if (!storage?.pageLink) {
        console.warn(
          `Page link storage not found in editor (pageId: ${pageId})`
        );
      } else if (!getPageByIdFunc) {
        console.warn(
          `getPageById function not available in editor storage (storage exists: ${!!storage?.pageLink})`
        );
      }

      if (getPageByIdFunc && typeof getPageByIdFunc === "function") {
        console.log(`Fetching page data for page link: ${pageId}`);

        try {
          const pageData = await getPageByIdFunc(pageId);

          if (pageData) {
            console.log(
              `Updating page link: ${pageId} -> "${pageData.title}" (icon: ${
                pageData.icon || "📄"
              })`
            );

            // Check if title or icon actually changed before updating
            const titleChanged = pageTitle !== pageData.title && pageData.title;
            const iconChanged = pageIcon !== pageData.icon && pageData.icon;

            // Update the UI only if there are changes
            if (titleChanged) {
              setPageTitle(pageData.title || "Untitled Page");
            }

            if (iconChanged) {
              setPageIcon(pageData.icon || "📄");
            }

            // Update the editor block if title or icon changed
            if ((titleChanged || iconChanged) && editor) {
              // Updated approach with retries
              const maxAttempts = 3;

              const attemptUpdate = (attempt = 0) => {
                if (attempt >= maxAttempts) return;

                try {
                  // Find the block in the editor
                  const blocks = editor.topLevelBlocks;
                  const blockToUpdate = blocks.find(
                    (block) =>
                      block.type === "pageLink" &&
                      block.props?.pageId === pageId
                  );

                  if (blockToUpdate) {
                    // Check if the props already match to avoid unnecessary updates
                    const currentTitle = blockToUpdate.props.pageTitle;
                    const currentIcon = blockToUpdate.props.pageIcon;
                    const newTitle = pageData.title || "Untitled Page";
                    const newIcon = pageData.icon || "📄";

                    if (currentTitle !== newTitle || currentIcon !== newIcon) {
                      // Update the block to ensure proper rendering
                      editor.updateBlock(blockToUpdate, {
                        type: "pageLink",
                        props: {
                          pageId: pageId,
                          pageTitle: newTitle,
                          pageIcon: newIcon,
                        },
                      });
                      console.log(
                        `Updated editor block for page ${pageId} with new title/icon`
                      );
                    }
                  } else if (attempt < maxAttempts - 1) {
                    // If block not found and we have attempts left, try again with backoff
                    setTimeout(
                      () => attemptUpdate(attempt + 1),
                      100 * Math.pow(2, attempt)
                    );
                  }
                } catch (updateErr) {
                  console.error(
                    `Error updating editor block (attempt ${attempt + 1}):`,
                    updateErr
                  );
                  if (attempt < maxAttempts - 1) {
                    setTimeout(
                      () => attemptUpdate(attempt + 1),
                      100 * Math.pow(2, attempt)
                    );
                  }
                }
              };

              // Start update attempts
              attemptUpdate();
            }
          } else {
            console.warn(
              `No page data found for page: ${pageId}, marking as not found`
            );
            setPageTitle("Page Not Found");
            setPageIcon("❌");
          }
        } catch (innerError) {
          console.error(
            `Error in getPageById function for page ${pageId}:`,
            innerError
          );
          setPageTitle("Error Loading Page");
          setPageIcon("⚠️");
        }
      } else {
        // Keep the initial values if function is not available
        console.log(
          `Using initial values for page link ${pageId}: "${initialTitle}" (${initialIcon})`
        );
        setPageTitle(initialTitle || "Untitled Page");
        setPageIcon(initialIcon || "📄");
      }
    } catch (error) {
      console.error("Error fetching page data for page link:", error);
      setPageTitle("Error Loading Page");
      setPageIcon("⚠️");
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch only – rely on pageUpdated/pageDeleted events for later changes
  useEffect(() => {
    fetchPageData();
  }, [pageId, initialTitle, initialIcon]);

  // Re-fetch when the component re-renders with new initialTitle or initialIcon
  useEffect(() => {
    if (initialTitle !== pageTitle || initialIcon !== pageIcon) {
      console.log(`PageLink detected prop changes for page ${pageId}:`, {
        oldTitle: pageTitle,
        newTitle: initialTitle,
        oldIcon: pageIcon,
        newIcon: initialIcon,
      });
      setPageTitle(initialTitle || "Untitled Page");
      setPageIcon(initialIcon || "📄");
    }
  }, [initialTitle, initialIcon, pageId]);

  // Listen for page updates via custom events
  useEffect(() => {
    const handlePageUpdate = (event) => {
      try {
        // Handle both web (CustomEvent) and React Native (basic event) scenarios
        const detail = event.detail || {};
        if (detail.pageId === pageId) {
          console.log(
            `Page link received update event for page: ${pageId} - title: "${detail.title}", icon: ${detail.icon}`
          );

          // Track if we need to update the editor block
          let needsEditorUpdate = false;

          // Update the UI if values have changed
          if (detail.title && detail.title !== pageTitle) {
            setPageTitle(detail.title);
            needsEditorUpdate = true;
          }

          if (detail.icon && detail.icon !== pageIcon) {
            setPageIcon(detail.icon);
            needsEditorUpdate = true;
          }

          // Force refresh of the editor block to ensure it's updated in the model
          if (needsEditorUpdate && editor) {
            // Try multiple times with exponential backoff to ensure the update happens
            const maxAttempts = 3;

            const attemptUpdate = (attempt = 0) => {
              if (attempt >= maxAttempts) return;

              try {
                // Find the block that contains this component to update it
                const blocks = editor.topLevelBlocks;
                const blockToUpdate = blocks.find(
                  (block) =>
                    block.type === "pageLink" && block.props?.pageId === pageId
                );

                if (blockToUpdate) {
                  // Update the block props to ensure changes are properly reflected in the editor model
                  editor.updateBlock(blockToUpdate, {
                    type: "pageLink",
                    props: {
                      ...blockToUpdate.props,
                      pageTitle: detail.title || blockToUpdate.props.pageTitle,
                      pageIcon: detail.icon || blockToUpdate.props.pageIcon,
                    },
                  });
                  console.log(
                    `Updated page link block with new title/icon in editor model`
                  );
                } else if (attempt < maxAttempts - 1) {
                  // If block not found and we have attempts left, try again with backoff
                  setTimeout(
                    () => attemptUpdate(attempt + 1),
                    100 * Math.pow(2, attempt)
                  );
                }
              } catch (updateErr) {
                console.error(
                  `Error updating editor block (attempt ${attempt + 1}):`,
                  updateErr
                );
                if (attempt < maxAttempts - 1) {
                  setTimeout(
                    () => attemptUpdate(attempt + 1),
                    100 * Math.pow(2, attempt)
                  );
                }
              }
            };

            // Start update attempts
            attemptUpdate();
          }
        }
      } catch (err) {
        console.error("Error handling page update event:", err);
      }
    };

    const handlePageDeleted = (event) => {
      try {
        // Handle both web (CustomEvent) and React Native (basic event) scenarios
        const detail = event.detail || {};
        if (detail.pageId === pageId) {
          console.log(`Page link received delete event for page: ${pageId}`);
          setPageTitle("Page Deleted");
          setPageIcon("🗑️");

          // Mark the page link as deleted visually
          setTimeout(() => {
            try {
              // Attempt to remove the block from the editor with retries
              if (editor) {
                const maxAttempts = 3;

                const attemptRemoval = (attempt = 0) => {
                  if (attempt >= maxAttempts) return;

                  try {
                    // Find the block that contains this component
                    const blocks = editor.topLevelBlocks;
                    const blockToRemove = blocks.find(
                      (block) =>
                        block.type === "pageLink" &&
                        block.props?.pageId === pageId
                    );

                    if (blockToRemove) {
                      console.log(
                        "Removing deleted page link block from editor"
                      );
                      editor.removeBlocks([blockToRemove]);
                    } else if (attempt < maxAttempts - 1) {
                      // If block not found and we have attempts left, try again with backoff
                      setTimeout(
                        () => attemptRemoval(attempt + 1),
                        100 * Math.pow(2, attempt)
                      );
                    }
                  } catch (removeErr) {
                    console.error(
                      `Error removing page link (attempt ${attempt + 1}):`,
                      removeErr
                    );
                    if (attempt < maxAttempts - 1) {
                      setTimeout(
                        () => attemptRemoval(attempt + 1),
                        100 * Math.pow(2, attempt)
                      );
                    }
                  }
                };

                // Start removal attempts
                attemptRemoval();
              }
            } catch (err) {
              console.error("Error removing deleted page link:", err);
            }
          }, 1000); // Short delay to ensure the UI shows the deleted state first
        }
      } catch (err) {
        console.error("Error handling page deleted event:", err);
      }
    };

    // Listen for custom page update events
    if (typeof window !== "undefined") {
      try {
        // Add debugging to verify events are working
        console.log(`Setting up event listeners for page ${pageId}`);

        // Setup direct debugging listener to catch all page events
        const debugListener = (event) => {
          const detail = event.detail || {};
          console.log(`DEBUG - ${event.type} event received:`, detail);
        };

        // Add event listeners
        window.addEventListener("pageUpdated", handlePageUpdate);
        window.addEventListener("pageDeleted", handlePageDeleted);

        // Also listen on document for wider compatibility
        document.addEventListener("pageUpdated", handlePageUpdate);
        document.addEventListener("pageDeleted", handlePageDeleted);

        // Add debug listeners too (will be visible in logs but won't affect behavior)
        window.addEventListener("pageUpdated", debugListener);

        // React Native compatibility - if global event emitter exists
        if (global && typeof global === "object" && global._eventEmitter) {
          if (!global._eventEmitter.listeners) {
            global._eventEmitter.listeners = {};
          }

          if (!global._eventEmitter.listeners.pageUpdated) {
            global._eventEmitter.listeners.pageUpdated = [];
          }

          if (!global._eventEmitter.listeners.pageDeleted) {
            global._eventEmitter.listeners.pageDeleted = [];
          }

          global._eventEmitter.listeners.pageUpdated.push(handlePageUpdate);
          global._eventEmitter.listeners.pageDeleted.push(handlePageDeleted);
        }

        console.log(
          `PageLinkBlock: Event listeners setup completed for page ${pageId}`
        );

        return () => {
          try {
            window.removeEventListener("pageUpdated", handlePageUpdate);
            window.removeEventListener("pageDeleted", handlePageDeleted);
            window.removeEventListener("pageUpdated", debugListener);

            document.removeEventListener("pageUpdated", handlePageUpdate);
            document.removeEventListener("pageDeleted", handlePageDeleted);

            // Clean up React Native listeners if they exist
            if (
              global &&
              typeof global === "object" &&
              global._eventEmitter &&
              global._eventEmitter.listeners
            ) {
              if (global._eventEmitter.listeners.pageUpdated) {
                global._eventEmitter.listeners.pageUpdated =
                  global._eventEmitter.listeners.pageUpdated.filter(
                    (l) => l !== handlePageUpdate
                  );
              }

              if (global._eventEmitter.listeners.pageDeleted) {
                global._eventEmitter.listeners.pageDeleted =
                  global._eventEmitter.listeners.pageDeleted.filter(
                    (l) => l !== handlePageDeleted
                  );
              }
            }
          } catch (cleanupError) {
            console.warn("Error removing event listeners:", cleanupError);
          }
        };
      } catch (setupError) {
        console.warn("Error setting up event listeners:", setupError);

        // Fall back to just using the refresh interval
        console.log("Using refresh interval fallback for page:", pageId);
      }
    }
  }, [pageId, editor]);

  const handleClick = () => {
    // Get the onNavigateToPage from the block's meta
    const onNavigateToPage =
      editor._tiptapEditor?.storage?.pageLink?.onNavigateToPage;

    // Call the navigation callback
    if (onNavigateToPage && pageId) {
      console.log("Navigating to page:", pageId);
      onNavigateToPage(pageId);
    } else {
      console.warn("Cannot navigate: missing pageId or navigation callback");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "6px 12px",
        margin: "4px 0",
        borderRadius: "8px",
        background: isLoading
          ? "rgba(0, 120, 212, 0.05)"
          : "rgba(0, 120, 212, 0.1)",
        cursor: "pointer",
        border: "1px solid rgba(0, 120, 212, 0.3)",
        transition: "all 0.2s ease",
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        width: "100%",
        opacity: isLoading ? 0.7 : 1,
      }}
      onClick={handleClick}
      onMouseOver={(e) => {
        if (!isLoading) {
          e.currentTarget.style.background = "rgba(0, 120, 212, 0.15)";
          e.currentTarget.style.boxShadow = "0 2px 5px rgba(0,0,0,0.15)";
        }
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.background = isLoading
          ? "rgba(0, 120, 212, 0.05)"
          : "rgba(0, 120, 212, 0.1)";
        e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.1)";
      }}
    >
      <div style={{ marginRight: "12px", fontSize: "18px" }}>{pageIcon}</div>
      <div
        style={{
          flex: 1,
          fontSize: "16px",
          fontWeight: "500",
          color: "rgba(0, 120, 212, 1)",
        }}
      >
        {pageTitle}
        {isLoading && (
          <span style={{ fontSize: "12px", opacity: 0.5 }}> (updating...)</span>
        )}
      </div>
      <div
        style={{
          fontSize: "14px",
          opacity: 0.6,
          marginLeft: "8px",
          background: "rgba(0, 120, 212, 0.1)",
          padding: "3px 8px",
          borderRadius: "4px",
        }}
      >
        Open Page ↗
      </div>
    </div>
  );
};

// Create a custom block for page links using the createReactBlockSpec API
const PageLinkBlock = createReactBlockSpec(
  {
    type: "pageLink",
    propSchema: {
      pageId: { default: "" },
      pageTitle: { default: "Untitled Page" },
      pageIcon: { default: "📄" },
    },
    content: "none", // This block doesn't allow content inside it
  },
  {
    render: (props) => {
      const { block, editor } = props;
      console.log("Rendering PageLinkBlock:", block);

      return (
        <DynamicPageLinkContent
          pageId={block.props.pageId}
          editor={editor}
          initialTitle={block.props.pageTitle}
          initialIcon={block.props.pageIcon}
        />
      );
    },
  }
);

export default PageLinkBlock;
