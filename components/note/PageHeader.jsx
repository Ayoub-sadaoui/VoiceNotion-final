import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";

/**
 * PageHeader component - Displays the page title, icon, and navigation controls
 */
const PageHeader = ({
  title = "",
  icon,
  onTitleChange,
  onIconChange,
  onBackPress,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  isSaving,
  theme,
  multilineTitle = false,
}) => {
  // Use local state for the title input to avoid React Native TextInput issues
  const [localTitle, setLocalTitle] = useState(title);
  const [showSavingIndicator, setShowSavingIndicator] = useState(false);

  // Update local title when prop changes
  if (title !== localTitle && title !== undefined) {
    setLocalTitle(title);
  }

  // Handle text changes locally first, then propagate to parent
  const handleTextChange = (text) => {
    setLocalTitle(text);
    if (onTitleChange) {
      onTitleChange(text);
    }
  };

  // Control the saving indicator with a slight delay to prevent flickering
  useEffect(() => {
    if (isSaving) {
      setShowSavingIndicator(true);
    } else {
      // Add a small delay before hiding the indicator to prevent flickering
      const timer = setTimeout(() => {
        setShowSavingIndicator(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isSaving]);

  return (
    <View style={styles.headerWrapper}>
      {/* Top bar with back button and undo/redo */}
      <View style={styles.topBar}>
        {/* Back button */}
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: theme.cardBackground }]}
          onPress={onBackPress}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <View style={styles.rightControls}>
          {/* Saving indicator */}
          {showSavingIndicator && (
            <View style={styles.savingIndicator}>
              <ActivityIndicator size="small" color={theme.primary} />
              <Text style={[styles.savingText, { color: theme.primary }]}>
                Saving...
              </Text>
            </View>
          )}

          {/* Undo/Redo buttons */}
          <View style={styles.historyButtons}>
            <TouchableOpacity
              style={[
                styles.historyButton,
                { backgroundColor: theme.cardBackground },
                !canUndo && styles.disabledButton,
              ]}
              onPress={onUndo}
              disabled={!canUndo}
            >
              <MaterialIcons
                name="undo"
                size={20}
                color={canUndo ? theme.text : theme.secondaryText}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.historyButton,
                { backgroundColor: theme.cardBackground },
                !canRedo && styles.disabledButton,
              ]}
              onPress={onRedo}
              disabled={!canRedo}
            >
              <MaterialIcons
                name="redo"
                size={20}
                color={canRedo ? theme.text : theme.secondaryText}
              />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Title and icon section */}
      <View style={styles.headerContainer}>
        {/* Page icon */}
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.cardBackground }]}
          onPress={onIconChange}
        >
          <Text style={styles.iconText}>{icon || "📄"}</Text>
        </TouchableOpacity>

        {/* Simple title input */}
        <View
          style={[
            styles.titleInputContainer,
            { backgroundColor: theme.cardBackground },
          ]}
        >
          <TextInput
            style={[styles.titleInput, { color: theme.text }]}
            value={localTitle}
            onChangeText={handleTextChange}
            placeholder="Untitled"
            placeholderTextColor={theme.secondaryText}
            multiline={multilineTitle}
            maxLength={100}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerWrapper: {
    paddingTop: 5,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 10,
    height: 50,
  },
  rightControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  savingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 10,
  },
  savingText: {
    marginLeft: 4,
    fontSize: 12,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 5,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  iconText: {
    fontSize: 20,
  },
  titleInputContainer: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "600",
    padding: 0,
  },
  multilineTitle: {
    minHeight: 40,
    maxHeight: 80,
  },
  historyButtons: {
    flexDirection: "row",
  },
  historyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 6,
  },
  disabledButton: {
    opacity: 0.5,
  },
});

export default PageHeader;
