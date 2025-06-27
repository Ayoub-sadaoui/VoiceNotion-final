/**
 * Utility functions for working with page hierarchies
 */

/**
 * Build a tree structure from a flat list of pages
 * @param {Array} pages - Array of page objects
 * @param {string|null} parentId - ID of parent page or null for root level
 * @returns {Array} Array of page objects with children property
 */
const buildPageTree = (pages, parentId = null) => {
  return pages
    .filter((page) => page.parentId === parentId)
    .map((page) => ({
      ...page,
      children: buildPageTree(pages, page.id),
    }));
};

/**
 * Build a tree structure for shared pages, treating orphaned pages as root pages
 * @param {Array} sharedPages - Array of shared page objects
 * @returns {Array} Array of page objects with children property
 */
const buildSharedPageTree = (sharedPages) => {
  const sharedPageIds = new Set(sharedPages.map((page) => page.id));

  // Find root pages: either parentId is null OR parent is not in shared pages
  const rootPages = sharedPages.filter(
    (page) => !page.parentId || !sharedPageIds.has(page.parentId)
  );

  // Build tree recursively for each root page
  return rootPages.map((page) => ({
    ...page,
    children: buildPageTreeForShared(sharedPages, page.id, sharedPageIds),
  }));
};

/**
 * Helper function to build tree recursively for shared pages
 * @param {Array} sharedPages - Array of shared page objects
 * @param {string} parentId - ID of parent page
 * @param {Set} sharedPageIds - Set of shared page IDs for quick lookup
 * @returns {Array} Array of child page objects
 */
const buildPageTreeForShared = (sharedPages, parentId, sharedPageIds) => {
  return sharedPages
    .filter((page) => page.parentId === parentId)
    .map((page) => ({
      ...page,
      children: buildPageTreeForShared(sharedPages, page.id, sharedPageIds),
    }));
};

/**
 * Get the full path of a page (breadcrumb path)
 * @param {Array} allPages - Array of all page objects
 * @param {string} pageId - ID of the page to get path for
 * @returns {Array} Array of page objects representing the path from root to the page
 */
const getPagePath = (allPages, pageId) => {
  const pagesMap = new Map(allPages.map((page) => [page.id, page]));
  const path = [];

  let currentId = pageId;
  while (currentId) {
    const page = pagesMap.get(currentId);
    if (!page) break;

    path.unshift(page);
    currentId = page.parentId;
  }

  return path;
};

/**
 * Find the root ancestor of a page
 * @param {Array} allPages - Array of all page objects
 * @param {string} pageId - ID of the page to find root for
 * @returns {Object|null} Root page object or null if not found
 */
const findRootAncestor = (allPages, pageId) => {
  const path = getPagePath(allPages, pageId);
  return path.length > 0 ? path[0] : null;
};

export { buildPageTree, buildSharedPageTree, getPagePath, findRootAncestor };
