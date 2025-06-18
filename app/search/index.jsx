import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Keyboard,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../utils/themeContext";
import ScreenHeader from "../../components/ScreenHeader";
import FilterChips from "../../components/FilterChips";
import { SafeAreaView } from "react-native-safe-area-context";
import usePageStorage from "../../hooks/usePageStorage";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Maximum number of recent searches to store
const MAX_RECENT_SEARCHES = 5;
const RECENT_SEARCHES_KEY = "voicenotion_recent_searches";

export default function SearchScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [recentSearches, setRecentSearches] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Get page storage functionality
  const { pages, loading, loadPages } = usePageStorage();

  // Load recent searches from storage on component mount
  useEffect(() => {
    const loadRecentSearches = async () => {
      try {
        const storedSearches = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
        if (storedSearches) {
          setRecentSearches(JSON.parse(storedSearches));
        }
      } catch (error) {
        console.error("Error loading recent searches:", error);
      }
    };

    loadRecentSearches();
  }, []);

  // Filter for search results
  const searchFilters = [
    { id: "all", name: "All" },
    { id: "title", name: "Title" },
    { id: "content", name: "Content" },
  ];

  // Save a search query to recent searches
  const saveRecentSearch = useCallback(
    async (query) => {
      if (!query.trim()) return;

      try {
        // Add to the beginning and remove duplicates
        const updatedSearches = [
          query,
          ...recentSearches.filter((item) => item !== query),
        ].slice(0, MAX_RECENT_SEARCHES);

        setRecentSearches(updatedSearches);
        await AsyncStorage.setItem(
          RECENT_SEARCHES_KEY,
          JSON.stringify(updatedSearches)
        );
      } catch (error) {
        console.error("Error saving recent search:", error);
      }
    },
    [recentSearches]
  );

  // Search pages when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const performSearch = async () => {
      setIsSearching(true);

      try {
        // Make sure we have the latest pages
        // Only load pages if we don't already have them
        if (pages.length === 0) {
          await loadPages();
        }

        const query = searchQuery.toLowerCase().trim();
        const results = pages.filter((page) => {
          // Parse content JSON if it exists
          let pageContent = "";
          try {
            if (page.contentJson) {
              const contentObj = JSON.parse(page.contentJson);
              pageContent = extractTextFromContent(contentObj);
            }
          } catch (error) {
            console.error("Error parsing page content:", error);
          }

          // Search based on active filter
          if (activeFilter === "all" || activeFilter === "title") {
            if (page.title?.toLowerCase().includes(query)) return true;
          }

          if (activeFilter === "all" || activeFilter === "content") {
            if (pageContent.toLowerCase().includes(query)) return true;
          }

          return false;
        });

        // Sort results by relevance and recency
        const sortedResults = results.sort((a, b) => {
          // First prioritize exact title matches
          const aExactTitle = a.title?.toLowerCase() === query;
          const bExactTitle = b.title?.toLowerCase() === query;

          if (aExactTitle && !bExactTitle) return -1;
          if (!aExactTitle && bExactTitle) return 1;

          // Then prioritize title contains
          const aTitleMatch = a.title?.toLowerCase().includes(query);
          const bTitleMatch = b.title?.toLowerCase().includes(query);

          if (aTitleMatch && !bTitleMatch) return -1;
          if (!aTitleMatch && bTitleMatch) return 1;

          // Finally sort by recency
          return b.updatedAt - a.updatedAt;
        });

        setSearchResults(sortedResults);

        // Save to recent searches if we have results
        if (sortedResults.length > 0) {
          saveRecentSearch(query);
        }
      } catch (error) {
        console.error("Error performing search:", error);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search to avoid excessive processing
    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, activeFilter, pages, loadPages, saveRecentSearch]);

  // Extract text content from page content JSON
  const extractTextFromContent = (contentArray) => {
    if (!Array.isArray(contentArray)) return "";

    let textContent = "";

    const processBlock = (block) => {
      if (block.content && Array.isArray(block.content)) {
        block.content.forEach((item) => {
          if (item.type === "text" && item.text) {
            textContent += item.text + " ";
          }
        });
      }

      if (block.children && Array.isArray(block.children)) {
        block.children.forEach((child) => processBlock(child));
      }
    };

    contentArray.forEach((block) => processBlock(block));
    return textContent;
  };

  // Handle filter change
  const handleFilterChange = (filterId) => {
    setActiveFilter(filterId);
  };

  // Handle selecting a recent search
  const handleRecentSearchSelect = (search) => {
    setSearchQuery(search);
  };

  // Clear search
  const handleClearSearch = () => {
    setSearchQuery("");
  };

  // Navigate to a page
  const handlePagePress = (pageId) => {
    router.push(`/note/${pageId}`);
  };

  // Clear all recent searches
  const handleClearAllRecentSearches = async () => {
    try {
      setRecentSearches([]);
      await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch (error) {
      console.error("Error clearing recent searches:", error);
    }
  };

  // Render recent searches
  const renderRecentSearches = () => (
    <View style={styles.recentSearchesContainer}>
      <View style={styles.recentSearchesHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          Recent Searches
        </Text>
        {recentSearches.length > 0 && (
          <TouchableOpacity onPress={handleClearAllRecentSearches}>
            <Text style={[styles.clearAllText, { color: theme.primary }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {recentSearches.length > 0 ? (
        recentSearches.map((search, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.recentSearchItem,
              { borderBottomColor: theme.border },
            ]}
            onPress={() => handleRecentSearchSelect(search)}
          >
            <Ionicons name="time-outline" size={18} color={theme.icon} />
            <Text
              style={[styles.recentSearchText, { color: theme.secondaryText }]}
            >
              {search}
            </Text>
          </TouchableOpacity>
        ))
      ) : (
        <Text style={[styles.emptyText, { color: theme.tertiaryText }]}>
          No recent searches
        </Text>
      )}
    </View>
  );

  // Render a search result item with highlighted matches
  const renderSearchResultItem = useCallback(
    ({ item }) => {
      // Get a preview of the content with highlighted match
      let contentPreview = "";
      try {
        if (item.contentJson) {
          const contentObj = JSON.parse(item.contentJson);
          contentPreview = extractTextFromContent(contentObj);
        }
      } catch (error) {
        contentPreview = "Error loading content";
      }

      // Truncate content preview
      contentPreview =
        contentPreview.length > 100
          ? contentPreview.substring(0, 100) + "..."
          : contentPreview;

      // Format date
      const formattedDate = formatDate(item.updatedAt);

      return (
        <TouchableOpacity
          style={[
            styles.resultItem,
            { backgroundColor: theme.card.background },
          ]}
          onPress={() => handlePagePress(item.id)}
        >
          <View style={styles.resultHeader}>
            <Text style={[styles.resultIcon]}>{item.icon || "📄"}</Text>
            <Text
              style={[styles.resultTitle, { color: theme.text }]}
              numberOfLines={1}
            >
              {highlightMatch(item.title, searchQuery)}
            </Text>
          </View>

          <Text
            style={[styles.resultPreview, { color: theme.secondaryText }]}
            numberOfLines={2}
          >
            {highlightMatch(contentPreview, searchQuery)}
          </Text>

          <View style={styles.resultFooter}>
            <Text style={[styles.resultDate, { color: theme.tertiaryText }]}>
              {formattedDate}
            </Text>

            <View style={styles.resultBadge}>
              <Ionicons
                name="document-text-outline"
                size={12}
                color={theme.icon}
              />
              <Text
                style={[styles.resultBadgeText, { color: theme.tertiaryText }]}
              >
                Note
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      );
    },
    [searchQuery, theme, handlePagePress]
  );

  // Format date for display
  const formatDate = (timestamp) => {
    if (!timestamp) return "";

    const date = new Date(timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year:
          date.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
      });
    }
  };

  // Highlight matching text
  const highlightMatch = (text, query) => {
    if (!text || !query || query.trim() === "") return text;

    const parts = text.split(new RegExp(`(${query})`, "gi"));

    return parts.map((part, index) =>
      part.toLowerCase() === query.toLowerCase() ? (
        <Text
          key={index}
          style={[
            styles.highlightedText,
            { backgroundColor: theme.primary + "40" },
          ]}
        >
          {part}
        </Text>
      ) : (
        part
      )
    );
  };

  // Right button for header - voice search
  const headerRight = (
    <TouchableOpacity style={styles.headerButton}>
      <Ionicons name="mic-outline" size={24} color={theme.text} />
    </TouchableOpacity>
  );

  // Loading state while pages are being loaded
  if (loading && !searchQuery) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <ScreenHeader title="Search" rightElement={headerRight} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading notes...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScreenHeader title="Search" rightElement={headerRight} />

      <View
        style={[styles.searchContainer, { borderBottomColor: theme.border }]}
      >
        <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
          <Ionicons
            name="search"
            size={20}
            color={theme.icon}
            style={styles.searchIcon}
          />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search notes..."
            placeholderTextColor={theme.tertiaryText}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCapitalize="none"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleClearSearch}>
              <Ionicons name="close-circle" size={18} color={theme.icon} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {searchQuery.length > 0 && (
        <>
          <FilterChips
            filters={searchFilters}
            activeFilter={activeFilter}
            onFilterChange={handleFilterChange}
          />

          {isSearching ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text
                style={[styles.loadingText, { color: theme.secondaryText }]}
              >
                Searching...
              </Text>
            </View>
          ) : (
            <FlatList
              data={searchResults}
              keyExtractor={(item) => item.id}
              renderItem={renderSearchResultItem}
              contentContainerStyle={styles.resultsList}
              removeClippedSubviews={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="search-outline"
                    size={48}
                    color={theme.tertiaryText}
                    style={styles.emptyIcon}
                  />
                  <Text
                    style={[styles.emptyText, { color: theme.secondaryText }]}
                  >
                    No results found for "{searchQuery}"
                  </Text>
                </View>
              }
            />
          )}
        </>
      )}

      {searchQuery.length === 0 && renderRecentSearches()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 10,
    height: 40,
  },
  searchIcon: {
    marginRight: 6,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    marginLeft: 4,
  },
  resultsList: {
    padding: 16,
    paddingTop: 10,
  },
  resultItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  resultTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  resultPreview: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  resultFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  resultDate: {
    fontSize: 12,
  },
  resultBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  resultBadgeText: {
    fontSize: 12,
    marginLeft: 4,
  },
  highlightedText: {
    fontWeight: "600",
    borderRadius: 2,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  emptyIcon: {
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
  recentSearchesContainer: {
    padding: 20,
  },
  recentSearchesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  clearAllText: {
    fontSize: 14,
  },
  recentSearchItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  recentSearchText: {
    fontSize: 15,
    marginLeft: 12,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
});
