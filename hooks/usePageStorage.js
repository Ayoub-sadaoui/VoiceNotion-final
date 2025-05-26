import { useState, useEffect, useCallback } from "react";
import pageStorageService from "../services/pageStorage";
import { buildPageTree } from "../utils/pageUtils";

/**
 * Custom hook for interacting with page storage
 * @returns {Object} Page storage methods and data
 */
const usePageStorage = () => {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all pages
  const loadPages = useCallback(async () => {
    try {
      setLoading(true);
      const allPages = await pageStorageService.loadAllPages();
      setPages(allPages);
      setError(null);
    } catch (err) {
      setError(err.message || "Failed to load pages");
      console.error("Error loading pages:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadPages();
  }, [loadPages]);

  // Create a new page
  const createNewPage = useCallback(async (parentId, title, icon) => {
    try {
      const newPage = await pageStorageService.createPage(
        parentId,
        title,
        icon
      );
      setPages((prev) => [...prev, newPage]);
      return newPage;
    } catch (err) {
      setError(err.message || "Failed to create page");
      console.error("Error creating page:", err);
      throw err;
    }
  }, []);

  // Save a page (create or update)
  const savePage = useCallback(async (page) => {
    try {
      const updatedPage = await pageStorageService.savePage(page);
      setPages((prev) =>
        prev.map((p) => (p.id === updatedPage.id ? updatedPage : p))
      );
      return updatedPage;
    } catch (err) {
      setError(err.message || "Failed to save page");
      console.error("Error saving page:", err);
      throw err;
    }
  }, []);

  // Delete a page and its children
  const deletePage = useCallback(
    async (id) => {
      try {
        const result = await pageStorageService.deletePage(id);
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
    [loadPages]
  );

  // Get root pages
  const getRootPages = useCallback(async () => {
    try {
      return await pageStorageService.getRootPages();
    } catch (err) {
      console.error("Error getting root pages:", err);
      return [];
    }
  }, []);

  // Get children of a page
  const getChildrenOfPage = useCallback(async (parentId) => {
    try {
      return await pageStorageService.getChildPages(parentId);
    } catch (err) {
      console.error("Error getting children of page:", err);
      return [];
    }
  }, []);

  // Get page by ID
  const getPageById = useCallback(async (id) => {
    try {
      return await pageStorageService.getPageById(id);
    } catch (err) {
      console.error("Error getting page by ID:", err);
      return null;
    }
  }, []);

  // Get page tree
  const getPageTree = useCallback(() => {
    return buildPageTree(pages);
  }, [pages]);

  // Create test pages for debugging
  const createTestPages = useCallback(async () => {
    try {
      const result = await pageStorageService.createTestPages();
      if (result) {
        await loadPages(); // Reload pages if test pages were created
      }
      return result;
    } catch (err) {
      console.error("Error creating test pages:", err);
      return false;
    }
  }, [loadPages]);

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
