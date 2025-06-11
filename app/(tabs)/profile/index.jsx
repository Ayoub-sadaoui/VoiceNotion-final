import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  Image,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../utils/themeContext";
import { useAuth } from "../../../contexts/AuthContext";
import { signOut } from "../../../services/supabaseService";
import { syncPendingNotesWithSupabase } from "../../../services/noteService";
import ScreenHeader from "../../../components/ScreenHeader";
import { useRouter } from "expo-router";

export default function ProfileScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  // Handle logout
  const handleLogout = async () => {
    Alert.alert("Log Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          try {
            // Sync any pending notes before logout
            if (user) {
              await syncPendingNotesWithSupabase(user.id);
            }

            // Perform logout
            const { error } = await signOut();

            if (error) {
              throw error;
            }

            // Navigate to login
            router.replace("/auth/login");
          } catch (error) {
            console.error("Logout error:", error);
            Alert.alert("Error", "Failed to log out. Please try again.");
          }
        },
      },
    ]);
  };

  // Get initials for avatar
  const getInitials = () => {
    if (!user || !user.email) return "?";

    // Use email if no user name
    const email = user.email;
    return email.substring(0, 2).toUpperCase();
  };

  const settingsItems = [
    {
      id: "theme",
      icon: "color-palette-outline",
      title: "Theme",
      rightElement: (
        <View style={styles.themeToggleContainer}>
          <Text style={[styles.themeLabel, { color: theme.secondaryText }]}>
            {isDark ? "Dark" : "Light"}
          </Text>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: "#767577", true: theme.primary }}
            thumbColor={isDark ? "#ffffff" : "#f4f3f4"}
          />
        </View>
      ),
    },
    {
      id: "backup",
      icon: "cloud-upload-outline",
      title: "Backup & Sync",
      screen: "backup",
    },
    {
      id: "help",
      icon: "help-circle-outline",
      title: "Help & Support",
      screen: "help",
    },
    {
      id: "about",
      icon: "information-circle-outline",
      title: "About",
      screen: "/profile/about",
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <ScreenHeader title="Profile" />
      <ScrollView style={styles.content}>
        <View
          style={[styles.profileSection, { borderBottomColor: theme.border }]}
        >
          <View style={styles.avatarContainer}>
            <View style={[styles.avatar, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarText}>{getInitials()}</Text>
            </View>
          </View>
          <Text style={[styles.userName, { color: theme.text }]}>
            {user?.user_metadata?.full_name || "User"}
          </Text>
          <Text style={[styles.userEmail, { color: theme.secondaryText }]}>
            {user?.email || "No email"}
          </Text>
        </View>

        <View style={styles.settingsSection}>
          {settingsItems.map((item) => (
            <TouchableOpacity
              key={item.id}
              style={[styles.settingsItem, { borderBottomColor: theme.border }]}
              onPress={() => item.screen && router.push(item.screen)}
            >
              <Ionicons name={item.icon} size={22} color={theme.icon} />
              <Text style={[styles.settingsItemText, { color: theme.text }]}>
                {item.title}
              </Text>
              {item.rightElement ? (
                item.rightElement
              ) : (
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={theme.icon}
                  style={styles.chevron}
                />
              )}
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: theme.surface }]}
          onPress={handleLogout}
        >
          <Text style={[styles.logoutButtonText, { color: theme.error }]}>
            Log Out
          </Text>
        </TouchableOpacity>

        <Text style={[styles.versionText, { color: theme.tertiaryText }]}>
          VoiceNotion v1.0.0
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  profileSection: {
    alignItems: "center",
    paddingVertical: 30,
    borderBottomWidth: 1,
  },
  avatarContainer: {
    marginBottom: 15,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 30,
    fontWeight: "600",
  },
  userName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
  },
  settingsSection: {
    marginTop: 20,
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  settingsItemText: {
    fontSize: 16,
    marginLeft: 15,
    flex: 1,
  },
  chevron: {
    marginLeft: "auto",
  },
  themeToggleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  themeLabel: {
    marginRight: 10,
    fontSize: 14,
  },
  logoutButton: {
    margin: 20,
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: "center",
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  versionText: {
    textAlign: "center",
    fontSize: 14,
    marginBottom: 20,
  },
});
