import { useEffect, useCallback, useRef } from 'react';
import { usePageContext } from '../contexts/PageContext';

/**
 * Custom hook for managing page link block synchronization
 * Ensures all page link blocks stay up-to-date with the actual page data
 */
export const usePageLinkSync = (editor, pageId = null) => {
  const { getPage, subscribePage, getNestedPages } = usePageContext();
  const syncTimeoutRef = useRef(null);
  const lastSyncRef = useRef(new Map());

  // Debounced sync function to prevent rapid updates
  const debouncedSync = useCallback((delayMs = 100) => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    
    syncTimeoutRef.current = setTimeout(() => {
      syncPageLinks();
    }, delayMs);
  }, []);

  // Main sync function that updates all page link blocks
  const syncPageLinks = useCallback(() => {
    if (!editor || !editor.topLevelBlocks) return;

    console.log('🔄 Syncing page link blocks...');
    
    let hasUpdates = false;
    const currentTime = Date.now();

    // Get all current page link blocks
    const pageLinkBlocks = editor.topLevelBlocks.filter(
      block => block.type === 'pageLink' && block.props?.pageId
    );

    // Process each page link block
    pageLinkBlocks.forEach(block => {
      const linkedPageId = block.props.pageId;
      const linkedPage = getPage(linkedPageId);

      // Check if we've synced this block recently to prevent loops
      const lastSync = lastSyncRef.current.get(block.id);
      if (lastSync && (currentTime - lastSync) < 500) {
        return; // Skip if synced recently
      }

      if (linkedPage) {
        // Page exists - check if data needs updating
        const needsUpdate = 
          block.props.pageTitle !== linkedPage.title ||
          block.props.pageIcon !== linkedPage.icon;

        if (needsUpdate) {
          console.log(`📝 Updating page link: ${linkedPage.title}`);
          
          try {
            editor.updateBlock(block, {
              type: 'pageLink',
              props: {
                pageId: linkedPage.id,
                pageTitle: linkedPage.title || 'Untitled Page',
                pageIcon: linkedPage.icon || '📄',
              },
            });
            
            lastSyncRef.current.set(block.id, currentTime);
            hasUpdates = true;
          } catch (error) {
            console.error('Error updating page link block:', error);
          }
        }
      } else {
        // Page no longer exists - remove the block
        console.log(`🗑️ Removing orphaned page link: ${linkedPageId}`);
        
        try {
          editor.removeBlocks([block]);
          lastSyncRef.current.delete(block.id);
          hasUpdates = true;
        } catch (error) {
          console.error('Error removing orphaned page link block:', error);
        }
      }
    });

    // If this is a parent page, check for missing page link blocks
    if (pageId) {
      const nestedPages = getNestedPages(pageId);
      const existingPageIds = pageLinkBlocks.map(block => block.props.pageId);
      const missingPages = nestedPages.filter(page => !existingPageIds.includes(page.id));

      if (missingPages.length > 0) {
        console.log(`➕ Adding ${missingPages.length} missing page link blocks`);
        
        try {
          // Insert missing page link blocks at the end
          const blocksToInsert = missingPages.map(page => ({
            type: 'pageLink',
            props: {
              pageId: page.id,
              pageTitle: page.title || 'Untitled Page',
              pageIcon: page.icon || '📄',
            },
          }));

          // Get the last block to insert after it
          const lastBlock = editor.topLevelBlocks.length > 0 
            ? editor.topLevelBlocks[editor.topLevelBlocks.length - 1]
            : null;

          if (lastBlock) {
            editor.insertBlocks(blocksToInsert, lastBlock, 'after');
          } else {
            editor.insertBlocks(blocksToInsert, editor.topLevelBlocks[0], 'before');
          }
          
          hasUpdates = true;
        } catch (error) {
          console.error('Error inserting missing page link blocks:', error);
        }
      }
    }

    if (hasUpdates) {
      console.log('✅ Page link sync completed with updates');
    }
  }, [editor, getPage, getNestedPages, pageId]);

  // Subscribe to page changes
  useEffect(() => {
    if (!editor) return;

    // Subscribe to all page changes
    const unsubscribeAll = subscribePage('*', (updatedPage, changedPageId) => {
      console.log(`📡 Page change detected: ${changedPageId}`, updatedPage);
      debouncedSync(200);
    });

    // Also subscribe to specific page changes if pageId is provided
    let unsubscribeSpecific = null;
    if (pageId) {
      unsubscribeSpecific = subscribePage(pageId, (updatedPage) => {
        console.log(`📡 Specific page change detected: ${pageId}`, updatedPage);
        debouncedSync(200);
      });
    }

    return () => {
      unsubscribeAll();
      if (unsubscribeSpecific) {
        unsubscribeSpecific();
      }
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [editor, pageId, subscribePage, debouncedSync]);

  // Initial sync when editor is ready
  useEffect(() => {
    if (editor && editor.topLevelBlocks) {
      debouncedSync(500); // Initial sync with longer delay
    }
  }, [editor, debouncedSync]);

  // Manual sync function for external triggers
  const manualSync = useCallback(() => {
    console.log('🔄 Manual page link sync triggered');
    syncPageLinks();
  }, [syncPageLinks]);

  return {
    syncPageLinks: manualSync,
  };
};
