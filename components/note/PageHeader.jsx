import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Modal,
  FlatList,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key for storing recently used emojis
const RECENT_EMOJIS_KEY = "voicenotion_recent_emojis";
const MAX_RECENT_EMOJIS = 16;

// Emoji categories
const EMOJI_CATEGORIES = [
  {
    name: "Recent",
    key: "recent",
    emojis: [], // Will be populated from storage
  },
  {
    name: "Common",
    key: "common",
    emojis: [
      "📄",
      "📝",
      "📔",
      "📕",
      "📗",
      "📘",
      "📙",
      "📚",
      "📒",
      "📋",
      "📖",
      "📑",
      "🗒️",
      "📰",
      "🏷️",
      "🔖",
    ],
  },
  {
    name: "Faces",
    key: "faces",
    emojis: [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "😂",
      "🤣",
      "😊",
      "😇",
      "🙂",
      "🙃",
      "😉",
      "😌",
      "😍",
      "🥰",
    ],
  },
  {
    name: "Nature",
    key: "nature",
    emojis: [
      "🌱",
      "🌲",
      "🌳",
      "🌴",
      "🌵",
      "🌿",
      "☘️",
      "🍀",
      "🍁",
      "🍂",
      "🍃",
      "🌺",
      "🌸",
      "🌼",
      "🌻",
      "🌞",
    ],
  },
  {
    name: "Food",
    key: "food",
    emojis: [
      "🍎",
      "🍐",
      "🍊",
      "🍋",
      "🍌",
      "🍉",
      "🍇",
      "🍓",
      "🍈",
      "🍒",
      "🍑",
      "🥭",
      "🍍",
      "🥥",
      "🥝",
      "🍅",
    ],
  },
  {
    name: "Activities",
    key: "activities",
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🥎",
      "🎾",
      "🏐",
      "🏉",
      "🥏",
      "🎱",
      "🪀",
      "🏓",
      "🏸",
      "🏒",
      "🏑",
      "🥍",
    ],
  },
  {
    name: "Travel",
    key: "travel",
    emojis: [
      "🚗",
      "🚕",
      "🚙",
      "🚌",
      "🚎",
      "🏎️",
      "🚓",
      "🚑",
      "🚒",
      "🚐",
      "🚚",
      "🚛",
      "🚜",
      "🛴",
      "🚲",
      "🛵",
    ],
  },
  {
    name: "Objects",
    key: "objects",
    emojis: [
      "⌚",
      "📱",
      "💻",
      "⌨️",
      "🖥️",
      "🖨️",
      "🖱️",
      "🖲️",
      "🕹️",
      "🗜️",
      "💽",
      "💾",
      "💿",
      "📀",
      "📼",
      "📷",
    ],
  },
  {
    name: "Symbols",
    key: "symbols",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🖤",
      "🤍",
      "🤎",
      "💔",
      "❣️",
      "💕",
      "💞",
      "💓",
      "💗",
      "💖",
    ],
  },
  {
    name: "Flags",
    key: "flags",
    emojis: [
      "🏁",
      "🚩",
      "🎌",
      "🏴",
      "🏳️",
      "🏳️‍🌈",
      "🏳️‍⚧️",
      "🏴‍☠️",
      "🇦🇫",
      "🇦🇽",
      "🇦🇱",
      "🇩🇿",
      "🇦🇸",
      "🇦🇩",
      "🇦🇴",
      "🇦🇮",
    ],
  },
];

const PageHeader = ({
  title,
  icon,
  onTitleChange,
  onIconChange,
  onBackPress,
  onUndo,
  onRedo,
  isSaving,
  theme,
  multilineTitle = true,
  canUndo = true,
  canRedo = true,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("common");
  const [recentEmojis, setRecentEmojis] = useState([]);
  const [customEmojiInput, setCustomEmojiInput] = useState("");

  // Load recent emojis on component mount
  useEffect(() => {
    const loadRecentEmojis = async () => {
      try {
        const storedEmojis = await AsyncStorage.getItem(RECENT_EMOJIS_KEY);
        if (storedEmojis) {
          setRecentEmojis(JSON.parse(storedEmojis));

          // Update the Recent category
          EMOJI_CATEGORIES[0].emojis = JSON.parse(storedEmojis);
        }
      } catch (error) {
        console.error("Error loading recent emojis:", error);
      }
    };

    loadRecentEmojis();
  }, []);

  // Save emoji to recent emojis
  const saveToRecentEmojis = async (emoji) => {
    try {
      // Add to beginning and remove duplicates
      const updatedRecents = [
        emoji,
        ...recentEmojis.filter((item) => item !== emoji),
      ].slice(0, MAX_RECENT_EMOJIS);

      setRecentEmojis(updatedRecents);

      // Update the Recent category
      EMOJI_CATEGORIES[0].emojis = updatedRecents;

      // Save to storage
      await AsyncStorage.setItem(
        RECENT_EMOJIS_KEY,
        JSON.stringify(updatedRecents)
      );
    } catch (error) {
      console.error("Error saving recent emoji:", error);
    }
  };

  // Handle icon selection
  const handleIconSelect = (newIcon) => {
    onIconChange(newIcon);
    saveToRecentEmojis(newIcon);
    setShowIconPicker(false);
  };

  // Handle custom emoji input
  const handleCustomEmojiSubmit = () => {
    if (customEmojiInput.trim()) {
      handleIconSelect(customEmojiInput);
      setCustomEmojiInput("");
    }
  };

  // Filter emojis based on search query
  const getFilteredEmojis = () => {
    if (!searchQuery.trim()) {
      return (
        EMOJI_CATEGORIES.find((cat) => cat.key === activeCategory)?.emojis || []
      );
    }

    // Search across all categories
    const query = searchQuery.toLowerCase();
    const allEmojis = EMOJI_CATEGORIES.flatMap((cat) => cat.emojis);

    // Simple filtering - in a real app, you might want to use emoji descriptions for better search
    return allEmojis.filter((emoji) => emoji.includes(query));
  };

  // Icon picker modal
  const renderIconPicker = () => {
    const filteredEmojis = getFilteredEmojis();

    return (
      <Modal
        visible={showIconPicker}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowIconPicker(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel="Close icon picker"
          onPress={() => setShowIconPicker(false)}
        >
          <View
            style={[
              styles.iconPickerContainer,
              { backgroundColor: theme.background },
            ]}
          >
            <View style={styles.iconPickerHeader}>
              <Text style={[styles.iconPickerTitle, { color: theme.text }]}>
                Select Icon
              </Text>
              <TouchableOpacity onPress={() => setShowIconPicker(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View
              style={[styles.searchBar, { backgroundColor: theme.surface }]}
            >
              <Ionicons name="search" size={18} color={theme.icon} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="Search emojis..."
                placeholderTextColor={theme.secondaryText}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={theme.icon} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Custom emoji input */}
            <View
              style={[
                styles.customEmojiContainer,
                { borderColor: theme.border },
              ]}
            >
              <TextInput
                style={[styles.customEmojiInput, { color: theme.text }]}
                value={customEmojiInput}
                onChangeText={setCustomEmojiInput}
                placeholder="Paste any emoji here"
                placeholderTextColor={theme.secondaryText}
                maxLength={4}
              />
              <TouchableOpacity
                style={[
                  styles.customEmojiButton,
                  { backgroundColor: theme.primary },
                ]}
                onPress={handleCustomEmojiSubmit}
              >
                <Text style={styles.customEmojiButtonText}>Use</Text>
              </TouchableOpacity>
            </View>

            {/* Category tabs (only show when not searching) */}
            {!searchQuery && (
              <FlatList
                data={EMOJI_CATEGORIES}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.key}
                style={styles.categoryTabs}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.categoryTab,
                      activeCategory === item.key && {
                        borderBottomColor: theme.primary,
                        borderBottomWidth: 2,
                      },
                    ]}
                    onPress={() => setActiveCategory(item.key)}
                  >
                    <Text
                      style={[
                        styles.categoryTabText,
                        {
                          color:
                            activeCategory === item.key
                              ? theme.primary
                              : theme.secondaryText,
                        },
                      ]}
                    >
                      {item.name}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            )}

            {/* Emoji grid */}
            <FlatList
              data={filteredEmojis}
              numColumns={8}
              keyExtractor={(item, index) => `emoji-${index}-${item}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiItem}
                  onPress={() => handleIconSelect(item)}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text
                  style={[styles.emptyText, { color: theme.secondaryText }]}
                >
                  No emojis found
                </Text>
              }
            />
          </View>
        </TouchableOpacity>
      </Modal>
    );
  };

  return (
    <>
      {/* Back button */}
      <TouchableOpacity style={[styles.backButton]} onPress={onBackPress}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      {/* Undo/Redo buttons */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          style={[styles.actionButton, !canUndo && styles.disabledButton]}
          onPress={onUndo}
          disabled={!canUndo}
          accessibilityLabel="Undo"
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-undo"
            size={22}
            color={canUndo ? theme.text : theme.secondaryText}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, !canRedo && styles.disabledButton]}
          onPress={onRedo}
          disabled={!canRedo}
          accessibilityLabel="Redo"
          accessibilityRole="button"
        >
          <Ionicons
            name="arrow-redo"
            size={22}
            color={canRedo ? theme.text : theme.secondaryText}
          />
        </TouchableOpacity>
      </View>

      {/* Save indicator */}
      {isSaving && (
        <View style={styles.savingIndicator}>
          <ActivityIndicator size="small" color={theme.secondary} />
          <Text style={[styles.savingText, { color: theme.secondaryText }]}>
            Saving...
          </Text>
        </View>
      )}

      {/* Title area */}
      <View style={styles.titleContainer}>
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => setShowIconPicker(true)}
        >
          <Text style={[styles.iconDisplay, { color: theme.text }]}>
            {icon}
          </Text>
          <View
            style={[styles.iconEditBadge, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="pencil" size={10} color="#FFF" />
          </View>
        </TouchableOpacity>

        <TextInput
          style={[
            styles.titleInput,
            {
              color: theme.text,
              borderBottomColor: `${theme.text}20`,
            },
          ]}
          value={title}
          onChangeText={onTitleChange}
          placeholder="Note Title"
          placeholderTextColor={theme.secondaryText || "#999"}
          maxLength={100}
          multiline={multilineTitle}
          numberOfLines={multilineTitle ? 2 : 1}
        />
      </View>

      {/* Icon Picker Modal */}
      {renderIconPicker()}
    </>
  );
};

const styles = StyleSheet.create({
  backButton: {
    position: "absolute",
    top: 20,
    left: 15,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  actionsContainer: {
    position: "absolute",
    flexDirection: "row",
    top: 20,
    right: 15,
    zIndex: 10,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  disabledButton: {
    opacity: 0.5,
  },
  savingIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    top: 70,
    right: 15,
    zIndex: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  savingText: {
    marginLeft: 6,
    fontSize: 12,
    fontWeight: "500",
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 10,
    width: "100%",
  },
  iconButton: {
    position: "relative",
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    marginTop: 8,
  },
  iconDisplay: {
    fontSize: 24,
  },
  iconEditBadge: {
    position: "absolute",
    bottom: -3,
    right: -3,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
  },
  titleInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 4,
    textAlignVertical: "top",
  },
  // Icon picker styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  iconPickerContainer: {
    width: "90%",
    maxHeight: "80%",
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  iconPickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconPickerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
    height: 40,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    height: 40,
  },
  customEmojiContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 12,
    overflow: "hidden",
  },
  customEmojiInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
  },
  customEmojiButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  customEmojiButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  categoryTabs: {
    flexGrow: 0,
    marginBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: "500",
  },
  emojiItem: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 6,
  },
  emoji: {
    fontSize: 18,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
  },
});

export default PageHeader;
