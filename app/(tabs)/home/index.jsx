import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useTheme } from "../../../utils/themeContext";
import { notes, filters, folders } from "../../../utils/mockData";
import ScreenHeader from "../../../components/ScreenHeader";
import FilterChips from "../../../components/FilterChips";
import NoteCard from "../../../components/NoteCard";
import FloatingActionButton from "../../../components/FloatingActionButton";

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("all");
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Filter notes based on selected filter
  const filteredNotes = notes.filter((note) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "pinned") return note.isPinned;
    if (activeFilter === "recent") {
      // Show notes from the last week
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      return new Date(note.updatedAt) > oneWeekAgo;
    }
    return note.category === activeFilter;
  });

  // Sort notes: pinned first, then by updatedAt date (newest first)
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt) - new Date(a.updatedAt);
  });

  // Handle filter change
  const handleFilterChange = (filterId) => {
    // Animate content fade out
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      // Change filter
      setActiveFilter(filterId);

      // Animate content fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);

    // Simulate data refresh
    setTimeout(() => {
      // Fade in animation when data is refreshed
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

      setRefreshing(false);
    }, 1500);
  }, []);

  // Handle creating a new note
  const handleCreateNote = () => {
    // Add animation before navigating
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.5,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to editor with empty note
      router.push("/editor");
    });
  };

  // Right element for the header (search button)
  const headerRight = (
    <TouchableOpacity
      onPress={() => router.push("/search")}
      style={styles.headerButton}
      activeOpacity={0.7}
    >
      <Ionicons name="search-outline" size={24} color={theme.text} />
    </TouchableOpacity>
  );

  // Render item with fade-in animation
  const renderItem = ({ item, index }) => {
    // Staggered animations for list items
    const delay = index * 50;
    return (
      <Animated.View
        style={{
          opacity: fadeAnim,
          transform: [
            {
              translateY: fadeAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [20, 0],
              }),
            },
          ],
        }}
      >
        <NoteCard note={item} />
      </Animated.View>
    );
  };

  // When component mounts, fade in the content
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScreenHeader title="Notes" rightElement={headerRight} />

      <FilterChips filters={filters} onFilterChange={handleFilterChange} />

      <FlatList
        data={sortedNotes}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.notesList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            {refreshing ? (
              <ActivityIndicator size="large" color={theme.primary} />
            ) : (
              <>
                <Ionicons
                  name="document-outline"
                  size={64}
                  color={theme.tertiaryText}
                />
                <Animated.Text
                  style={[
                    styles.emptyText,
                    { color: theme.secondaryText, opacity: fadeAnim },
                  ]}
                >
                  No notes found
                </Animated.Text>
              </>
            )}
          </View>
        }
      />

      <FloatingActionButton
        onPress={handleCreateNote}
        icon={<Ionicons name="add" size={24} color="#FFFFFF" />}
      />
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
  notesList: {
    padding: 20,
    paddingTop: 10,
    minHeight: "100%",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
});
