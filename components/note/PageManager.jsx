import { Alert } from "react-native";
import Toast from "react-native-toast-message";
import React, { useState } from "react";
import { v4 as uuidv4 } from "uuid";
import ConfirmDialog from "./ConfirmDialog";

/**
 * PageManager - Utility functions for managing pages
 */
const PageManager = {
  /**
   * Create a nested page
   * @param {Object} currentPage - Current page object
   * @param {Function} createNewPage - Function to create a new page
   * @param {string} title - Page title
   * @param {string} icon - Page icon
   * @returns {Promise<Object>} - Created page object
   */
  createNestedPage: async (
    currentPage,
    createNewPage,
    title = "New Page",
    icon = "📄"
  ) => {
    try {
      if (!currentPage || !currentPage.id) {
        console.error("Cannot create nested page: Invalid current page");
        return Promise.reject(new Error("Invalid current page"));
      }

      // Create new page with current page as parent
      const newPage = await createNewPage(currentPage.id, title, icon);

      if (!newPage) {
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Failed to create new page",
          visibilityTime: 2000,
        });
        return null;
      }

      Toast.show({
        type: "success",
        text1: "Success",
        text2: "New page created",
        visibilityTime: 2000,
      });

      return newPage;
    } catch (error) {
      console.error("Error creating nested page:", error);
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create new page",
        visibilityTime: 2000,
      });
      return null;
    }
  },

  /**
   * Insert a page link into the editor
   * @param {Object} editorRef - Reference to the editor
   * @param {Object} page - Page object to link to
   * @param {Function} handleSave - Function to save the page
   * @param {Function} setIsSaving - Function to set saving state
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  insertPageLink: async (editorRef, page, handleSave, setIsSaving) => {
    try {
      if (!editorRef.current || !page) {
        return false;
      }

      // Create page link block
      const pageLinkBlock = {
        type: "pageLink",
        props: {
          pageId: page.id,
          pageTitle: page.title,
          pageIcon: page.icon,
        },
        content: [],
        children: [],
      };

      // Try to insert using the editor's API if available
      if (typeof editorRef.current.insertBlock === "function") {
        editorRef.current.insertBlock(pageLinkBlock);

        // Save changes
        if (handleSave) {
          setIsSaving(true);
          await handleSave();
          setIsSaving(false);
        }

        return true;
      } else {
        console.warn("Editor insertBlock method not available");
        return false;
      }
    } catch (error) {
      console.error("Error inserting page link:", error);
      return false;
    }
  },

  /**
   * Delete a page
   * @param {Object} page - Page to delete
   * @param {Function} deletePage - Function to delete a page
   * @param {Function} router - Router object for navigation
   * @returns {Promise<boolean>} - Whether the operation was successful
   */
  deletePage: async (page, deletePage, router) => {
    return new Promise((resolve) => {
      if (!page || !page.id) {
        console.error("Cannot delete page: Invalid page");
        Toast.show({
          type: "error",
          text1: "Error",
          text2: "Invalid page to delete",
          visibilityTime: 2000,
        });
        resolve(false);
        return;
      }

      // Create a component that will render the confirm dialog
      const DeleteConfirmationWrapper = () => {
        const [showDialog, setShowDialog] = useState(true);

        const handleCancel = () => {
          setShowDialog(false);
          resolve(false);
        };

        const handleConfirm = async () => {
          setShowDialog(false);
          try {
            await deletePage(page.id);

            Toast.show({
              type: "success",
              text1: "Success",
              text2: "Page deleted",
              visibilityTime: 2000,
            });

            // Navigate back to parent page or home
            if (page.parentId) {
              router.replace(`/note/${page.parentId}`);
            } else {
              router.replace("/home");
            }

            resolve(true);
          } catch (error) {
            console.error("Error deleting page:", error);
            Toast.show({
              type: "error",
              text1: "Error",
              text2: "Failed to delete page",
              visibilityTime: 2000,
            });
            resolve(false);
          }
        };

        return (
          <ConfirmDialog
            visible={showDialog}
            title="Delete Page"
            message={`Are you sure you want to delete "${page.title}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        );
      };

      // Render the confirmation dialog
      const dialogComponent = <DeleteConfirmationWrapper />;

      // The dialog component will handle the resolve callbacks
      // We need to actually render this component somewhere in the React tree
      // This is typically handled by a modal service or context
      // For now, we'll use a global modal service pattern
      if (global.showModal && typeof global.showModal === "function") {
        global.showModal(dialogComponent);
      } else {
        console.warn(
          "No global modal service available, falling back to Alert"
        );
        // Fallback to Alert if no modal service is available
        Alert.alert(
          "Delete Page",
          `Are you sure you want to delete "${page.title}"? This action cannot be undone.`,
          [
            {
              text: "Cancel",
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deletePage(page.id);

                  Toast.show({
                    type: "success",
                    text1: "Success",
                    text2: "Page deleted",
                    visibilityTime: 2000,
                  });

                  // Navigate back to parent page or home
                  if (page.parentId) {
                    router.replace(`/note/${page.parentId}`);
                  } else {
                    router.replace("/home");
                  }

                  resolve(true);
                } catch (error) {
                  console.error("Error deleting page:", error);
                  Toast.show({
                    type: "error",
                    text1: "Error",
                    text2: "Failed to delete page",
                    visibilityTime: 2000,
                  });
                  resolve(false);
                }
              },
            },
          ],
          { cancelable: true }
        );
      }
    });
  },

  /**
   * Navigate to a page
   * @param {string} pageId - ID of the page to navigate to
   * @param {Function} router - Router object for navigation
   * @returns {void}
   */
  navigateToPage: (pageId, router) => {
    if (!pageId) {
      console.error("Cannot navigate to page: Invalid page ID");
      return;
    }

    router.push(`/note/${pageId}`);
  },

  /**
   * Load nested pages for a parent page
   * @param {string} parentId - ID of the parent page
   * @param {Function} getPagesByParentId - Function to get pages by parent ID
   * @param {Function} setNestedPages - State setter for nested pages
   * @returns {Promise<Array>} - Loaded nested pages
   */
  loadNestedPages: async (parentId, getPagesByParentId, setNestedPages) => {
    try {
      if (!parentId) {
        console.error("Cannot load nested pages: Invalid parent ID");
        return [];
      }

      const pages = await getPagesByParentId(parentId);

      if (Array.isArray(pages)) {
        setNestedPages(pages);
        return pages;
      }

      return [];
    } catch (error) {
      console.error("Error loading nested pages:", error);
      return [];
    }
  },

  /**
   * Save a page
   * @param {Object} currentPage - Current page object
   * @param {Array} editorContent - Editor content
   * @param {string} title - Page title
   * @param {string} icon - Page icon
   * @param {Function} storageSavePage - Function to save a page
   * @param {Function} setIsSaving - Function to set saving state
   * @param {Function} setCurrentPage - Function to set current page
   * @returns {Promise<Object>} - Saved page object
   */
  savePage: async (
    currentPage,
    editorContent,
    title,
    icon,
    storageSavePage,
    setIsSaving,
    setCurrentPage
  ) => {
    if (!currentPage) {
      console.warn("Cannot save: No page loaded");
      return Promise.resolve(currentPage);
    }

    setIsSaving(true);

    try {
      const contentJsonString = JSON.stringify(editorContent || []);
      const updatedPage = {
        ...currentPage,
        contentJson: contentJsonString,
        title: title,
        icon: icon,
        updatedAt: Date.now(),
      };

      const savedPage = await storageSavePage(updatedPage);
      setCurrentPage(savedPage);
      return savedPage;
    } catch (err) {
      console.error("Error during save:", err);
      return Promise.reject(err);
    } finally {
      setIsSaving(false);
    }
  },
};

export default PageManager;
