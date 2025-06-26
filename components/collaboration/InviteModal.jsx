import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useTheme } from "../../utils/themeContext";
import { sendInvite } from "../../services/collaborationService";
import { showSuccessToast, showErrorToast } from "../ToastManager";

/**
 * InviteModal – simple email invite dialog
 * Props:
 *   visible        – boolean
 *   onClose        – () => void
 *   pageId         – string (required)
 */
const InviteModal = ({ visible, onClose, pageId }) => {
  const { theme } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!email.trim()) return;
    try {
      setLoading(true);
      const { error } = await sendInvite(pageId, email.trim().toLowerCase());
      if (error) throw error;
      showSuccessToast("Invite sent!");
      setEmail("");
      onClose();
    } catch (err) {
      console.error("sendInvite error", err);
      showErrorToast("Failed to send invite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.center}
      >
        <View style={[styles.box, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.title, { color: theme.text }]}>Share Page</Text>
          <TextInput
            style={[styles.input, { color: theme.text, borderColor: theme.border }]}
            placeholder="Friend's email"
            placeholderTextColor={theme.secondaryText}
            autoCapitalize="none"
            keyboardType="email-address"
            value={email}
            onChangeText={setEmail}
          />
          <View style={styles.buttonsRow}>
            <TouchableOpacity style={styles.button} onPress={onClose} disabled={loading}>
              <Text style={{ color: theme.error }}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSend}
              disabled={!email.trim() || loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Text style={{ color: theme.primary }}>Send</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  box: {
    width: "100%",
    borderRadius: 12,
    padding: 20,
    elevation: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  button: {
    marginLeft: 16,
  },
});

export default InviteModal;
