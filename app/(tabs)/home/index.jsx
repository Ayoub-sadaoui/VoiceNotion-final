import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Pressable,
  Alert,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useRouter, Link } from "expo-router";
import { useTheme } from "../../../utils/themeContext";
import ScreenHeader from "../../../components/ScreenHeader";
import FloatingActionButton from "../../../components/FloatingActionButton";
import usePageStorage from "../../../hooks/usePageStorage";
import { buildPageTree } from "../../../utils/pageUtils";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Toast from "react-native-toast-message";

// Recursive component for rendering a page tree item and its children
const PageTreeItem = ({
  page,
  level = 0,
  onPress,
  theme,
  expanded = false,
  onToggleExpand,
  onAddSubpage,
  onDeletePage,
}) => {
  // State to track if this item's children are expanded
  const [isExpanded, setIsExpanded] = useState(expanded);
  const [isHovered, setIsHovered] = useState(false);
  const swipeableRef = React.useRef(null);

  // Calculate indentation based on level
  const indentation = level * 16;

  // Toggle expansion state
  const toggleExpand = useCallback(
    (e) => {
      e.stopPropagation();
      const newState = !isExpanded;
      setIsExpanded(newState);
      if (onToggleExpand) {
        onToggleExpand(page.id, newState);
      }
    },
    [isExpanded, page.id, onToggleExpand]
  );

  // Add a subpage to this page
  const handleAddSubpage = useCallback(
    (e) => {
      e.stopPropagation();
      if (onAddSubpage) {
        onAddSubpage(page.id);
      }
    },
    [page.id, onAddSubpage]
  );

  // Handle delete page
  const handleDeletePage = useCallback(() => {
    // Close swipeable
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }

    // Confirm deletion
    Alert.alert(
      "Delete Page",
      `Are you sure you want to delete "${page.title}" and all its subpages?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          onPress: () => {
            if (onDeletePage) {
              onDeletePage(page.id);
            }
          },
          style: "destructive",
        },
      ]
    );
  }, [page.id, onDeletePage]);

  // Render right swipe actions
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [-100, 0],
      outputRange: [0, 100],
      extrapolate: "clamp",
    });

    // Scale animation for the trash icon
    const scale = progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0.6, 1],
      extrapolate: "clamp",
    });

    return (
      <View style={styles.deleteContainer}>
        <Animated.View
          style={[
            styles.deleteButton,
            {
              backgroundColor: theme.error || "#FF3B30",
              transform: [{ scale }],
            },
          ]}
        >
          <TouchableOpacity
            style={{
              width: "100%",
              height: "100%",
              justifyContent: "center",
              alignItems: "center",
            }}
            onPress={handleDeletePage}
          >
            <Animated.View
              style={{
                transform: [{ translateX: 0 }],
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="trash-outline" size={20} color="white" />
              <Text style={styles.deleteText}>Delete</Text>
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
      </View>
    );
  };

  // Children recursive rendering function
  const renderChildren = () => {
    if (isExpanded && page.children && page.children.length > 0) {
      return (
        <View style={styles.childrenContainer}>
          {page.children.map((childPage) => (
            <PageTreeItem
              key={childPage.id}
              page={childPage}
              level={level + 1}
              onPress={onPress}
              theme={theme}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onAddSubpage={onAddSubpage}
              onDeletePage={onDeletePage}
            />
          ))}
        </View>
      );
    }
    return null;
  };

  return (
    <View>
      {/* Swipeable page item */}
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        friction={2}
        overshootRight={false}
      >
        <TouchableOpacity
          style={[
            styles.pageItem,
            {
              backgroundColor: isHovered ? theme.hoverItem : "transparent",
              borderRadius: 4,
            },
          ]}
          onPress={() => onPress(page)}
          activeOpacity={0.7}
        >
          <View style={styles.pageItemContent}>
            {/* Indentation and expand/collapse button */}
            <View style={{ width: indentation }} />

            {/* Toggle button (only show if page has children) */}
            <TouchableOpacity
              style={styles.expandButton}
              onPress={toggleExpand}
              hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
            >
              {page.children && page.children.length > 0 ? (
                <MaterialIcons
                  name={
                    isExpanded ? "keyboard-arrow-down" : "keyboard-arrow-right"
                  }
                  size={18}
                  color={theme.tertiaryText}
                />
              ) : (
                <View style={{ width: 18, height: 18 }} />
              )}
            </TouchableOpacity>

            {/* Page icon */}
            <Text style={styles.pageIcon}>{page.icon || "📄"}</Text>

            {/* Page title */}
            <Text
              style={[styles.pageTitle, { color: theme.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {page.title}
            </Text>
          </View>

          {/* Action buttons (visible on hover/press) */}
          <View style={styles.actionButtons}>
            {/* Updated timestamp always visible */}
            <Text style={[styles.pageDate, { color: theme.tertiaryText }]}>
              {formatDate(page.updatedAt)}
            </Text>

            {/* Add subpage button (visible on hover) */}
            {(isHovered || true) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAddSubpage}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Feather name="plus" size={16} color={theme.tertiaryText} />
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Swipeable>

      {/* Children pages (if expanded) */}
      {renderChildren()}
    </View>
  );
};

// Format date as "MMM D" or "MMM D, YYYY" if not current year
const formatDate = (timestamp) => {
  const date = new Date(timestamp);
  const now = new Date();

  // Check if it's today
  if (date.toDateString() === now.toDateString()) {
    return "Today";
  }

  // Check if it's yesterday
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  const options = {
    month: "short",
    day: "numeric",
  };

  // Add year if not the current year
  if (date.getFullYear() !== now.getFullYear()) {
    options.year = "numeric";
  }

  return date.toLocaleDateString(undefined, options);
};

export default function HomeScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [expandedIds, setExpandedIds] = useState({});

  // Get pages from storage
  const {
    pages,
    loading,
    loadPages,
    createNewPage,
    getRootPages,
    createTestPages,
    deletePage,
  } = usePageStorage();

  // Transform flat list of pages into hierarchical tree
  const [pageTree, setPageTree] = useState([]);

  useEffect(() => {
    if (pages && pages.length > 0) {
      const tree = buildPageTree(pages);
      setPageTree(tree);
    } else {
      setPageTree([]);
    }
  }, [pages]);

  // Handle deleting a page
  const handleDeletePage = async (pageId) => {
    try {
      console.log("Deleting page:", pageId);
      const result = await deletePage(pageId);
      if (result) {
        console.log("Page deleted successfully");

        // Show success toast
        Toast.show({
          type: "success",
          text1: "Page Deleted",
          text2: "The page and its subpages were deleted successfully",
          position: "top",
          visibilityTime: 3000,
        });
      }
    } catch (error) {
      console.error("Error deleting page:", error);

      // Show error toast
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to delete page",
        position: "bottom",
        visibilityTime: 3000,
      });
    }
  };

  // When component mounts, fade in the content
  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: 100,
      useNativeDriver: true,
    }).start();
  }, []);

  // Initial data loading
  useEffect(() => {
    const initialLoad = async () => {
      await loadPages();

      // If no pages exist, create some test pages
      if (pages.length === 0) {
        try {
          await createTestPages();
          // Reload pages after creating test pages
          await loadPages();
        } catch (error) {
          console.error("Error creating initial test pages:", error);
        }
      }
    };

    initialLoad();
  }, []);

  // Handle refreshing the page list
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadPages();
    setRefreshing(false);

    // Animate back in
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [loadPages]);

  // Handle navigation to a page
  const handlePagePress = (page) => {
    console.log("Navigating to page:", page.id);

    // Use the simple string interpolation format - this is the most reliable approach
    router.push(`/note/${page.id}`);
  };

  // Handle creating a new page
  const handleCreatePage = async () => {
    try {
      // Create a new page at the root level (no parent)
      const newPage = await createNewPage(null, "Untitled Page", "📄");

      // Navigate using simple string interpolation
      router.push(`/note/${newPage.id}`);
    } catch (error) {
      console.error("Error creating new page:", error);
    }
  };

  // Handle creating a subpage
  const handleAddSubpage = async (parentId) => {
    try {
      // Create a new page as a child of the selected page
      const newPage = await createNewPage(parentId, "Untitled Page", "📄");

      // Ensure the parent is expanded
      setExpandedIds((prev) => ({
        ...prev,
        [parentId]: true,
      }));

      // Navigate using simple string interpolation
      router.push(`/note/${newPage.id}`);
    } catch (error) {
      console.error("Error creating subpage:", error);
    }
  };

  // Handle toggling expansion of a page
  const handleToggleExpand = (pageId, isExpanded) => {
    setExpandedIds((prev) => ({
      ...prev,
      [pageId]: isExpanded,
    }));
  };

  // Right element for the header (search button)
  const headerRight = (
    <View style={styles.headerRightContainer}>
      <TouchableOpacity
        onPress={onRefresh}
        style={styles.headerButton}
        activeOpacity={0.7}
      >
        <Feather name="refresh-cw" size={20} color={theme.text} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => router.push("/(tabs)/search")}
        style={styles.headerButton}
        activeOpacity={0.7}
      >
        <Ionicons name="search-outline" size={22} color={theme.text} />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScreenHeader title="Pages" rightElement={headerRight} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          {/* Test navigation buttons */}
          <View style={styles.testButtonsContainer}>
            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push("/note")}
            >
              <Text style={styles.testButtonText}>Go to Note Index</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.secondary }]}
              onPress={() => {
                // Get the first page ID if available
                if (pages && pages.length > 0) {
                  const testPageId = pages[0].id;
                  console.log(
                    "Testing navigation to specific page:",
                    testPageId
                  );
                  router.push(`/note/${testPageId}`);
                } else {
                  alert("No pages available to test with");
                }
              }}
            >
              <Text style={styles.testButtonText}>Test Page Navigation</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: theme.primary }]}
              onPress={() => router.push("/test")}
            >
              <Text style={styles.testButtonText}>Test Route</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.testButton, { backgroundColor: "#4CAF50" }]}
              onPress={async () => {
                const created = await createTestPages();
                if (created) {
                  alert("Test pages created successfully!");
                } else {
                  alert("Test pages already exist.");
                }
                loadPages();
              }}
            >
              <Text style={styles.testButtonText}>Create Test Pages</Text>
            </TouchableOpacity>
          </View>

          <FlatList
            data={pageTree}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <PageTreeItem
                page={item}
                onPress={handlePagePress}
                theme={theme}
                expanded={!!expandedIds[item.id]}
                onToggleExpand={handleToggleExpand}
                onAddSubpage={handleAddSubpage}
                onDeletePage={handleDeletePage}
              />
            )}
            contentContainerStyle={styles.pagesList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text
                  style={[styles.sectionTitle, { color: theme.secondaryText }]}
                >
                  All Pages
                </Text>
              </View>
            }
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="document-outline"
                  size={64}
                  color={theme.tertiaryText}
                />
                <Text
                  style={[styles.emptyText, { color: theme.secondaryText }]}
                >
                  No pages found
                </Text>
                <TouchableOpacity
                  style={[
                    styles.createFirstButton,
                    { backgroundColor: theme.primary },
                  ]}
                  onPress={handleCreatePage}
                >
                  <Text style={styles.createFirstButtonText}>
                    Create your first page
                  </Text>
                </TouchableOpacity>
              </View>
            }
          />
        </Animated.View>
      )}

      <FloatingActionButton
        onPress={handleCreatePage}
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
    marginLeft: 8,
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listHeader: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pagesList: {
    paddingBottom: 80,
    minHeight: "100%",
  },
  pageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
    paddingHorizontal: 16,
    marginVertical: 1,
    height: 36,
  },
  pageItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  expandButton: {
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  pageIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  pageTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  pageDate: {
    fontSize: 12,
    marginRight: 8,
  },
  actionButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  childrenContainer: {
    // No margin to better align with Notion style
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
    marginBottom: 24,
  },
  createFirstButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  createFirstButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
  },
  testButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    padding: 16,
    gap: 10,
  },
  testButton: {
    padding: 10,
    borderRadius: 8,
    alignItems: "center",
    flex: 1,
  },
  testButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    textAlign: "center",
  },
  deleteContainer: {
    width: 80,
    height: "100%",
    justifyContent: "center",
    alignItems: "flex-end",
  },
  deleteButton: {
    width: 70,
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 4,
  },
  deleteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 2,
  },
});
