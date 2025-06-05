import React, { useState } from "react";
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

// Array of common emojis for page icons
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
];

const PageHeader = ({
  title,
  icon,
  onTitleChange,
  onIconChange,
  onBackPress,
  isSaving,
  theme,
  multilineTitle = true,
}) => {
  const [showIconPicker, setShowIconPicker] = useState(false);

  // Handle icon selection
  const handleIconSelect = (newIcon) => {
    onIconChange(newIcon);
    setShowIconPicker(false);
  };

  // Icon picker modal
  const renderIconPicker = () => {
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

            <FlatList
              data={COMMON_EMOJIS}
              numColumns={8}
              keyExtractor={(item, index) => `emoji-${index}`}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.emojiItem}
                  onPress={() => handleIconSelect(item)}
                >
                  <Text style={styles.emoji}>{item}</Text>
                </TouchableOpacity>
              )}
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
  savingIndicator: {
    position: "absolute",
    flexDirection: "row",
    alignItems: "center",
    top: 20,
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
    width: "80%",
    maxHeight: "70%",
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
  emojiItem: {
    width: "12.5%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 8,
  },
  emoji: {
    fontSize: 24,
  },
});

export default PageHeader;
