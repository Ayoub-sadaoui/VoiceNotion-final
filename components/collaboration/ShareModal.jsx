import React, { useState, useEffect } from "react";
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
  ScrollView,
  Image,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { sendInvite, getPageUsers } from "../../services/collaborationService";
import { showSuccessToast, showErrorToast } from "../ToastManager";
import { useAuth } from "../../contexts/AuthContext";

/**
 * Enhanced ShareModal with tabs for Share and Publish functionality
 * Props:
 *   visible        – boolean
 *   onClose        – () => void
 *   pageId         – string (required)
 *   pageTitle      – string (for display purposes)
 */
const ShareModal = ({ visible, onClose, pageId, pageTitle = "this page" }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("share"); // "share" or "publish"
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch users with access to the page
  useEffect(() => {
    if (visible && pageId) {
      fetchPageUsers();
    }
  }, [visible, pageId]);

  const fetchPageUsers = async () => {
    try {
      setLoadingUsers(true);
      console.log("Fetching users for pageId:", pageId);
      const { data, error } = await getPageUsers(pageId);
      if (error) {
        console.error("getPageUsers error:", error);
        throw error;
      }
      console.log("Fetched users:", data);
      setUsers(data || []);
    } catch (err) {
      console.error("Error fetching page users:", err);
      showErrorToast("Failed to load users");
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleSendInvite = async () => {
    if (!email.trim()) return;

    const emailToInvite = email.trim().toLowerCase();

    // Check if user already has access to this page
    const existingUser = users.find(
      (user) => user.email?.toLowerCase() === emailToInvite
    );

    if (existingUser) {
      if (existingUser.status === "pending") {
        showErrorToast("This user already has a pending invitation");
      } else if (existingUser.role === "owner") {
        showErrorToast("This user is the owner of this page");
      } else if (existingUser.role === "collaborator") {
        showErrorToast("This user already has access to this page");
      } else {
        showErrorToast("This user already has access to this page");
      }
      return;
    }

    try {
      setLoading(true);
      const { error } = await sendInvite(pageId, emailToInvite);
      if (error) throw error;
      showSuccessToast("Invitation sent successfully!");
      setEmail("");
      // Refresh the user list to show pending invitations
      await fetchPageUsers();
    } catch (err) {
      console.error("sendInvite error", err);
      showErrorToast("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = () => {
    // Placeholder for future publish functionality
    showSuccessToast("Publish feature coming soon!");
  };

  // Check if email already has access
  const checkEmailAccess = (emailToCheck) => {
    if (!emailToCheck.trim()) return null;

    const existingUser = users.find(
      (user) => user.email?.toLowerCase() === emailToCheck.toLowerCase()
    );

    if (existingUser) {
      if (existingUser.status === "pending") {
        return { hasAccess: true, message: "Pending invitation" };
      } else if (existingUser.role === "owner") {
        return { hasAccess: true, message: "Owner of this page" };
      } else if (existingUser.role === "collaborator") {
        return { hasAccess: true, message: "Already has access" };
      }
      return { hasAccess: true, message: "Already has access" };
    }

    return null;
  };

  const emailAccessStatus = checkEmailAccess(email);

  const renderShareTab = () => (
    <View style={styles.tabContent}>
      <View
        style={[
          styles.searchContainer,
          {
            borderColor: emailAccessStatus?.hasAccess
              ? theme.error || "#FF5252"
              : theme.border || "#E0E0E0",
          },
        ]}
      >
        <Ionicons
          name="search"
          size={18}
          color={theme.secondaryText}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Invite people, emails, groups..."
          placeholderTextColor={theme.secondaryText}
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
        {emailAccessStatus?.hasAccess && (
          <Ionicons
            name="warning"
            size={18}
            color={theme.error || "#FF5252"}
            style={styles.warningIcon}
          />
        )}
      </View>

      {/* Warning message for duplicate emails */}
      {emailAccessStatus?.hasAccess && (
        <View
          style={[
            styles.warningContainer,
            { backgroundColor: theme.errorBackground || "#FFEBEE" },
          ]}
        >
          <Ionicons
            name="information-circle"
            size={16}
            color={theme.error || "#FF5252"}
            style={styles.warningMessageIcon}
          />
          <Text
            style={[styles.warningText, { color: theme.error || "#FF5252" }]}
          >
            {emailAccessStatus.message}
          </Text>
        </View>
      )}

      {/* User List - showing users with access */}
      <View style={styles.userList}>
        {loadingUsers ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
              Loading users...
            </Text>
          </View>
        ) : (
          users.map((pageUser, index) => (
            <View key={pageUser.id || index} style={styles.userItem}>
              <View style={styles.userAvatar}>
                {pageUser.avatar_url ? (
                  <Image
                    source={{ uri: pageUser.avatar_url }}
                    style={styles.avatarImage}
                  />
                ) : (
                  <Text style={styles.userAvatarText}>
                    {(pageUser.full_name || pageUser.email || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {pageUser.status === "pending"
                    ? pageUser.email
                    : pageUser.full_name || pageUser.email || "Unknown User"}
                  {pageUser.role === "owner" && " (You)"}
                  {pageUser.id === user?.id &&
                    pageUser.role === "collaborator" &&
                    " (You)"}
                </Text>
                <View style={styles.roleContainer}>
                  {pageUser.role === "owner" ? (
                    <Text
                      style={[styles.userRole, { color: theme.secondaryText }]}
                    >
                      Owner • {pageUser.access}
                    </Text>
                  ) : pageUser.status === "pending" ? (
                    <>
                      <View
                        style={[
                          styles.pendingBadge,
                          { backgroundColor: theme.warning || "#FFA500" },
                        ]}
                      >
                        <Text style={styles.pendingBadgeText}>Pending</Text>
                      </View>
                      <Text
                        style={[
                          styles.userRole,
                          { color: theme.secondaryText },
                        ]}
                      >
                        {pageUser.access}
                      </Text>
                    </>
                  ) : (
                    <>
                      <View
                        style={[
                          styles.collaboratorBadge,
                          { backgroundColor: theme.success || "#4CAF50" },
                        ]}
                      >
                        <Text style={styles.collaboratorBadgeText}>Editor</Text>
                      </View>
                      <Text
                        style={[
                          styles.userRole,
                          { color: theme.secondaryText },
                        ]}
                      >
                        {pageUser.access}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <TouchableOpacity style={styles.userActions}>
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={theme.secondaryText}
                />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* General Access Section */}
      <View style={styles.generalAccessSection}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          General access
        </Text>
        <TouchableOpacity style={styles.accessOption}>
          <Ionicons
            name="lock-closed"
            size={20}
            color={theme.secondaryText}
            style={styles.accessIcon}
          />
          <View style={styles.accessInfo}>
            <Text style={[styles.accessTitle, { color: theme.text }]}>
              Only people invited
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={16}
            color={theme.secondaryText}
          />
        </TouchableOpacity>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[
            styles.shareButton,
            {
              backgroundColor: theme.primary,
              opacity:
                !email.trim() || loading || emailAccessStatus?.hasAccess
                  ? 0.6
                  : 1,
            },
          ]}
          onPress={handleSendInvite}
          disabled={!email.trim() || loading || emailAccessStatus?.hasAccess}
        >
          {loading ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.shareButtonText}>Send invitation</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderPublishTab = () => (
    <View style={styles.tabContent}>
      <View style={styles.publishContent}>
        <Ionicons
          name="globe-outline"
          size={48}
          color={theme.secondaryText}
          style={styles.publishIcon}
        />
        <Text style={[styles.publishTitle, { color: theme.text }]}>
          Publish to web
        </Text>
        <Text
          style={[styles.publishDescription, { color: theme.secondaryText }]}
        >
          Make {pageTitle} public and share it with anyone on the web.
        </Text>

        <TouchableOpacity
          style={[styles.publishButton, { backgroundColor: theme.primary }]}
          onPress={handlePublish}
        >
          <Text style={styles.publishButtonText}>Publish</Text>
        </TouchableOpacity>

        <Text style={[styles.publishNote, { color: theme.secondaryText }]}>
          This feature is coming soon! You'll be able to make pages public and
          shareable via link.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.fullScreenContainer}>
        <SafeAreaView style={styles.safeArea}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            style={styles.keyboardAvoidingView}
          >
            <View
              style={[
                styles.modalContent,
                { backgroundColor: theme.background || theme.cardBackground },
              ]}
            >
              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                  Share settings
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Text
                    style={[styles.closeButtonText, { color: theme.primary }]}
                  >
                    Done
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Navigation */}
              <View style={styles.tabNavigation}>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "share" && [
                      styles.activeTab,
                      { backgroundColor: theme.surface },
                    ],
                  ]}
                  onPress={() => setActiveTab("share")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === "share"
                            ? theme.text
                            : theme.secondaryText,
                      },
                    ]}
                  >
                    Share
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.tab,
                    activeTab === "publish" && [
                      styles.activeTab,
                      { backgroundColor: theme.surface },
                    ],
                  ]}
                  onPress={() => setActiveTab("publish")}
                >
                  <Text
                    style={[
                      styles.tabText,
                      {
                        color:
                          activeTab === "publish"
                            ? theme.text
                            : theme.secondaryText,
                      },
                    ]}
                  >
                    Publish
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Tab Content */}
              <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
              >
                {activeTab === "share" ? renderShareTab() : renderPublishTab()}
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  fullScreenContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent overlay
  },
  safeArea: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  modalContent: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  tabNavigation: {
    flexDirection: "row",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  activeTab: {
    // backgroundColor set dynamically
  },
  tabText: {
    fontSize: 16,
    fontWeight: "500",
  },
  contentContainer: {
    flex: 1,
  },
  tabContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 20,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  warningIcon: {
    marginLeft: 8,
  },
  warningContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 16,
  },
  warningMessageIcon: {
    marginRight: 8,
  },
  warningText: {
    fontSize: 14,
    flex: 1,
  },
  userList: {
    marginBottom: 24,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#4285F4",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  userAvatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  userRole: {
    fontSize: 14,
  },
  roleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  guestBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  guestBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  guestBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  pendingBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  collaboratorBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginRight: 8,
  },
  collaboratorBadgeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  userActions: {
    padding: 8,
  },
  generalAccessSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  accessOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  accessIcon: {
    marginRight: 12,
  },
  accessInfo: {
    flex: 1,
  },
  accessTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  actionButtons: {
    paddingTop: 8,
  },
  shareButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  shareButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  publishContent: {
    alignItems: "center",
    paddingVertical: 40,
  },
  publishIcon: {
    marginBottom: 16,
  },
  publishTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  publishDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  publishButton: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 8,
    marginBottom: 20,
  },
  publishButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  publishNote: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
});

export default ShareModal;
