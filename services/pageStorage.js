/**
 * Page Storage Service
 *
 * Handles the storage, retrieval, and management of pages in Supabase
 */

import { v4 as uuidv4 } from "uuid";
import {
  createNote,
  updateNote,
  deleteNote,
  fetchSupabaseNotesOnly,
} from "./noteService";
import { supabase } from "./supabaseService";

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
 * @param {string|null} parentId - Parent page ID (null for root pages)
 * @param {string} title - Page title
 * @param {string} icon - Page icon
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Object>} - Created page object
 */
const createPage = async (
  parentId = null,
  title = "Untitled Page",
  icon = "📄",
  userId = null
) => {
  try {
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Try to use uuidv4, but fall back to our own generateId if it fails
    let id;
    try {
      id = uuidv4();
    } catch (uuidError) {
      console.warn(
        "UUID generation failed, using fallback:",
        uuidError.message
      );
      id = generateId();
    }

    const timestamp = getTimestamp();

    // Create default content for the new page
    const defaultContent = [
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
            text: "",
            styles: {},
          },
        ],
        children: [],
      },
    ];

    // Serialize content to JSON string
    const contentJsonString = JSON.stringify(defaultContent);

    // Create page object
    const page = {
      id,
      parentId,
      title,
      icon,
      createdAt: timestamp,
      updatedAt: timestamp,
      contentJson: contentJsonString, // Use properly formatted content
    };

    // Create note in Supabase
    const noteResult = await createNote(userId, {
      id: page.id,
      title: page.title,
      content: defaultContent, // Use properly formatted content
      parentId: page.parentId,
      icon: page.icon,
    });

    if (!noteResult.success) {
      throw new Error("Failed to create note in Supabase");
    }

    return page;
  } catch (error) {
    console.error("Error creating page:", error);
    throw new Error("Failed to create page");
  }
};

/**
 * Get a page by ID
 * @param {string} id - Page ID to retrieve
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Object|null>} - Page object or null if not found
 */
const getPageById = async (id, userId) => {
  try {
    if (!id || !userId) return null;

    // Fetch the note from Supabase through the noteService
    const result = await fetchSupabaseNotesOnly(userId);
    if (!result.success) return null;

    // Find the note with the matching ID
    return result.notes.find((note) => note.id === id) || null;
  } catch (error) {
    console.error("Error getting page by ID:", error);
    return null;
  }
};

/**
 * Save (update) an existing page
 * @param {Object} page - Updated page object
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Object>} - Saved page object
 */
const savePage = async (page, userId = null) => {
  try {
    if (!page || !page.id || !userId) {
      throw new Error("Invalid page object or user not authenticated");
    }

    // Update updatedAt timestamp
    const updatedPage = {
      ...page,
      updatedAt: getTimestamp(),
    };

    console.log(
      `Saving page to Supabase: ID=${page.id}, Title="${page.title}", Icon=${page.icon}`
    );

    // Parse contentJson if it exists, otherwise use content or empty array
    let contentToSave = [];

    if (page.contentJson) {
      try {
        contentToSave = JSON.parse(page.contentJson);
        if (!Array.isArray(contentToSave)) {
          console.warn(
            "contentJson is not an array, converting to array format"
          );
          contentToSave = [contentToSave];
        }
      } catch (err) {
        console.warn("Failed to parse contentJson:", err);
        // Fallback to content field or empty array
        contentToSave = Array.isArray(page.content) ? page.content : [];
      }
    } else if (page.content) {
      contentToSave = Array.isArray(page.content)
        ? page.content
        : [page.content];
    }

    // Prepare update data with all necessary fields
    const updateData = {
      title: page.title,
      content: contentToSave,
      parentId: page.parentId,
      icon: page.icon,
    };

    console.log(
      "Updating note in Supabase with data:",
      JSON.stringify({
        title: updateData.title,
        icon: updateData.icon,
        contentBlockCount: contentToSave.length,
      })
    );

    const noteResult = await updateNote(userId, page.id, updateData);

    if (!noteResult.success) {
      console.warn("Failed to update note in Supabase:", noteResult.error);
      throw new Error("Failed to save page to Supabase");
    }

    console.log("Page successfully saved to Supabase");
    return updatedPage;
  } catch (error) {
    console.error("Error saving page:", error);
    throw new Error("Failed to save page");
  }
};

/**
 * Delete a page and its children
 * @param {string} id - ID of the page to delete
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<boolean>} - Success status
 */
const deletePage = async (id, userId = null) => {
  try {
    if (!id || !userId) return false;

    // Get all notes from Supabase
    const result = await fetchSupabaseNotesOnly(userId);
    if (!result.success) return false;

    // Find the page to be deleted and all its descendants
    const pages = result.notes;
    const idsToDelete = collectPageAndDescendantIds(pages, id);

    console.log(
      `Deleting page ${id} and ${idsToDelete.length - 1} descendants`
    );

    // Delete notes in Supabase - use hard delete to completely remove them
    for (const pageId of idsToDelete) {
      const deleteResult = await deleteNote(userId, pageId, true); // true for hard delete
      if (!deleteResult.success) {
        console.warn(
          `Failed to delete note ${pageId} in Supabase:`,
          deleteResult.error
        );
      }
    }

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
 * Load all pages from Supabase
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Array>} - Array of page objects
 */
const loadAllPages = async (userId = null) => {
  try {
    if (!userId) {
      return [];
    }

    // Fetch notes from Supabase
    const result = await fetchSupabaseNotesOnly(userId);

    if (result.success) {
      return result.notes;
    }

    return [];
  } catch (error) {
    console.error("Error loading all pages:", error);
    return [];
  }
};

/**
 * Get root pages (pages without a parent)
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Array>} - Array of root page objects
 */
const getRootPages = async (userId = null) => {
  try {
    if (!userId) {
      return [];
    }

    // Fetch all pages
    const pages = await loadAllPages(userId);

    // Filter for root pages (no parentId)
    return pages.filter((page) => !page.parentId);
  } catch (error) {
    console.error("Error getting root pages:", error);
    return [];
  }
};

/**
 * Get child pages of a parent page
 * @param {string} parentId - Parent page ID
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<Array>} - Array of child page objects
 */
const getChildPages = async (parentId, userId = null) => {
  try {
    if (!parentId || !userId) {
      return [];
    }

    // Fetch all pages
    const pages = await loadAllPages(userId);

    // Filter for children of the specified parent
    return pages.filter((page) => page.parentId === parentId);
  } catch (error) {
    console.error("Error getting child pages:", error);
    return [];
  }
};

/**
 * Create test pages for debugging
 * @param {string|null} userId - User ID for authenticated users
 * @returns {Promise<boolean>} - Success status
 */
const createTestPages = async (userId = null) => {
  try {
    if (!userId) {
      console.log("User not authenticated, skipping test page creation");
      return false;
    }

    // Check if test pages have already been created for this user
    const { data: existingPages, error } = await supabase
      .from("notes")
      .select("id")
      .eq("user_id", userId)
      .limit(1);

    if (error) {
      console.error("Error checking for existing pages:", error);
      return false;
    }

    // If user already has pages, don't create test pages
    if (existingPages && existingPages.length > 0) {
      console.log("User already has pages, skipping test page creation");
      return false;
    }

    console.log("Creating test pages...");

    // Create a root page
    const rootPage = await createPage(null, "Getting Started", "📚", userId);

    // Create some child pages
    const welcomePage = await createPage(
      rootPage.id,
      "Welcome to VoiceNotion",
      "👋",
      userId
    );

    const voiceCommandsPage = await createPage(
      rootPage.id,
      "Voice Commands",
      "🎤",
      userId
    );

    const featuresPage = await createPage(
      rootPage.id,
      "Key Features",
      "✨",
      userId
    );

    console.log("Test pages created successfully");
    return true;
  } catch (error) {
    console.error("Error creating test pages:", error);
    return false;
  }
};

export default {
  createPage,
  getPageById,
  savePage,
  deletePage,
  loadAllPages,
  getRootPages,
  getChildPages,
  createTestPages,
};
