import { useState, useEffect, useCallback } from "react";
import pageStorageService from "../services/pageStorage";
import { buildPageTree } from "../utils/pageUtils";

/**
 * Custom hook for interacting with page storage
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Object} Page storage methods and data
 */
const usePageStorage = (userId = null) => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all pages
  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      // Only load pages if user is authenticated
      if (userId) {
        const allPages = await pageStorageService.loadAllPages(userId);
        setPages(allPages);
        setError(null);
      } else {
        // Clear pages if not authenticated
        setPages([]);
      }
    } catch (err) {
      setError(err.message || "Failed to load pages");
      console.error("Error loading pages:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial load
  useEffect(() => {
    loadPages();
  }, [loadPages, userId]);

  // Create a new page
  const createNewPage = useCallback(
    async (parentId, title, icon) => {
      try {
        if (!userId) {
          throw new Error("User not authenticated");
        }
        const newPage = await pageStorageService.createPage(
          parentId,
          title,
          icon,
          userId
        );
        setPages((prev) => [...prev, newPage]);
        return newPage;
      } catch (err) {
        setError(err.message || "Failed to create page");
        console.error("Error creating page:", err);
        throw err;
      }
    },
    [userId]
  );

  // Save a page (create or update)
  const savePage = useCallback(
    async (page) => {
      try {
        if (!userId) {
          throw new Error("User not authenticated");
        }
        const updatedPage = await pageStorageService.savePage(page, userId);
        setPages((prev) =>
          prev.map((p) => (p.id === updatedPage.id ? updatedPage : p))
        );
        return updatedPage;
      } catch (err) {
        setError(err.message || "Failed to save page");
        console.error("Error saving page:", err);
        throw err;
      }
    },
    [userId]
  );

  // Delete a page and its children
  const deletePage = useCallback(
    async (id) => {
      try {
        if (!userId) {
          throw new Error("User not authenticated");
        }
        const result = await pageStorageService.deletePage(id, userId);
        if (result) {
          // Refresh pages after deletion to ensure we have the latest state
          await loadPages();
        }
        return result;
      } catch (err) {
        setError(err.message || "Failed to delete page");
        console.error("Error deleting page:", err);
        throw err;
      }
    },
    [loadPages, userId]
  );

  // Get root pages
  const getRootPages = useCallback(async () => {
    try {
      if (!userId) {
        return [];
      }
      return await pageStorageService.getRootPages(userId);
    } catch (err) {
      console.error("Error getting root pages:", err);
      return [];
    }
  }, [userId]);

  // Get children of a page
  const getChildrenOfPage = useCallback(
    async (parentId) => {
      try {
        if (!userId) {
          return [];
        }
        return await pageStorageService.getChildPages(parentId, userId);
      } catch (err) {
        console.error("Error getting children of page:", err);
        return [];
      }
    },
    [userId]
  );

  // Get page by ID
  const getPageById = useCallback(
    async (id) => {
      try {
        if (!userId) {
          return null;
        }
        return await pageStorageService.getPageById(id, userId);
      } catch (err) {
        console.error("Error getting page by ID:", err);
        return null;
      }
    },
    [userId]
  );

  // Get page tree
  const getPageTree = useCallback(() => {
    return buildPageTree(pages);
  }, [pages]);

  // Create test pages for debugging
  const createTestPages = useCallback(async () => {
    try {
      if (!userId) {
        return false;
      }
      const result = await pageStorageService.createTestPages(userId);
      if (result) {
        await loadPages(); // Reload pages if test pages were created
      }
      return result;
    } catch (err) {
      console.error("Error creating test pages:", err);
      return false;
    }
  }, [loadPages, userId]);

  return {
    pages,
    loading,
    error,
    loadPages,
    createNewPage,
    savePage,
    deletePage,
    getRootPages,
    getChildrenOfPage,
    getPageById,
    getPageTree,
    createTestPages,
  };
};

export default usePageStorage;
