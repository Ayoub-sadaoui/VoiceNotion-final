import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Linking,
  Image,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";

export default function HelpScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState(null);

  const handleBackPress = () => {
    router.back();
  };

  // Handle opening URLs
  const handleOpenLink = (url) => {
    Linking.openURL(url).catch((err) =>
      console.error("Error opening URL:", err)
    );
  };

  // Handle email support
  const handleEmailSupport = () => {
    Linking.openURL(
      "mailto:support@sayNote.com?subject=sayNote Support Request"
    ).catch((err) => console.error("Error opening email:", err));
  };

  // Toggle FAQ expansion
  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  // FAQ data
  const faqs = [
    {
      question: "How do I use voice commands?",
      answer:
        "To use voice commands, tap the microphone button at the bottom of the note screen. Speak clearly and use commands like 'create heading', 'add bullet list', or 'make text bold'. You can also dictate text directly.",
    },
    {
      question: "Can I use sayNote offline?",
      answer:
        "Yes, you can create and edit notes offline. Voice commands require an internet connection, but the editor works fully offline. Your changes will sync when you're back online.",
    },
    {
      question: "How do I create nested pages?",
      answer:
        "You can create nested pages by clicking the '+' button next to any existing page in the home screen, or by using the 'Create Link' button in the editor toolbar while editing a note.",
    },
    {
      question: "How do I switch between light and dark mode?",
      answer:
        "Go to the Profile tab and use the Theme toggle switch to change between light and dark mode.",
    },
    {
      question: "How do I backup my notes?",
      answer:
        "Your notes are automatically backed up to your account if you're signed in. You can also manually sync by going to Profile > Backup & Sync.",
    },
  ];

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          title: "Help & Support",
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content}>
        {/* Help header section */}
        <View style={styles.headerSection}>
          <View
            style={[styles.iconContainer, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="help-buoy" size={40} color="#FFF" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            How can we help you?
          </Text>
        </View>

        {/* Quick help buttons */}
        <View style={styles.quickHelpSection}>
          <TouchableOpacity
            style={[styles.quickHelpButton, { backgroundColor: theme.surface }]}
            onPress={() => router.push("/profile/voice-commands")}
          >
            <Ionicons name="mic-outline" size={24} color={theme.primary} />
            <Text style={[styles.quickHelpText, { color: theme.text }]}>
              Voice Commands
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.quickHelpButton, { backgroundColor: theme.surface }]}
            onPress={handleEmailSupport}
          >
            <Ionicons name="mail-outline" size={24} color={theme.primary} />
            <Text style={[styles.quickHelpText, { color: theme.text }]}>
              Contact Support
            </Text>
          </TouchableOpacity>
        </View>

        {/* FAQ section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Frequently Asked Questions
          </Text>

          {faqs.map((faq, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.faqItem, { borderBottomColor: theme.border }]}
              onPress={() => toggleFaq(index)}
            >
              <View style={styles.faqHeader}>
                <Text style={[styles.faqQuestion, { color: theme.text }]}>
                  {faq.question}
                </Text>
                <Ionicons
                  name={expandedFaq === index ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={theme.icon}
                />
              </View>

              {expandedFaq === index && (
                <Text
                  style={[styles.faqAnswer, { color: theme.secondaryText }]}
                >
                  {faq.answer}
                </Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Contact support section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Contact Support
          </Text>

          <TouchableOpacity
            style={[styles.supportButton, { backgroundColor: theme.primary }]}
            onPress={handleEmailSupport}
          >
            <Ionicons name="mail" size={20} color="#FFF" />
            <Text style={styles.supportButtonText}>Email Support</Text>
          </TouchableOpacity>

          <Text style={[styles.supportInfo, { color: theme.secondaryText }]}>
            Our support team typically responds within 24 hours.
          </Text>
        </View>

        {/* App information */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            App Information
          </Text>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>
              Version
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>1.0.0</Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>
              Platform
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              {Platform.OS === "ios" ? "iOS" : "Android"}
            </Text>
          </View>

          <View style={styles.infoItem}>
            <Text style={[styles.infoLabel, { color: theme.secondaryText }]}>
              Build
            </Text>
            <Text style={[styles.infoValue, { color: theme.text }]}>
              2023.06.01
            </Text>
          </View>
        </View>

        {/* Links section */}
        <View
          style={[
            styles.section,
            { borderTopColor: theme.border, marginBottom: 40 },
          ]}
        >
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Resources
          </Text>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => router.push("/profile/about")}
          >
            <Text style={[styles.linkText, { color: theme.primary }]}>
              About sayNote
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink("https://example.com/privacy")}
          >
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Privacy Policy
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.linkItem}
            onPress={() => handleOpenLink("https://example.com/terms")}
          >
            <Text style={[styles.linkText, { color: theme.primary }]}>
              Terms of Service
            </Text>
            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
          </TouchableOpacity>
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
  headerSection: {
    alignItems: "center",
    paddingVertical: 30,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "600",
  },
  quickHelpSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  quickHelpButton: {
    width: "48%",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  quickHelpText: {
    marginTop: 8,
    fontWeight: "500",
  },
  section: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  faqItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  faqHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: "500",
    flex: 1,
    paddingRight: 10,
  },
  faqAnswer: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
    paddingLeft: 4,
  },
  supportButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 16,
  },
  supportButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    fontSize: 16,
    marginLeft: 8,
  },
  supportInfo: {
    fontSize: 14,
    textAlign: "center",
  },
  infoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  infoLabel: {
    fontSize: 15,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "500",
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  linkText: {
    fontSize: 16,
  },
});
