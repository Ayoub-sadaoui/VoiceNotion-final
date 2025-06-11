import React from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";

export default function AboutScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  const handleBackPress = () => {
    router.back();
  };

  // Handle opening URLs
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("Error opening URL:", err)
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          title: "About",
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content}>
        {/* App info section */}
        <View style={styles.section}>
          <View style={styles.appInfoContainer}>
            <View
              style={[styles.logoContainer, { backgroundColor: theme.primary }]}
            >
              <Ionicons name="document-text" size={40} color="#FFF" />
            </View>
            <Text style={[styles.appName, { color: theme.text }]}>
              VoiceNotion
            </Text>
            <Text style={[styles.appVersion, { color: theme.secondaryText }]}>
              Version 1.0.0
            </Text>
          </View>
        </View>

        {/* Description section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Description
          </Text>
          <Text style={[styles.description, { color: theme.secondaryText }]}>
            VoiceNotion is a seamless, mobile-first note-taking and document
            creation application where users can effortlessly capture,
            structure, and refine their thoughts primarily through voice
            commands, complemented by a powerful and intuitive block-based
            editor.
          </Text>
        </View>

        {/* Features section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Key Features
          </Text>

          <View style={styles.featureItem}>
            <Ionicons
              name="mic-outline"
              size={22}
              color={theme.primary}
              style={styles.featureIcon}
            />
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                Voice Commands
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Create and edit notes using natural voice commands
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons
              name="document-text-outline"
              size={22}
              color={theme.primary}
              style={styles.featureIcon}
            />
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                Block-Based Editor
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Powerful, Notion-like editor with headings, lists, and more
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons
              name="layers-outline"
              size={22}
              color={theme.primary}
              style={styles.featureIcon}
            />
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                Nested Pages
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Organize your notes with hierarchical page structure
              </Text>
            </View>
          </View>

          <View style={styles.featureItem}>
            <Ionicons
              name="color-palette-outline"
              size={22}
              color={theme.primary}
              style={styles.featureIcon}
            />
            <View style={styles.featureTextContainer}>
              <Text style={[styles.featureTitle, { color: theme.text }]}>
                Light & Dark Themes
              </Text>
              <Text
                style={[
                  styles.featureDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Choose between light and dark mode for comfortable viewing
              </Text>
            </View>
          </View>
        </View>

        {/* Technologies section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Built With
          </Text>

          <View style={styles.techItem}>
            <Text style={[styles.techName, { color: theme.text }]}>
              Expo/React Native
            </Text>
            <Text
              style={[styles.techDescription, { color: theme.secondaryText }]}
            >
              Cross-platform mobile framework
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={[styles.techName, { color: theme.text }]}>
              BlockNote
            </Text>
            <Text
              style={[styles.techDescription, { color: theme.secondaryText }]}
            >
              Block-based rich text editor
            </Text>
          </View>

          <View style={styles.techItem}>
            <Text style={[styles.techName, { color: theme.text }]}>
              Gemini API
            </Text>
            <Text
              style={[styles.techDescription, { color: theme.secondaryText }]}
            >
              AI-powered voice command processing
            </Text>
          </View>
        </View>

        {/* Privacy policy and terms section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Legal
          </Text>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink("https://example.com/privacy")}
          >
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Privacy Policy
            </Text>
            <Ionicons name="open-outline" size={16} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink("https://example.com/terms")}
          >
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Terms of Service
            </Text>
            <Ionicons name="open-outline" size={16} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Credits section */}
        <View
          style={[
            styles.section,
            { borderTopColor: theme.border, marginBottom: 40 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Credits
          </Text>
          <Text style={[styles.credits, { color: theme.secondaryText }]}>
            © 2023 VoiceNotion{"\n"}
            Made with ❤️ for productivity
          </Text>
        </View>
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
  section: {
    padding: 20,
    borderTopWidth: 1,
  },
  appInfoContainer: {
    alignItems: "center",
    marginBottom: 10,
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  appName: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
  },
  featureItem: {
    flexDirection: "row",
    marginBottom: 16,
    alignItems: "flex-start",
  },
  featureIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  featureTextContainer: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  techItem: {
    marginBottom: 12,
  },
  techName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  techDescription: {
    fontSize: 14,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    justifyContent: "space-between",
  },
  linkText: {
    fontSize: 16,
    fontWeight: "500",
  },
  credits: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
