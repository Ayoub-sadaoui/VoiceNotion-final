import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  TouchableWithoutFeedback,
  Animated,
  Dimensions,
} from "react-native";
import { useTheme } from "../../utils/themeContext";

/**
 * A reusable confirmation dialog component for React Native
 * @param {Object} props - Component props
 * @param {boolean} props.visible - Whether to show the dialog
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Text for confirmation button
 * @param {string} props.cancelText - Text for cancel button
 * @param {Function} props.onConfirm - Callback when confirm button is clicked
 * @param {Function} props.onCancel - Callback when cancel button is clicked
 */
const ConfirmDialog = ({
  visible = false,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  onCancel,
}) => {
  const { theme, isDark } = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(0.9)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, scaleAnim, opacityAnim]);

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: isDark ? "rgba(0,0,0,0.7)" : "rgba(0,0,0,0.5)",
      justifyContent: "center",
      alignItems: "center",
    },
    modalContainer: {
      backgroundColor: theme.background,
      borderRadius: 16,
      width: "85%",
      maxWidth: 320,
      padding: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: isDark ? 0.3 : 0.1,
      shadowRadius: 25,
      elevation: 10,
      borderWidth: isDark ? 1 : 0,
      borderColor: theme.border,
    },
    title: {
      color: theme.text,
      fontSize: 20,
      fontWeight: "600",
      marginBottom: 16,
    },
    message: {
      color: theme.secondaryText,
      fontSize: 16,
      lineHeight: 24,
      marginBottom: 24,
    },
    buttonContainer: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      marginTop: 8,
    },
    cancelButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: "transparent",
    },
    cancelText: {
      color: theme.text,
      fontSize: 15,
      fontWeight: "500",
    },
    confirmButton: {
      paddingVertical: 12,
      paddingHorizontal: 20,
      borderRadius: 8,
      backgroundColor: theme.error,
    },
    confirmText: {
      color: "white",
      fontSize: 15,
      fontWeight: "600",
    },
  });

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="none"
      onRequestClose={onCancel}
    >
      <TouchableWithoutFeedback onPress={onCancel}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modalContainer,
                {
                  opacity: opacityAnim,
                  transform: [{ scale: scaleAnim }],
                },
              ]}
            >
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.message}>{message}</Text>

              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                  onPress={onCancel}
                >
                  <Text style={styles.cancelText}>{cancelText}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.confirmButton}
                  activeOpacity={0.7}
                  onPress={onConfirm}
                >
                  <Text style={styles.confirmText}>{confirmText}</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default ConfirmDialog;
