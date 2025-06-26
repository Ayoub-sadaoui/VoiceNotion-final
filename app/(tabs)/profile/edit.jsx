import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../utils/themeContext";
import { useAuth } from "../../../contexts/AuthContext";
import {
  updateUserProfile,
  updateUserPassword,
  getCurrentUser,
} from "../../../services/supabaseService";
import { useRouter, useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user, setUser } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState(
    user?.user_metadata?.full_name || ""
  );
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [avatarUri, setAvatarUri] = useState(
    user?.user_metadata?.avatar_url || ""
  );
  const [loading, setLoading] = useState(false);

  // Refresh user data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      const refreshUserData = async () => {
        try {
          const updatedUser = await getCurrentUser();
          if (updatedUser) {
            setFullName(updatedUser.user_metadata?.full_name || "");
            setAvatarUri(updatedUser.user_metadata?.avatar_url || "");
          }
        } catch (error) {
          console.error("Error refreshing user data:", error);
        }
      };

      refreshUserData();
    }, [])
  );

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission denied",
        "Sorry, we need camera roll permissions to change your profile picture."
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      Alert.alert("Error", "Please enter your full name");
      return;
    }

    try {
      setLoading(true);

      const { error } = await updateUserProfile({
        full_name: fullName.trim(),
        avatar_url: avatarUri,
      });

      if (error) {
        throw error;
      }

      // Update local user context
      const updatedUser = await getCurrentUser();
      if (updatedUser && setUser) {
        setUser(updatedUser);
      }

      Alert.alert("Success", "Profile updated successfully", [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert("Error", "Please fill in all password fields");
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    try {
      setLoading(true);

      const { error } = await updateUserPassword(newPassword);

      if (error) {
        throw error;
      }

      // Clear password fields
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      Alert.alert("Success", "Password updated successfully");
    } catch (error) {
      console.error("Error updating password:", error);
      Alert.alert("Error", "Failed to update password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = () => {
    if (fullName) {
      return fullName.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  const hasAvatar =
    avatarUri && typeof avatarUri === "string" && avatarUri.length > 0;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Header */}
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.border,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              paddingTop: Platform.OS === "ios" ? 60 : 40,
              paddingHorizontal: 16,
            },
          ]}
        >
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text
            style={[
              styles.headerTitle,
              { color: theme.text, fontSize: 20, fontWeight: "bold" },
            ]}
          >
            Edit Profile
          </Text>
          <TouchableOpacity
            onPress={handleSaveProfile}
            disabled={loading}
            style={styles.saveButton}
          >
            <Text style={[styles.saveButtonText, { color: theme.primary }]}>
              {loading ? "Saving..." : "Save"}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Profile Picture Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity
              onPress={pickImage}
              style={styles.avatarTouchable}
            >
              <View
                style={[
                  styles.avatarContainer,
                  { backgroundColor: theme.surface },
                ]}
              >
                {hasAvatar ? (
                  <Image source={{ uri: avatarUri }} style={styles.avatar} />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: theme.primary },
                    ]}
                  >
                    <Text style={styles.avatarText}>{getInitials()}</Text>
                  </View>
                )}
                <View
                  style={[
                    styles.cameraIcon,
                    { backgroundColor: theme.primary },
                  ]}
                >
                  <Ionicons name="camera" size={16} color="white" />
                </View>
              </View>
            </TouchableOpacity>
            <Text
              style={[styles.changePhotoText, { color: theme.secondaryText }]}
            >
              Tap to change photo
            </Text>
          </View>

          {/* Profile Information */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Profile Information
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>
                Full Name
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor={theme.tertiaryText}
                autoCapitalize="words"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>
                Email
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  styles.disabledInput,
                  {
                    backgroundColor: theme.inputDisabled,
                    color: theme.secondaryText,
                    borderColor: theme.border,
                  },
                ]}
                value={user?.email || ""}
                editable={false}
                placeholder="Email address"
                placeholderTextColor={theme.tertiaryText}
              />
              <Text style={[styles.helpText, { color: theme.tertiaryText }]}>
                Email cannot be changed
              </Text>
            </View>
          </View>

          {/* Change Password Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              Change Password
            </Text>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>
                Current Password
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Enter current password"
                placeholderTextColor={theme.tertiaryText}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>
                New Password
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="Enter new password"
                placeholderTextColor={theme.tertiaryText}
                secureTextEntry
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: theme.secondaryText }]}>
                Confirm New Password
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: theme.surface,
                    color: theme.text,
                    borderColor: theme.border,
                  },
                ]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={theme.tertiaryText}
                secureTextEntry
              />
            </View>

            <TouchableOpacity
              style={[
                styles.changePasswordButton,
                { backgroundColor: theme.primary },
              ]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              <Text style={styles.changePasswordButtonText}>
                {loading ? "Updating..." : "Change Password"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 120, // Extra padding for keyboard
  },
  avatarSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  saveButtonTop: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
    marginBottom: 20,
  },
  saveButtonTopText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  avatarTouchable: {
    position: "relative",
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 36,
    fontWeight: "600",
  },
  cameraIcon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  changePhotoText: {
    marginTop: 10,
    fontSize: 14,
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 16,
  },
  disabledInput: {
    opacity: 0.6,
  },
  helpText: {
    fontSize: 12,
    marginTop: 5,
  },
  changePasswordButton: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  changePasswordButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
  },
});
