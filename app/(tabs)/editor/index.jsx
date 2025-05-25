import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Text,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Modal,
  ScrollView,
  Keyboard,
  KeyboardEvent,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import HelloWorld from "../../../components/Editor.web";
import { useTheme } from "../../../utils/themeContext";

// Array of available icons for notes
const AVAILABLE_ICONS = [
  "document-text",
  "document",
  "newspaper",
  "book",
  "bookmark",
  "calendar",
  "time",
  "alarm",
  "list",
  "checkbox",
  "create",
  "brush",
  "color-palette",
  "image",
  "camera",
  "musical-notes",
  "mic",
  "recording",
  "play",
  "film",
  "location",
  "map",
  "navigate",
  "compass",
  "pin",
  "people",
  "person",
  "body",
  "heart",
  "fitness",
  "medkit",
  "pulse",
  "nutrition",
  "restaurant",
  "fast-food",
  "cart",
  "cash",
  "card",
  "wallet",
  "gift",
  "briefcase",
  "business",
  "school",
  "library",
  "laptop",
  "hardware",
  "code",
  "code-slash",
  "terminal",
  "cloud",
  "planet",
  "sunny",
  "rainy",
  "thunderstorm",
  "flower",
  "leaf",
  "paw",
  "home",
  "car",
  "airplane",
  "call",
  "mail",
  "chatbox",
  "notifications",
  "alert",
  "information",
  "help",
  "lock",
  "key",
  "settings",
];

export default function EditorScreen() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("document-text");
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Try to use theme with fallback to prevent crash
  let theme;
  try {
    const themeContext = useTheme();
    theme = themeContext.theme;
  } catch (error) {
    // Fallback theme if context is not available
    theme = {
      background: "#FFFFFF",
      text: "#333333",
      primary: "#007AFF",
      surface: "#F2F2F7",
      secondaryText: "#999999",
    };
    console.log("Theme context not available, using fallback theme");
  }

  // Hide the status bar when component mounts
  useEffect(() => {
    StatusBar.setHidden(true);

    // Show status bar again when component unmounts
    return () => {
      StatusBar.setHidden(false);
    };
  }, []);

  // Listen for keyboard events
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        // Get keyboard height from event
        const keyboardHeight = e.endCoordinates.height;
        console.log("Keyboard height:", keyboardHeight);
        setKeyboardHeight(keyboardHeight);
        setIsKeyboardVisible(true);
      }
    );

    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
        setIsKeyboardVisible(false);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  const handleGoBack = () => {
    router.back();
  };

  const openIconPicker = () => {
    setShowIconPicker(true);
  };

  const selectIcon = (iconName) => {
    setSelectedIcon(iconName);
    setShowIconPicker(false);
  };

  const renderIconPickerModal = () => (
    <Modal
      visible={showIconPicker}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowIconPicker(false)}
    >
      <View
        style={[styles.modalContainer, { backgroundColor: "rgba(0,0,0,0.5)" }]}
      >
        <View
          style={[styles.modalContent, { backgroundColor: theme.background }]}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Select an Icon
            </Text>
            <TouchableOpacity onPress={() => setShowIconPicker(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.iconGridContainer}>
            <View style={styles.iconGrid}>
              {AVAILABLE_ICONS.map((iconName) => (
                <TouchableOpacity
                  key={iconName}
                  style={[
                    styles.iconItem,
                    {
                      backgroundColor:
                        selectedIcon === iconName
                          ? theme.primary + "40" // 40 = 25% opacity
                          : theme.surface,
                    },
                  ]}
                  onPress={() => selectIcon(iconName)}
                >
                  <Ionicons name={iconName} size={28} color={theme.primary} />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableOpacity
        style={[styles.backButton, { backgroundColor: theme.surface }]}
        onPress={handleGoBack}
      >
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>

      <View style={styles.titleContainer}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: theme.surface }]}
          onPress={openIconPicker}
        >
          <Ionicons name={selectedIcon} size={24} color={theme.primary} />
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
          onChangeText={setTitle}
          placeholder="Note Title"
          placeholderTextColor={theme.secondaryText || "#999"}
          maxLength={100}
        />
      </View>

      <HelloWorld
        title={title}
        icon={selectedIcon}
        keyboardHeight={keyboardHeight}
        isKeyboardVisible={isKeyboardVisible}
      />

      {renderIconPickerModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  backButton: {
    position: "absolute",
    top: 12,
    left: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 10,
    width: "100%",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  titleInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "bold",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "80%",
    maxHeight: "70%",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 15,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  iconGridContainer: {
    maxHeight: 400,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  iconItem: {
    width: "18%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    margin: "1%",
    borderRadius: 8,
  },
});
