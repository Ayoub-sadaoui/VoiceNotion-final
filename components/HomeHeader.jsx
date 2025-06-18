import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  StatusBar,
  Image,
} from "react-native";
import { useTheme } from "../utils/themeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Home Header Component
 *
 * Displays the user's profile picture, greeting, and username on one line
 */
const HomeHeader = ({ user }) => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  // Calculate padding to avoid status bar
  const statusBarHeight =
    Platform.OS === "ios" ? insets.top : StatusBar.currentHeight || 0;

  // Get appropriate greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Get greeting emoji based on time of day
  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "☀️"; // morning sun
    if (hour < 18) return "🌤️"; // afternoon sun
    return "🌙"; // evening moon
  };

  // Get user's name or email
  const getUserName = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name;
    }
    if (user?.email) {
      // Return just the part before @ in email
      return user.email.split("@")[0];
    }
    return "User";
  };

  // Check if user has an avatar
  const hasAvatar =
    user?.user_metadata?.avatar_url &&
    typeof user.user_metadata.avatar_url === "string" &&
    user.user_metadata.avatar_url.length > 0;

  // Get user's initials for avatar placeholder
  const getInitials = () => {
    if (user?.user_metadata?.full_name) {
      return user.user_metadata.full_name.substring(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "?";
  };

  return (
    <View
      style={[
        styles.header,
        {
          backgroundColor: theme.background,
          borderBottomColor: theme.border,
          paddingTop: Math.max(statusBarHeight, 10) + 5,
          paddingBottom: 15,
        },
      ]}
    >
      <View style={styles.headerContent}>
        <View style={styles.avatarContainer}>
          {hasAvatar ? (
            <Image
              source={{ uri: user.user_metadata.avatar_url }}
              style={styles.avatar}
              onError={(e) => {
                console.error(
                  "Error loading avatar image:",
                  e.nativeEvent.error
                );
              }}
            />
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
        </View>
        <View style={styles.textContainer}>
          <Text style={[styles.greetingText, { color: theme.secondaryText }]}>
            {getGreeting()}
            {", "}
            <Text style={[styles.userName, { color: theme.text }]}>
              {getUserName()} {getGreetingEmoji()}
            </Text>
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    zIndex: 10,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  textContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: "400",
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default HomeHeader;
