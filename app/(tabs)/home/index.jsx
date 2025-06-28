import React, { useState, useCallback, useEffect, useRef } from "react";
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
  ScrollView,
  Image,
} from "react-native";
import { Ionicons, MaterialIcons, Feather } from "@expo/vector-icons";
import { useRouter, Link, useFocusEffect } from "expo-router";
import { useTheme } from "../../../utils/themeContext";
import { useAuth } from "../../../contexts/AuthContext";
import { canDeletePage } from "../../../utils/pagePermissions";
import ScreenHeader from "../../../components/ScreenHeader";
import HomeHeader from "../../../components/HomeHeader";
import FloatingActionButton from "../../../components/FloatingActionButton";
import usePageStorage from "../../../hooks/usePageStorage";
import { buildPageTree, buildSharedPageTree } from "../../../utils/pageUtils";
import {
  GestureHandlerRootView,
  Swipeable,
} from "react-native-gesture-handler";
import Toast from "react-native-toast-message";
import { fetchSupabaseNotesOnly } from "../../../services/noteService";

// Recursive component for rendering a page tree item and its children
const PageTreeItem = ({
  page,
  level = 0,
  onPress,
  theme = {},
  expanded = false,
  onToggleExpand,
  onAddSubpage,
  onDeletePage,
  canDelete = true, // NEW: Whether this page can be deleted by current user
  currentUserId, // NEW: Current user ID for permission checks
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

  // Check if current user can delete this specific page
  const userCanDeleteThisPage = currentUserId
    ? canDeletePage(page, currentUserId)
    : false;
  const shouldShowDelete = canDelete && userCanDeleteThisPage;

  // Debug: Log permission check for this page
  useEffect(() => {
    if (currentUserId && page) {
      console.log("🔐 PageTreeItem - Permission Debug:", {
        pageId: page.id?.substring(0, 8) + "...",
        pageTitle: page.title,
        pageUserId: page.user_id?.substring(0, 8) + "...",
        currentUserId: currentUserId?.substring(0, 8) + "...",
        isSharedWithUser: page.isSharedWithUser,
        userCanDeleteThisPage,
        shouldShowDelete,
        canDeleteProp: canDelete,
        userIdMatch: page.user_id === currentUserId,
        hasUserId: !!page.user_id,
        hasCurrentUserId: !!currentUserId,
        pageUserIdType: typeof page.user_id,
        currentUserIdType: typeof currentUserId,
      });
    }
  }, [page, currentUserId, userCanDeleteThisPage, shouldShowDelete, canDelete]);

  // Handle delete page
  const handleDeletePage = useCallback(() => {
    // Only proceed if user has permission
    if (!shouldShowDelete) return;
    // Close swipeable
    if (swipeableRef.current) {
      swipeableRef.current.close();
    }

    // Create a component that will render the confirm dialog
    const DeleteConfirmationWrapper = () => {
      const [showDialog, setShowDialog] = useState(true);

      const handleCancel = () => {
        setShowDialog(false);
        // Hide the modal
        if (global.hideModal && typeof global.hideModal === "function") {
          global.hideModal();
        }
      };

      const handleConfirm = () => {
        setShowDialog(false);
        // Call the delete handler
        if (onDeletePage) {
          onDeletePage(page.id);
        }
        // Hide the modal
        if (global.hideModal && typeof global.hideModal === "function") {
          global.hideModal();
        }
      };

      // Import the ConfirmDialog dynamically to avoid issues with web/native components
      const ConfirmDialog =
        require("../../../components/note/ConfirmDialog").default;

      return (
        <ConfirmDialog
          visible={showDialog}
          title="Delete Page"
          message={`Are you sure you want to delete "${page.title}" and all its subpages?`}
          confirmText="Delete"
          cancelText="Cancel"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      );
    };

    // Check if we can use the modal service
    if (global.showModal && typeof global.showModal === "function") {
      global.showModal(<DeleteConfirmationWrapper />);
    } else {
      // Fallback to Alert if modal service isn't available
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
    }
  }, [page.id, page.title, onDeletePage, shouldShowDelete]);

  // Render right swipe actions
  const renderRightActions = (progress, dragX) => {
    // Don't show delete action if user doesn't have permission
    if (!shouldShowDelete) {
      return null;
    }

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
              canDelete={canDelete}
              currentUserId={currentUserId}
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
        renderRightActions={shouldShowDelete ? renderRightActions : null}
        friction={2}
        overshootRight={false}
        enabled={shouldShowDelete} // Only enable swipe if user can delete
      >
        <TouchableOpacity
          style={[
            styles.pageItem,
            {
              backgroundColor: isHovered
                ? theme?.hover || "#F0F0F5"
                : "transparent",
              borderRadius: 8,
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
                  size={22}
                  color={theme?.tertiaryText || "#999999"}
                />
              ) : (
                <View style={{ width: 22, height: 22 }} />
              )}
            </TouchableOpacity>

            {/* Page icon */}
            <Text style={styles.pageIcon}>{page.icon || "📄"}</Text>

            {/* Page title */}
            <Text
              style={[styles.pageTitle, { color: theme?.text || "#333333" }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {page.title}
            </Text>
          </View>

          {/* Action buttons (visible on hover/press) */}
          <View style={styles.actionButtons}>
            {/* Updated timestamp always visible */}
            <Text
              style={[
                styles.pageDate,
                { color: theme?.tertiaryText || "#999999" },
              ]}
            >
              {formatDate(page.updatedAt)}
            </Text>

            {/* Add subpage button (visible on hover) */}
            {(isHovered || true) && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleAddSubpage}
                hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
              >
                <Ionicons
                  name="add-outline"
                  size={18}
                  color={theme?.tertiaryText || "#999999"}
                />
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

// Recent page card component
const RecentPageCard = ({ page, onPress, theme = {} }) => {
  return (
    <TouchableOpacity
      style={[
        styles.recentPageCard,
        {
          backgroundColor:
            theme?.card?.background || theme?.surface || "#FFFFFF",
        },
      ]}
      onPress={() => onPress(page)}
      activeOpacity={0.7}
    >
      <Text style={styles.recentPageIcon}>{page.icon || "📄"}</Text>
      <Text
        style={[styles.recentPageTitle, { color: theme?.text || "#333333" }]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {page.title}
      </Text>
      <Text
        style={[
          styles.recentPageDate,
          { color: theme?.tertiaryText || "#999999" },
        ]}
        numberOfLines={1}
      >
        {formatDate(page.updatedAt)}
      </Text>
    </TouchableOpacity>
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
  const router = useRouter();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [expandedIds, setExpandedIds] = useState({});
  const [recentPages, setRecentPages] = useState([]);
  const [syncStatus, setSyncStatus] = useState({
    isSyncing: false,
    lastSynced: null,
    error: null,
  });

  // Section collapse state
  const [sectionsCollapsed, setSectionsCollapsed] = useState({
    shared: false,
    private: false,
  });

  // Add a ref to track the last refresh time
  const lastRefreshTime = useRef(0);

  const {
    pages,
    loading,
    loadPages,
    createNewPage,
    deletePage: deletePageFromStorage,
    createTestPages,
  } = usePageStorage(user?.id);

  // Transform flat list of pages into hierarchical tree
  const [pageTree, setPageTree] = useState([]);

  // Shared pages state
  const [sharedPages, setSharedPages] = useState([]);
  const [sharedPageTree, setSharedPageTree] = useState([]);

  // Private pages state
  const [privatePages, setPrivatePages] = useState([]);
  const [privatePageTree, setPrivatePageTree] = useState([]);

  useEffect(() => {
    if (pages && pages.length > 0) {
      console.log(`🏠 Home: Processing ${pages.length} total pages`);

      // Separate shared and private pages
      const shared = pages.filter((page) => page.isSharedWithUser);
      const privatePagesFlat = pages.filter((page) => !page.isSharedWithUser);

      console.log(
        `🔗 Home: Found ${shared.length} shared pages:`,
        shared.map((p) => ({
          id: p.id.substring(0, 8),
          title: p.title,
          isSharedWithUser: p.isSharedWithUser,
        }))
      );
      console.log(`🔒 Home: Found ${privatePagesFlat.length} private pages`);

      // Build hierarchical trees for both shared and private pages
      const sharedTree = buildSharedPageTree(shared);
      const privateTree = buildPageTree(privatePagesFlat);

      console.log(`🌳 Home: Shared tree has ${sharedTree.length} root items`);

      // Debug: Log detailed info about shared tree
      if (sharedTree.length > 0) {
        console.log("🌳 Shared tree details:");
        sharedTree.forEach((item, index) => {
          console.log(
            `  ${index + 1}. ${item.title} (ID: ${item.id.substring(0, 8)}...)`
          );
          console.log(`     parentId: ${item.parentId || "null"}`);
          console.log(`     isSharedWithUser: ${item.isSharedWithUser}`);
          console.log(`     children: ${item.children?.length || 0}`);
        });
      } else {
        console.log("⚠️ Shared tree is empty!");
        if (shared.length > 0) {
          console.log(
            "🔍 But we have shared pages. Checking their parentId values:"
          );
          shared.forEach((page, index) => {
            console.log(
              `  ${index + 1}. ${page.title} - parentId: ${
                page.parentId || "null"
              }`
            );
          });
        }
      }

      setSharedPages(shared);
      setSharedPageTree(sharedTree);
      setPrivatePages(privatePagesFlat);
      setPrivatePageTree(privateTree);

      // Keep the original pageTree for compatibility
      const tree = buildPageTree(pages);
      setPageTree(tree);

      // Get recent pages (sorted by updatedAt)
      const sorted = [...pages].sort((a, b) => {
        const dateA = new Date(b.updatedAt);
        const dateB = new Date(a.updatedAt);
        return dateA - dateB;
      });
      setRecentPages(sorted.slice(0, 5)); // Get top 5 most recent pages
    } else {
      setPageTree([]);
      setSharedPages([]);
      setSharedPageTree([]);
      setPrivatePages([]);
      setPrivatePageTree([]);
      setRecentPages([]);
    }
  }, [pages]);

  // Fetch shared pages from Supabase
  const handleDeletePage = async (pageId) => {
    try {
      console.log("Deleting page:", pageId);
      const result = await deletePageFromStorage(pageId);
      if (result) {
        console.log("Page deleted successfully");

        // Force reload pages to refresh the UI
        await loadPages();

        // Show success toast
        Toast.show({
          type: "success",
          text1: "Page Deleted",
          text2: "The page and its subpages were deleted successfully",
          position: "top",
          visibilityTime: 5000,
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
        visibilityTime: 5000,
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

      // Remove automatic test page creation
    };

    initialLoad();
  }, [user?.id, loadPages]);

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
      if (!user) {
        Toast.show({
          type: "error",
          text1: "Authentication Required",
          text2: "Please sign in to create notes",
          position: "bottom",
          visibilityTime: 5000,
        });
        return;
      }

      console.log("Creating new root page...");

      // Create a new page at the root level (no parent)
      const newPage = await createNewPage(null, "Untitled Page", "📄");

      if (!newPage || !newPage.id) {
        console.error("Failed to create new page: Invalid page data returned");
        return;
      }

      console.log("Created new page successfully, ID:", newPage.id);

      // Navigate using simple string interpolation
      router.push(`/note/${newPage.id}`);
    } catch (error) {
      console.error("Error creating new page:", error);

      // Show error toast
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create new page. Please try again.",
        position: "bottom",
        visibilityTime: 5000,
      });
    }
  };

  // Handle creating a subpage
  const handleAddSubpage = async (parentId) => {
    try {
      if (!user) {
        Toast.show({
          type: "error",
          text1: "Authentication Required",
          text2: "Please sign in to create notes",
          position: "bottom",
          visibilityTime: 5000,
        });
        return;
      }

      console.log("Creating new subpage with parent:", parentId);

      // Create a new page as a child of the selected page
      const newPage = await createNewPage(parentId, "Untitled Page", "📄");

      if (!newPage || !newPage.id) {
        console.error(
          "Failed to create new subpage: Invalid page data returned"
        );
        return;
      }

      console.log("Created new subpage successfully, ID:", newPage.id);

      // Ensure the parent is expanded
      setExpandedIds((prev) => ({
        ...prev,
        [parentId]: true,
      }));

      // Navigate using simple string interpolation
      router.push(`/note/${newPage.id}`);
    } catch (error) {
      console.error("Error creating subpage:", error);

      // Show error toast
      Toast.show({
        type: "error",
        text1: "Error",
        text2: "Failed to create subpage. Please try again.",
        position: "bottom",
        visibilityTime: 5000,
      });
    }
  };

  // Handle toggling expansion of a page
  const handleToggleExpand = (pageId, isExpanded) => {
    setExpandedIds((prev) => ({
      ...prev,
      [pageId]: isExpanded,
    }));
  };

  // Handle toggling section collapse
  const toggleSection = (sectionKey) => {
    setSectionsCollapsed((prev) => ({
      ...prev,
      [sectionKey]: !prev[sectionKey],
    }));
  };

  // Render recent pages section
  const renderRecentPagesSection = () => {
    if (recentPages.length === 0) return null;

    return (
      <View style={styles.recentPagesSection}>
        <Text style={[styles.sectionTitle, { color: theme.secondaryText }]}>
          Recent Pages
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.recentPagesContainer}
        >
          {recentPages.map((page) => (
            <RecentPageCard
              key={page.id}
              page={page}
              onPress={handlePagePress}
              theme={theme || {}}
            />
          ))}
        </ScrollView>
      </View>
    );
  };

  // Render collapsible section component
  const renderCollapsibleSection = (
    title,
    sectionKey,
    data,
    emptyMessage,
    showCreateButtons = false
  ) => (
    <View style={styles.pagesSection}>
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => toggleSection(sectionKey)}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name={
            sectionsCollapsed[sectionKey]
              ? "keyboard-arrow-right"
              : "keyboard-arrow-down"
          }
          size={20}
          color={theme.secondaryText}
          style={styles.sectionToggleIcon}
        />
        <Text
          style={[
            styles.sectionTitle,
            { color: theme.secondaryText, marginBottom: 0 },
          ]}
        >
          {title}
        </Text>
        <Text style={[styles.sectionCount, { color: theme.tertiaryText }]}>
          ({data.length})
        </Text>
      </TouchableOpacity>

      {!sectionsCollapsed[sectionKey] && (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PageTreeItem
              page={item}
              onPress={handlePagePress}
              theme={theme || {}}
              expanded={expandedIds[item.id] || false}
              onToggleExpand={handleToggleExpand}
              onAddSubpage={handleAddSubpage}
              onDeletePage={handleDeletePage}
              canDelete={true} // Enable delete functionality (will be checked per-page)
              currentUserId={user?.id} // Pass current user ID for permission checks
            />
          )}
          contentContainerStyle={styles.pagesList}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name="document-outline"
                size={48}
                color={theme.tertiaryText}
              />
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                {emptyMessage}
              </Text>
              {showCreateButtons && user && (
                <View style={styles.emptyStateButtons}>
                  <TouchableOpacity
                    style={[
                      styles.createFirstButton,
                      { backgroundColor: theme.primary },
                    ]}
                    onPress={handleCreatePage}
                  >
                    <Text style={styles.createFirstButtonText}>
                      Create blank page
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.createFirstButton,
                      { backgroundColor: theme.secondary, marginTop: 12 },
                    ]}
                    onPress={async () => {
                      try {
                        await createTestPages();
                        await loadPages();
                        Toast.show({
                          type: "success",
                          text1: "Example Pages Created",
                          text2:
                            "Sample pages have been added to help you get started",
                          position: "top",
                          visibilityTime: 5000,
                        });
                      } catch (error) {
                        console.error("Error creating test pages:", error);
                        Toast.show({
                          type: "error",
                          text1: "Error",
                          text2: "Failed to create example pages",
                          position: "bottom",
                          visibilityTime: 5000,
                        });
                      }
                    }}
                  >
                    <Text style={styles.createFirstButtonText}>
                      Create example pages
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          }
        />
      )}
    </View>
  );

  // Add useFocusEffect to refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log("Home screen focused, refreshing data");
      // Use a ref to track if we've already refreshed to prevent multiple refreshes
      const isMounted = { current: true };

      const refreshData = async () => {
        if (!isMounted.current) return;

        // Prevent refreshing too frequently (only refresh if it's been at least 2 seconds)
        const now = Date.now();
        if (now - lastRefreshTime.current < 2000) {
          console.log("Skipping refresh - too soon since last refresh");
          return;
        }

        // Update the last refresh time
        lastRefreshTime.current = now;

        // Refresh the pages list
        await loadPages();
      };

      refreshData();

      return () => {
        // Cleanup when component unmounts or loses focus
        isMounted.current = false;
      };
    }, [loadPages])
  );

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <HomeHeader user={user} />

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading notes...
          </Text>
        </View>
      ) : (
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [10, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 400 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
          >
            {renderRecentPagesSection()}

            {/* Shared Pages Section */}
            {renderCollapsibleSection(
              "Shared Pages",
              "shared",
              sharedPageTree,
              "No shared pages found"
            )}

            {/* Private Pages Section */}
            {renderCollapsibleSection(
              "Private Pages",
              "private",
              privatePageTree,
              user
                ? "No private pages found"
                : "Please sign in to view your notes",
              true // show create buttons
            )}
          </ScrollView>
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
    borderRadius: 20,
    marginLeft: 8,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  profileIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "400",
  },
  headerRightContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingTop: 10,
    paddingRight: 16,
    paddingBottom: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Recent pages section
  recentPagesSection: {
    paddingTop: 12,
    paddingBottom: 8,
    paddingHorizontal: 8,
  },
  // Pages section (for shared and private pages)
  pagesSection: {
    paddingTop: 4,
    paddingBottom: 4,
  },
  // Section header with toggle
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 16,
    paddingLeft: 8,
    paddingVertical: 8,
  },
  sectionToggleIcon: {
    marginRight: 8,
  },
  sectionCount: {
    fontSize: 12,
    marginLeft: 8,
  },
  recentPagesContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  recentPageCard: {
    width: 160,
    height: 100,
    borderRadius: 12,
    padding: 12,
    marginRight: 12,
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  recentPageIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  recentPageTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  recentPageDate: {
    fontSize: 12,
    marginTop: 4,
  },
  // List section
  listHeader: {
    paddingVertical: 8,

    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
    marginTop: 0,
    paddingLeft: 0,
    flex: 1,
  },
  pagesList: {
    paddingBottom: 8,
    flexGrow: 1,
  },
  pageItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 6,
    paddingHorizontal: 16,
    marginVertical: 1,
    height: 38,
  },
  pageItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  expandButton: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  pageIcon: {
    fontSize: 20, // Increased font size
    marginRight: 10,
  },
  pageTitle: {
    flex: 1,
    fontSize: 16, // Increased font size
    fontWeight: "400",
  },
  actionButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  pageDate: {
    fontSize: 13, // Slightly increased
    marginRight: 10,
  },
  actionButton: {
    width: 28,
    height: 28,
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
    paddingTop: 40,
    paddingBottom: 20,
  },
  emptyText: {
    fontSize: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  createFirstButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 200,
    alignItems: "center",
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
  syncStatusContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  syncStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  syncStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignSelf: "flex-start",
  },
  syncStatusText: {
    fontSize: 12,
    marginLeft: 6,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    marginLeft: 10,
  },
  clearButtonText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 4,
  },
  emptyStateButtons: {
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
  },
});
