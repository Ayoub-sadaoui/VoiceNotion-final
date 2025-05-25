import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../utils/themeContext";
import { notes, filters } from "../../../utils/mockData";
import ScreenHeader from "../../../components/ScreenHeader";
import NoteCard from "../../../components/NoteCard";
import FilterChips from "../../../components/FilterChips";

export default function SearchScreen() {
  const { theme } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [activeFilter, setActiveFilter] = useState("all");
  const [recentSearches, setRecentSearches] = useState([
    "project ideas",
    "meeting notes",
    "book recommendations",
  ]);

  // Filter for search results
  const searchFilters = [
    { id: "all", name: "All" },
    { id: "title", name: "Title" },
    { id: "content", name: "Content" },
    { id: "tag", name: "Tags" },
  ];

  // Search notes when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const query = searchQuery.toLowerCase().trim();
    const results = notes.filter((note) => {
      if (activeFilter === "all" || activeFilter === "title") {
        if (note.title.toLowerCase().includes(query)) return true;
      }

      if (activeFilter === "all" || activeFilter === "content") {
        if (note.content.toLowerCase().includes(query)) return true;
      }

      if (activeFilter === "all" || activeFilter === "tag") {
        if (
          note.tags &&
          note.tags.some((tag) => tag.toLowerCase().includes(query))
        )
          return true;
      }

      return false;
    });

    setSearchResults(results);
  }, [searchQuery, activeFilter]);

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

  // Render recent searches
  const renderRecentSearches = () => (
    <View style={styles.recentSearchesContainer}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>
        Recent Searches
      </Text>

      {recentSearches.map((search, index) => (
        <TouchableOpacity
          key={index}
          style={[styles.recentSearchItem, { borderBottomColor: theme.border }]}
          onPress={() => handleRecentSearchSelect(search)}
        >
          <Ionicons name="time-outline" size={18} color={theme.icon} />
          <Text
            style={[styles.recentSearchText, { color: theme.secondaryText }]}
          >
            {search}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Right button for header
  const headerRight = (
    <TouchableOpacity style={styles.headerButton}>
      <Ionicons name="mic-outline" size={24} color={theme.text} />
    </TouchableOpacity>
  );

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
            onFilterChange={handleFilterChange}
          />

          <FlatList
            data={searchResults}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <NoteCard note={item} />}
            contentContainerStyle={styles.resultsList}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: theme.secondaryText }]}
                >
                  No results found for "{searchQuery}"
                </Text>
              </View>
            }
          />
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
    padding: 20,
    paddingTop: 10,
  },
  emptyContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 40,
  },
  emptyText: {
    fontSize: 16,
  },
  recentSearchesContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
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
});
