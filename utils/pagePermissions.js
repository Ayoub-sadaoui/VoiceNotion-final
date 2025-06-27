/**
 * Utility functions for managing user permissions on pages
 */

/**
 * Check if the current user is the owner of a page
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {boolean} - True if user is the owner
 */
const isPageOwner = (page, userId) => {
  if (!page || !userId) return false;

  // Check if the page has user_id field and matches current user
  return page.user_id === userId || page.userId === userId;
};

/**
 * Check if the current user is a collaborator (not owner) on a page
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {boolean} - True if user is a collaborator
 */
const isPageCollaborator = (page, userId) => {
  if (!page || !userId) return false;

  // User is a collaborator if they have access but are not the owner
  return page.isSharedWithUser === true && !isPageOwner(page, userId);
};

/**
 * Check if the current user can edit a page (owner or collaborator)
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {boolean} - True if user can edit
 */
const canEditPage = (page, userId) => {
  return isPageOwner(page, userId) || isPageCollaborator(page, userId);
};

/**
 * Check if the current user can delete a page (only owners)
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {boolean} - True if user can delete
 */
const canDeletePage = (page, userId) => {
  return isPageOwner(page, userId);
};

/**
 * Check if the current user can share a page (only owners)
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {boolean} - True if user can share
 */
const canSharePage = (page, userId) => {
  return isPageOwner(page, userId);
};

/**
 * Get the user's role on a page
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @returns {string} - 'owner', 'collaborator', or 'none'
 */
const getUserPageRole = (page, userId) => {
  if (isPageOwner(page, userId)) return "owner";
  if (isPageCollaborator(page, userId)) return "collaborator";
  return "none";
};

/**
 * Log user permissions for debugging
 * @param {Object} page - The page object
 * @param {string} userId - The current user's ID
 * @param {string} context - Context for logging (e.g., 'NoteScreen')
 */
const logUserPermissions = (page, userId, context = "") => {
  if (!page || !userId) return;

  const role = getUserPageRole(page, userId);
  const permissions = {
    canEdit: canEditPage(page, userId),
    canDelete: canDeletePage(page, userId),
    canShare: canSharePage(page, userId),
  };

  console.log(`🔐 ${context} - User permissions:`, {
    pageId: page.id?.substring(0, 8) + "...",
    pageTitle: page.title,
    userId: userId?.substring(0, 8) + "...",
    role,
    permissions,
    pageOwnerId: page.user_id?.substring(0, 8) + "..." || "unknown",
    isSharedWithUser: page.isSharedWithUser,
  });
};

// ES module exports for React Native
export {
  isPageOwner,
  isPageCollaborator,
  canEditPage,
  canDeletePage,
  canSharePage,
  getUserPageRole,
  logUserPermissions,
};
