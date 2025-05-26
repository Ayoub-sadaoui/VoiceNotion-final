/**
 * Page Storage Service
 *
 * Handles the storage, retrieval, and management of pages in local storage
 * Uses AsyncStorage for persistent storage on mobile devices
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

// Storage keys
const KEYS = {
  PAGES: "voicenotion_pages",
};

// Generate a unique ID for a page
const generateId = () => {
  return (
    "page_" +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};

// Get current timestamp
const getTimestamp = () => Date.now();

/**
 * Create a new page
 * @param {string} parentId - Parent page ID (null for root pages)
 * @param {string} title - Page title
 * @param {string} icon - Emoji icon for the page
 * @returns {Promise<Object>} - New page object
 */
const createPage = async (
  parentId = null,
  title = "Untitled Page",
  icon = "📄"
) => {
  try {
    const id = generateId();
    const now = getTimestamp();

    // Create proper initial content for the new page
    const initialContent = JSON.stringify([
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
            text: title || "Untitled Page",
            styles: {},
          },
        ],
        children: [],
      },
      {
        type: "paragraph",
        props: {
          textColor: "default",
          backgroundColor: "default",
          textAlignment: "left",
        },
        content: [
          {
            type: "text",
            text: "Start writing here...",
            styles: {},
          },
        ],
        children: [],
      },
    ]);

    // Create new page object
    const newPage = {
      id,
      parentId,
      title,
      icon,
      contentJson: initialContent,
      createdAt: now,
      updatedAt: now,
    };

    // Get existing pages
    const existingPagesJson = await AsyncStorage.getItem(KEYS.PAGES);
    const existingPages = existingPagesJson
      ? JSON.parse(existingPagesJson)
      : [];

    // Add new page
    const updatedPages = [...existingPages, newPage];

    // Save to storage
    await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(updatedPages));

    return newPage;
  } catch (error) {
    console.error("Error creating page:", error);
    throw new Error("Failed to create page");
  }
};

/**
 * Get a page by ID
 * @param {string} id - Page ID to retrieve
 * @returns {Promise<Object|null>} - Page object or null if not found
 */
const getPageById = async (id) => {
  try {
    if (!id) return null;

    const pagesJson = await AsyncStorage.getItem(KEYS.PAGES);
    if (!pagesJson) return null;

    const pages = JSON.parse(pagesJson);
    return pages.find((page) => page.id === id) || null;
  } catch (error) {
    console.error("Error getting page by ID:", error);
    return null;
  }
};

/**
 * Save (update) an existing page
 * @param {Object} page - Updated page object
 * @returns {Promise<Object>} - Saved page object
 */
const savePage = async (page) => {
  try {
    if (!page || !page.id) {
      throw new Error("Invalid page object");
    }

    // Get existing pages
    const pagesJson = await AsyncStorage.getItem(KEYS.PAGES);
    const pages = pagesJson ? JSON.parse(pagesJson) : [];

    // Update updatedAt timestamp
    const updatedPage = {
      ...page,
      updatedAt: getTimestamp(),
    };

    // Replace page in array
    const updatedPages = pages.map((p) =>
      p.id === updatedPage.id ? updatedPage : p
    );

    // Save to storage
    await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(updatedPages));

    return updatedPage;
  } catch (error) {
    console.error("Error saving page:", error);
    throw new Error("Failed to save page");
  }
};

/**
 * Delete a page and its children
 * @param {string} id - ID of the page to delete
 * @returns {Promise<boolean>} - Success status
 */
const deletePage = async (id) => {
  try {
    if (!id) return false;

    // Get existing pages
    const pagesJson = await AsyncStorage.getItem(KEYS.PAGES);
    if (!pagesJson) return false;

    const pages = JSON.parse(pagesJson);

    // Find the page to be deleted and all its descendants
    const idsToDelete = collectPageAndDescendantIds(pages, id);

    // Filter out the pages to delete
    const remainingPages = pages.filter(
      (page) => !idsToDelete.includes(page.id)
    );

    // Save the remaining pages
    await AsyncStorage.setItem(KEYS.PAGES, JSON.stringify(remainingPages));

    return true;
  } catch (error) {
    console.error("Error deleting page:", error);
    return false;
  }
};

/**
 * Helper function to collect a page and all its descendants
 * @param {Array} pages - All pages
 * @param {string} rootId - Root page ID
 * @returns {Array} - Array of IDs to delete
 */
const collectPageAndDescendantIds = (pages, rootId) => {
  const idsToDelete = [rootId];

  // Recursive function to find all children
  const findChildren = (parentId) => {
    const childrenPages = pages.filter((page) => page.parentId === parentId);

    childrenPages.forEach((child) => {
      idsToDelete.push(child.id);
      findChildren(child.id);
    });
  };

  findChildren(rootId);
  return idsToDelete;
};

/**
 * Load all pages
 * @returns {Promise<Array>} - Array of all pages
 */
const loadAllPages = async () => {
  try {
    const pagesJson = await AsyncStorage.getItem(KEYS.PAGES);
    return pagesJson ? JSON.parse(pagesJson) : [];
  } catch (error) {
    console.error("Error loading all pages:", error);
    return [];
  }
};

/**
 * Get root pages (pages with no parent)
 * @returns {Promise<Array>} - Array of root pages
 */
const getRootPages = async () => {
  try {
    const pages = await loadAllPages();
    return pages.filter((page) => !page.parentId);
  } catch (error) {
    console.error("Error getting root pages:", error);
    return [];
  }
};

/**
 * Get child pages of a parent page
 * @param {string} parentId - Parent page ID
 * @returns {Promise<Array>} - Array of child pages
 */
const getChildPages = async (parentId) => {
  try {
    if (!parentId) return [];

    const pages = await loadAllPages();
    return pages.filter((page) => page.parentId === parentId);
  } catch (error) {
    console.error("Error getting child pages:", error);
    return [];
  }
};

/**
 * Create test pages for development/testing
 * @returns {Promise<boolean>} - Success status
 */
const createTestPages = async () => {
  try {
    // Check if we already have pages
    const existingPages = await loadAllPages();
    if (existingPages.length > 0) {
      console.log("Test pages not created: Pages already exist");
      return false;
    }

    // Create root page
    const rootPage = await createPage(null, "Welcome to VoiceNotion", "📝");

    // Create some child pages
    await createPage(rootPage.id, "Getting Started", "🚀");
    const notesPage = await createPage(rootPage.id, "My Notes", "📒");

    // Create some grandchild pages
    await createPage(notesPage.id, "Work Notes", "💼");
    await createPage(notesPage.id, "Personal Notes", "🏠");

    console.log("Test pages created successfully");
    return true;
  } catch (error) {
    console.error("Error creating test pages:", error);
    return false;
  }
};

// Export all functions
const pageStorageService = {
  createPage,
  getPageById,
  savePage,
  deletePage,
  loadAllPages,
  getRootPages,
  getChildPages,
  createTestPages,
};

export default pageStorageService;
