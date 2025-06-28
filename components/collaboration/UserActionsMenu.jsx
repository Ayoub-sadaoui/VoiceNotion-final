import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";

/**
 * UserActionsMenu - A popup menu for user actions in ShareModal
 * @param {boolean} visible - Whether the menu is visible
 * @param {function} onClose - Function to close the menu
 * @param {object} user - User object with role and other properties
 * @param {function} onRemoveAccess - Function to remove user access
 * @param {object} position - Position to show the menu {x, y}
 */
const UserActionsMenu = ({
  visible,
  onClose,
  user,
  onRemoveAccess,
  position = { x: 0, y: 0 },
}) => {
  const { theme } = useTheme();

  const handleRemoveAccess = () => {
    onRemoveAccess(user);
    onClose();
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <View
            style={[
              styles.menuContainer,
              {
                backgroundColor: theme.cardBackground,
                borderColor: theme.border,
                top: position.y,
                right: 20, // Always show from right edge for better UX
              },
            ]}
          >
            {/* Only show remove option if user is not the owner */}
            {user.role !== "owner" && (
              <TouchableOpacity
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.background || theme.cardBackground },
                ]}
                onPress={handleRemoveAccess}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={18}
                  color={theme.error || "#FF4444"}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.error || "#FF4444" },
                  ]}
                >
                  Remove access
                </Text>
              </TouchableOpacity>
            )}

            {/* If owner, show a disabled message */}
            {user.role === "owner" && (
              <View style={[styles.menuItem, { opacity: 0.5 }]}>
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={theme.secondaryText}
                />
                <Text
                  style={[styles.menuItemText, { color: theme.secondaryText }]}
                >
                  Cannot remove owner
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "transparent", // Changed from rgba(0, 0, 0, 0.1) to avoid double overlay
  },
  menuContainer: {
    position: "absolute",
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minWidth: 160,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "500",
  },
});

export default UserActionsMenu;
