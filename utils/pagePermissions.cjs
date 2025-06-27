/**
 * CommonJS version of pagePermissions for Node.js testing
 */

/**
 * Check if the current user is the owner of a page
 */
const isPageOwner = (page, userId) => {
  if (!page || !userId) return false;
  return page.user_id === userId || page.userId === userId;
};

/**
 * Check if the current user is a collaborator (not owner) on a page
 */
const isPageCollaborator = (page, userId) => {
  if (!page || !userId) return false;
  return page.isSharedWithUser === true && !isPageOwner(page, userId);
};

/**
 * Check if the current user can edit a page (owner or collaborator)
 */
const canEditPage = (page, userId) => {
  return isPageOwner(page, userId) || isPageCollaborator(page, userId);
};

/**
 * Check if the current user can delete a page (only owners)
 */
const canDeletePage = (page, userId) => {
  return isPageOwner(page, userId);
};

/**
 * Check if the current user can share a page (only owners)
 */
const canSharePage = (page, userId) => {
  return isPageOwner(page, userId);
};

/**
 * Get the user's role on a page
 */
const getUserPageRole = (page, userId) => {
  if (isPageOwner(page, userId)) return "owner";
  if (isPageCollaborator(page, userId)) return "collaborator";
  return "none";
};

/**
 * Log user permissions for debugging
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

module.exports = {
  isPageOwner,
  isPageCollaborator,
  canEditPage,
  canDeletePage,
  canSharePage,
  getUserPageRole,
  logUserPermissions,
};
