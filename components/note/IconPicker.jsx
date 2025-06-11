import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Key for storing recently used emojis
const RECENT_EMOJIS_KEY = "voicenotion_recent_emojis";
const MAX_RECENT_EMOJIS = 16;

// Common emojis for page icons
const COMMON_EMOJIS = [
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
  "📌",
  "📍",
  "💼",
  "🗂️",
  "🗃️",
  "🗄️",
  "✏️",
  "✒️",
  "🖋️",
  "🖊️",
  "🖌️",
  "🖍️",
  "📐",
  "📏",
  "📊",
  "📈",
  "📉",
  "🔍",
  "🔎",
  "🔎",
  "💡",
  "💻",
  "🖥️",
  "📱",
  "⌨️",
  "🖱️",
  "🏠",
  "🏢",
  "🏫",
  "🏭",
  "🏛️",
  "🏗️",
  "🏘️",
  "🏙️",
  "🚗",
  "✈️",
  "🚀",
  "🚁",
  "⚙️",
  "🔧",
  "🔨",
  "🛠️",
  "⚡",
  "🔋",
  "⏱️",
  "⏰",
  "⌚",
  "🧠",
  "👁️",
  "👂",
  "🦷",
  "👄",
  "👅",
  "👣",
  "👤",
  "👥",
  "👪",
  "👨‍👩‍👧‍👦",
  "🧑‍🤝‍🧑",
  "💪",
  "🦾",
  "🦿",
  "🦵",
  "🦶",
  "👈",
  "👉",
  "👆",
  "👇",
  "👍",
  "👎",
  "✊",
  "👊",
  "🤛",
  "🤜",
  "🤞",
  "✌️",
  "🤘",
  "🤙",
  "👋",
  "🖐️",
  "👌",
  "🤏",
  "🤝",
  "🙏",
];

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
    emojis: COMMON_EMOJIS,
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
      "😘",
      "😗",
      "😙",
      "😚",
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
      "🌝",
      "🌛",
      "🌜",
      "🌚",
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
      "🍆",
      "🥑",
      "🥦",
      "🥬",
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
      "📸",
      "📹",
      "🎥",
      "📽️",
    ],
  },
];

/**
 * IconPicker component - Displays a modal for selecting page icons
 */
const IconPicker = ({ visible, onClose, onSelect, theme }) => {
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
          const parsedEmojis = JSON.parse(storedEmojis);
          setRecentEmojis(parsedEmojis);

          // Update the Recent category
          EMOJI_CATEGORIES[0].emojis = parsedEmojis;
        }
      } catch (error) {
        console.error("Error loading recent emojis:", error);
      }
    };

    if (visible) {
      loadRecentEmojis();
    }
  }, [visible]);

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
  const handleIconSelect = (emoji) => {
    saveToRecentEmojis(emoji);
    onSelect(emoji);
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={onClose}
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
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Search bar */}
          <View
            style={[
              styles.searchBar,
              { backgroundColor: theme.cardBackground },
            ]}
          >
            <Ionicons name="search" size={18} color={theme.secondaryText} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search emojis..."
              placeholderTextColor={theme.secondaryText}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={theme.secondaryText}
                />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Custom emoji input */}
          <View
            style={[
              styles.customEmojiContainer,
              { borderColor: theme.border || "#ddd" },
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
            data={getFilteredEmojis()}
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
              <Text style={[styles.emptyText, { color: theme.secondaryText }]}>
                No emojis found
              </Text>
            }
          />
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    fontSize: 24,
  },
  emptyText: {
    textAlign: "center",
    padding: 20,
    fontSize: 16,
  },
});

export default IconPicker;
