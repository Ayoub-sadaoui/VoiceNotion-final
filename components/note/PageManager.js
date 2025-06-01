/**
 * PageManager service
 *
 * This service handles page-related operations such as:
 * - Saving pages
 * - Deleting pages
 * - Creating nested pages
 * - Collecting page descendants
 */

// Helper function to collect a page and all its descendants
const collectPageAndDescendants = (pages, rootId) => {
  const result = [];

  // Find the root page first
  const rootPage = pages.find((page) => page.id === rootId);
  if (rootPage) {
    result.push(rootPage);
  }

  // Recursive function to find all children
  const findChildren = (parentId) => {
    const childrenPages = pages.filter((page) => page.parentId === parentId);

    childrenPages.forEach((child) => {
      result.push(child);
      findChildren(child.id);
    });
  };

  findChildren(rootId);
  return result;
};

/**
 * Saves page content with proper error handling
 *
 * @param {Object} currentPage - The current page object
 * @param {Array} editorContent - The content to save
 * @param {string} title - The page title
 * @param {string} icon - The page icon
 * @param {Function} savePage - The storage service save function
 * @param {Function} setIsSaving - State setter for saving indicator
 * @param {Function} setCurrentPage - State setter for current page
 * @returns {Promise<boolean>} - Success status
 */
const savePage = async (
  currentPage,
  editorContent,
  title,
  icon,
  savePage,
  setIsSaving,
  setCurrentPage
) => {
  if (!currentPage) {
    console.warn("Cannot save: No page loaded");
    return false;
  }

  if (!editorContent) {
    console.warn("Cannot save: No editor content available");
    return true; // Not a critical error, content might just be empty
  }

  setIsSaving(true);
  try {
    console.log("Saving page content:", currentPage.id);

    // Safely stringify the content
    let contentJsonString;
    try {
      contentJsonString = JSON.stringify(editorContent);
      console.log(
        "Content serialized successfully, length:",
        contentJsonString.length
      );
    } catch (serializeErr) {
      console.error("Error serializing content:", serializeErr);
      return false;
    }

    const updatedPage = {
      ...currentPage,
      contentJson: contentJsonString,
      title: title,
      icon: icon,
      updatedAt: Date.now(),
    };

    const savedPage = await savePage(updatedPage);
    console.log("Page saved successfully:", savedPage.id);
    setCurrentPage(savedPage);
    return true;
  } catch (err) {
    console.error("Error saving page:", err);
    return false;
  } finally {
    setIsSaving(false);
  }
};

/**
 * Deletes a page and its descendants
 *
 * @param {string} pageId - The ID of the page to delete
 * @param {Object} currentPage - The current page object
 * @param {Function} loadAllPages - Function to load all pages
 * @param {Function} deletePage - The storage service delete function
 * @param {Function} router - The router object for navigation
 * @param {Object} editorRef - Reference to the editor component
 * @param {Function} loadNestedPages - Function to reload nested pages
 * @param {boolean} isUserInitiated - Whether the deletion was initiated by the user
 * @returns {Promise<void>}
 */
const deletePage = async (
  pageId,
  currentPage,
  loadAllPages,
  deletePage,
  router,
  editorRef,
  loadNestedPages,
  isUserInitiated = true
) => {
  try {
    if (!pageId) return;

    console.log(`Deleting page: ${pageId}, user initiated: ${isUserInitiated}`);

    // If this is the current page, we need to navigate away
    const isCurrentPage = pageId === currentPage?.id;
    const parentId = currentPage?.parentId;

    // Get all pages that will be deleted (this page and its descendants)
    const allPages = await loadAllPages();
    const pagesToDelete = collectPageAndDescendants(allPages, pageId);

    console.log(
      `Deleting page ${pageId} and ${pagesToDelete.length - 1} descendants`
    );

    // Delete the page from storage
    const result = await deletePage(pageId);

    if (result) {
      console.log("Page deleted successfully");

      // If this was triggered by block deletion in the editor (not user initiated)
      // and it's not the current page, we don't need to navigate
      if (!isUserInitiated && !isCurrentPage) {
        // Refresh nested pages
        loadNestedPages();
        return;
      }

      // For user-initiated deletion or if we're deleting the current page
      if (isCurrentPage) {
        // Navigate to parent page or home
        if (parentId) {
          router.replace(`/note/${parentId}`);
        } else {
          router.replace("/");
        }
      } else {
        // Remove the page link block from the editor
        if (editorRef.current) {
          // Get IDs of all pages being deleted (including descendants)
          const pageIdsToRemove = pagesToDelete.map((page) => page.id);

          // Remove all page links at once if the new method is available
          if (editorRef.current.removePageLinks) {
            editorRef.current.removePageLinks(pageIdsToRemove);
          } else {
            // Fallback to removing one by one
            editorRef.current.removePageLink(pageId);

            // If there are descendants, remove their page links too
            if (pagesToDelete.length > 1) {
              pagesToDelete.forEach((page) => {
                if (page.id !== pageId) {
                  editorRef.current.removePageLink(page.id);
                }
              });
            }
          }
        }

        // Refresh nested pages
        loadNestedPages();
      }
    }
  } catch (err) {
    console.error("Error deleting page:", err);
  }
};

/**
 * Creates a nested page
 *
 * @param {Object} currentPage - The current page object
 * @param {Function} createNewPage - The storage service create function
 * @param {string} title - The page title
 * @param {string} icon - The page icon
 * @returns {Promise<Object>} - The created page
 */
const createNestedPage = async (currentPage, createNewPage, title, icon) => {
  try {
    if (!currentPage || !currentPage.id) {
      console.error("Cannot create nested page: Invalid current page");
      return Promise.reject(new Error("Invalid current page"));
    }

    // Create new page with current page as parent
    const newPage = await createNewPage(
      currentPage.id,
      title || "New Page",
      icon || "📄"
    );

    console.log("Successfully created nested page:", newPage.id);

    // Return the created page
    return newPage;
  } catch (err) {
    console.error("Error creating nested page:", err);
    // Re-throw the error so it can be caught by the caller
    return Promise.reject(err);
  }
};

/**
 * Inserts a page link in the editor
 *
 * @param {Object} editorRef - Reference to the editor component
 * @param {Object} newPage - The page to link to
 * @param {Function} handleSave - Function to save the current page
 * @param {Function} setIsSaving - State setter for saving indicator
 * @returns {Promise<void>}
 */
const insertPageLink = async (editorRef, newPage, handleSave, setIsSaving) => {
  try {
    setIsSaving(true);

    if (editorRef.current) {
      try {
        editorRef.current.insertPageLink(
          newPage.id,
          newPage.title,
          newPage.icon
        );
        console.log("Page link inserted successfully");

        // Save the current page with the new link
        await handleSave();
      } catch (insertError) {
        console.error("Error inserting page link:", insertError);
      }
    }

    setIsSaving(false);
  } catch (err) {
    console.error("Error creating nested page:", err);
    setIsSaving(false);
  }
};

export default {
  savePage,
  deletePage,
  createNestedPage,
  insertPageLink,
  collectPageAndDescendants,
};
