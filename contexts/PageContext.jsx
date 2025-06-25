import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { pageStorage } from '../services/pageStorage';

const PageContext = createContext();

export const usePageContext = () => {
  const context = useContext(PageContext);
  if (!context) {
    throw new Error('usePageContext must be used within a PageProvider');
  }
  return context;
};

export const PageProvider = ({ children }) => {
  const [pages, setPages] = useState(new Map());
  const [loading, setLoading] = useState(false);
  const [subscribers, setSubscribers] = useState(new Set());

  // Load all pages initially
  useEffect(() => {
    const loadPages = async () => {
      setLoading(true);
      try {
        const allPages = await pageStorage.getAllPages();
        const pagesMap = new Map();
        allPages.forEach(page => {
          pagesMap.set(page.id, page);
        });
        setPages(pagesMap);
      } catch (error) {
        console.error('Error loading pages:', error);
      } finally {
        setLoading(false);
      }
    };

    loadPages();
  }, []);

  // Subscribe to page changes
  const subscribePage = useCallback((pageId, callback) => {
    const subscription = { pageId, callback };
    setSubscribers(prev => new Set([...prev, subscription]));
    
    return () => {
      setSubscribers(prev => {
        const newSet = new Set(prev);
        newSet.delete(subscription);
        return newSet;
      });
    };
  }, []);

  // Notify subscribers when a page changes
  const notifySubscribers = useCallback((pageId, pageData) => {
    subscribers.forEach(subscription => {
      if (subscription.pageId === pageId || subscription.pageId === '*') {
        subscription.callback(pageData, pageId);
      }
    });
  }, [subscribers]);

  // Get a specific page
  const getPage = useCallback((pageId) => {
    return pages.get(pageId);
  }, [pages]);

  // Update a page in both local state and storage
  const updatePage = useCallback(async (pageId, updates) => {
    try {
      // Update in storage first
      const updatedPage = await pageStorage.updatePage(pageId, updates);
      
      // Update local state
      setPages(prev => {
        const newPages = new Map(prev);
        newPages.set(pageId, updatedPage);
        return newPages;
      });

      // Notify subscribers
      notifySubscribers(pageId, updatedPage);
      
      return updatedPage;
    } catch (error) {
      console.error('Error updating page:', error);
      throw error;
    }
  }, [notifySubscribers]);

  // Create a new page
  const createPage = useCallback(async (pageData) => {
    try {
      const newPage = await pageStorage.savePage(pageData);
      
      // Update local state
      setPages(prev => {
        const newPages = new Map(prev);
        newPages.set(newPage.id, newPage);
        return newPages;
      });

      // Notify subscribers about new page
      notifySubscribers('*', newPage);
      
      return newPage;
    } catch (error) {
      console.error('Error creating page:', error);
      throw error;
    }
  }, [notifySubscribers]);

  // Delete a page
  const deletePage = useCallback(async (pageId) => {
    try {
      await pageStorage.deletePage(pageId);
      
      // Update local state
      setPages(prev => {
        const newPages = new Map(prev);
        newPages.delete(pageId);
        return newPages;
      });

      // Notify subscribers about deletion
      notifySubscribers(pageId, null);
      notifySubscribers('*', null);
      
    } catch (error) {
      console.error('Error deleting page:', error);
      throw error;
    }
  }, [notifySubscribers]);

  // Refresh a specific page from storage
  const refreshPage = useCallback(async (pageId) => {
    try {
      const refreshedPage = await pageStorage.getPage(pageId);
      if (refreshedPage) {
        setPages(prev => {
          const newPages = new Map(prev);
          newPages.set(pageId, refreshedPage);
          return newPages;
        });
        notifySubscribers(pageId, refreshedPage);
      } else {
        // Page was deleted
        setPages(prev => {
          const newPages = new Map(prev);
          newPages.delete(pageId);
          return newPages;
        });
        notifySubscribers(pageId, null);
      }
      return refreshedPage;
    } catch (error) {
      console.error('Error refreshing page:', error);
      throw error;
    }
  }, [notifySubscribers]);

  // Get nested pages for a parent
  const getNestedPages = useCallback((parentId) => {
    const nestedPages = [];
    pages.forEach(page => {
      if (page.parent_id === parentId) {
        nestedPages.push(page);
      }
    });
    return nestedPages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }, [pages]);

  // Refresh all pages
  const refreshAllPages = useCallback(async () => {
    setLoading(true);
    try {
      const allPages = await pageStorage.getAllPages();
      const pagesMap = new Map();
      allPages.forEach(page => {
        pagesMap.set(page.id, page);
      });
      setPages(pagesMap);
      
      // Notify global subscribers
      notifySubscribers('*', null);
    } catch (error) {
      console.error('Error refreshing all pages:', error);
    } finally {
      setLoading(false);
    }
  }, [notifySubscribers]);

  const value = {
    pages,
    loading,
    getPage,
    updatePage,
    createPage,
    deletePage,
    refreshPage,
    getNestedPages,
    refreshAllPages,
    subscribePage,
  };

  return (
    <PageContext.Provider value={value}>
      {children}
    </PageContext.Provider>
  );
};
