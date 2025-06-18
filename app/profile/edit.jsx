import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "../../utils/themeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
  updateUserProfile,
  updateUserAvatar,
  updateUserAvatarDirect,
  getCurrentUser,
} from "../../services/supabaseService";

export default function EditProfileScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [fullName, setFullName] = useState("");
  const [profileImage, setProfileImage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    if (user) {
      // Initialize with current values
      setFullName(user.user_metadata?.full_name || "");

      if (user.user_metadata?.avatar_url) {
        setProfileImage(user.user_metadata.avatar_url);
      }
    }
  }, [user]);

  const pickImage = async (useCamera = false) => {
    try {
      // Request media library permissions
      if (useCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission required",
            "Camera permission is needed to take a photo."
          );
          return;
        }
      } else {
        const { status } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== "granted") {
          Alert.alert(
            "Permission required",
            "Media library permission is needed to select a photo."
          );
          return;
        }
      }

      // Launch camera or image picker with extremely small image size for metadata storage
      const result = useCamera
        ? await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.05, // Extremely low quality
            base64: true,
            exif: false,
            width: 80, // Tiny image
            height: 80,
          })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.05, // Extremely low quality
            base64: true,
            exif: false,
            width: 80, // Tiny image
            height: 80,
          });

      if (!result.canceled) {
        // Use base64 directly if available
        if (result.assets[0].base64) {
          const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
          console.log("Got base64 image, length:", base64Image.length);
          setProfileImage(base64Image);
        } else {
          console.log("Using image URI:", result.assets[0].uri);
          setProfileImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setUploadProgress(25); // Start progress

      // Update the name first
      let nameUpdateSuccess = false;
      if (fullName !== user.user_metadata?.full_name) {
        const { error: nameError } = await updateUserProfile({
          full_name: fullName,
        });

        if (nameError) {
          console.error("Error updating name:", nameError);
        } else {
          nameUpdateSuccess = true;
          console.log("Name updated successfully");
        }
      } else {
        nameUpdateSuccess = true; // No change needed
      }

      setUploadProgress(50); // Name update done

      // Update the avatar separately
      let avatarUpdateSuccess = false;
      if (profileImage && profileImage !== user.user_metadata?.avatar_url) {
        try {
          console.log("Attempting to update avatar...");

          // Ensure we have a base64 image
          let base64Image = profileImage;

          // If it's not already a base64 string, convert it
          if (!profileImage.startsWith("data:image")) {
            console.log("Converting URI to base64...");
            const response = await fetch(profileImage);
            const blob = await response.blob();

            base64Image = await new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          }

          console.log("Base64 image ready, length:", base64Image.length);
          console.log(
            "Base64 image starts with:",
            base64Image.substring(0, 50) + "..."
          );

          // Try the first method
          const { error: avatarError } = await updateUserAvatar(base64Image);

          if (avatarError) {
            console.error(
              "Error updating avatar with first method:",
              avatarError
            );

            // Try the direct method as fallback
            console.log("Trying direct avatar update method...");
            const { error: directError } = await updateUserAvatarDirect(
              base64Image
            );

            if (directError) {
              console.error("Error with direct avatar update:", directError);
            } else {
              avatarUpdateSuccess = true;
              console.log("Avatar updated successfully with direct method");
            }
          } else {
            avatarUpdateSuccess = true;
            console.log("Avatar updated successfully with first method");
          }

          // Verify the update
          const updatedUser = await getCurrentUser();
          console.log(
            "Avatar URL in updated user:",
            updatedUser?.user_metadata?.avatar_url
              ? "Present (starts with: " +
                  updatedUser.user_metadata.avatar_url.substring(0, 30) +
                  "...)"
              : "Not present"
          );
        } catch (error) {
          console.error("Error processing avatar:", error);
        }
      } else {
        avatarUpdateSuccess = true; // No change needed or already a base64 image
      }

      setUploadProgress(100); // All done

      // Show appropriate message based on what was updated
      if (nameUpdateSuccess && avatarUpdateSuccess) {
        Alert.alert("Success", "Profile updated successfully", [
          { text: "OK", onPress: () => router.replace("/(tabs)/profile") },
        ]);
      } else if (nameUpdateSuccess) {
        Alert.alert(
          "Partial Success",
          "Name updated successfully, but there was an issue with the profile picture.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/profile") }]
        );
      } else if (avatarUpdateSuccess) {
        Alert.alert(
          "Partial Success",
          "Profile picture updated successfully, but there was an issue updating your name.",
          [{ text: "OK", onPress: () => router.replace("/(tabs)/profile") }]
        );
      } else {
        Alert.alert("Error", "Failed to update profile. Please try again.");
      }

      // Verify the update was successful
      const updatedUser = await getCurrentUser();
      console.log(
        "Updated user metadata:",
        JSON.stringify({
          full_name: updatedUser?.user_metadata?.full_name,
          has_avatar: !!updatedUser?.user_metadata?.avatar_url,
        })
      );
    } catch (error) {
      console.error("Error updating profile:", error);
      Alert.alert("Error", "Failed to update profile. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          title: "Edit Profile",
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerShadowVisible: false,
        }}
      />

      <View style={styles.content}>
        <View style={styles.photoContainer}>
          <View
            style={[styles.avatarContainer, { backgroundColor: theme.surface }]}
          >
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.avatar} />
            ) : (
              <Text style={[styles.avatarText, { color: theme.text }]}>
                {fullName ? fullName.substring(0, 2).toUpperCase() : "?"}
              </Text>
            )}
          </View>

          <View style={styles.photoButtons}>
            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: theme.surface }]}
              onPress={() => pickImage(false)}
            >
              <Ionicons name="image-outline" size={22} color={theme.primary} />
              <Text style={[styles.photoButtonText, { color: theme.text }]}>
                Gallery
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.photoButton, { backgroundColor: theme.surface }]}
              onPress={() => pickImage(true)}
            >
              <Ionicons name="camera-outline" size={22} color={theme.primary} />
              <Text style={[styles.photoButtonText, { color: theme.text }]}>
                Camera
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.inputContainer}>
          <Text style={[styles.label, { color: theme.text }]}>
            Display Name
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                color: theme.text,
                backgroundColor: theme.surface,
                borderColor: theme.border,
              },
            ]}
            placeholder="Enter your name"
            placeholderTextColor={theme.secondaryText}
            value={fullName}
            onChangeText={setFullName}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: theme.primary }]}
          onPress={handleSave}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Changes</Text>
          )}
        </TouchableOpacity>

        {isLoading && uploadProgress > 0 && (
          <Text style={[styles.uploadStatus, { color: theme.secondaryText }]}>
            Uploading... {Math.round(uploadProgress)}%
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  photoContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 15,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: "600",
  },
  photoButtons: {
    flexDirection: "row",
    justifyContent: "center",
  },
  photoButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginHorizontal: 8,
  },
  photoButtonText: {
    fontSize: 14,
    marginLeft: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
  },
  saveButton: {
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  saveButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  uploadStatus: {
    textAlign: "center",
    marginTop: 10,
    fontSize: 14,
  },
});
