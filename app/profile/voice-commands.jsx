import React from "react";
import { View, Text, StyleSheet, SafeAreaView, ScrollView } from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";

// Import the voice commands content
const voiceCommandsContent = `
VoiceNotion Voice Command Examples

## Structured Note Examples

Here are examples of voice commands you can use with VoiceNotion to create well-structured notes:

### 1. Meeting Notes

Try saying:
"Create a meeting notes heading followed by the main points we discussed including project timeline customer feedback and next steps"

### 2. To-Do List

Try saying:
"Make a to-do list for today with following tasks buy groceries call dentist office finish project proposal and send email to team"

### 3. Recipe Format

Try saying:
"Recipe for pasta carbonara first a heading called ingredients then list eggs pancetta parmesan cheese black pepper pasta now add a heading called instructions with steps boil pasta fry pancetta beat eggs add cheese mix everything together"

### 4. Lecture Notes

Try saying:
"The American Civil War lecture notes the war lasted from 1861 to 1865 there were three main causes first economic differences between north and south second states rights versus federal control third slavery expansion into western territories"

### 5. Product Description

Try saying:
"New product idea heading smart water bottle that tracks hydration levels bullet points includes temperature sensor connects to smartphone app sends reminders to drink more water battery lasts for two weeks"

### 6. Book Notes

Try saying:
"Book notes for Thinking Fast and Slow by Daniel Kahneman the book introduces two systems of thinking system 1 is fast intuitive and emotional system 2 is slower more deliberative and more logical the book explains common cognitive biases including anchoring the availability heuristic and loss aversion"

### 7. Mixed Content Types

Try saying:
"Today's workout plan start with a heading called warm-up then list jumping jacks arm circles and light jog now add a heading called main exercises and list as numbered items squats 3 sets push-ups 3 sets lunges 2 sets finally add a heading called cool down with stretches as bullet points"

## Content Editing Commands

Here are examples of voice commands you can use to edit your notes:

### 1. Text Formatting

Try saying:
"Make the last paragraph bold"
"Make the first heading italic"
"Underline the text that says project timeline"
"Change the heading color to blue"
"Make the last paragraph color red"
"Change the color of all headings to green"
"Make all paragraphs italic"

### 2. Text Selection

Try saying:
"Select the last paragraph"
"Select from 'project timeline' to 'next steps'"
"Select all headings"
"Select the text that says customer feedback"

### 3. Content Modification

Try saying:
"Replace 'customer feedback' with 'client comments'"
"Change the heading 'Ingredients' to 'Required Ingredients'"
"Delete everything after 'next steps'"
"Replace Untitled Page with My Project Notes"

### 4. Block Transformation

Try saying:
"Convert the paragraph about timeline to a bulleted list"
"Change the first heading to heading level 2"
"Make this paragraph a quote block"
"Convert this paragraph to a bullet list"
"Change the last paragraph to a numbered list"
"Convert this text to a todo list"
"Convert this block to a bullet list"
"Make this block a heading"
"Change current block to a todo list"
"Turn this block into a quote"

### 5. Undo/Redo Operations

Try saying:
"Undo last change"
"Redo"
"Undo the last two changes"

### 6. Multiple Block Operations

Try saying:
"Change all headings to blue"
"Make all paragraphs italic"
"Convert all paragraphs to bullet lists"
"Change the color of all blocks to green"
"Make all headings level 2"
`;

// Helper function to parse markdown-like text into sections
const parseContent = (content) => {
  const sections = [];
  let currentSection = { title: "", content: [], level: 0 };

  content.split("\n").forEach((line) => {
    if (line.startsWith("###")) {
      // Sub-section (level 3)
      if (currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = {
        title: line.replace("###", "").trim(),
        content: [],
        level: 3,
      };
    } else if (line.startsWith("##")) {
      // Section (level 2)
      if (currentSection.title) {
        sections.push({ ...currentSection });
      }
      currentSection = {
        title: line.replace("##", "").trim(),
        content: [],
        level: 2,
      };
    } else if (line.trim() !== "") {
      // Content line
      currentSection.content.push(line);
    }
  });

  // Add the last section
  if (currentSection.title) {
    sections.push(currentSection);
  }

  return sections;
};

export default function VoiceCommandsScreen() {
  const { theme } = useTheme();
  const router = useRouter();

  // Parse the voice commands content
  const sections = parseContent(voiceCommandsContent);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          title: "Voice Commands",
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content}>
        <View style={styles.headerSection}>
          <View
            style={[styles.iconContainer, { backgroundColor: theme.primary }]}
          >
            <Ionicons name="mic" size={40} color="#FFF" />
          </View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            Voice Commands Guide
          </Text>
          <Text style={[styles.headerSubtitle, { color: theme.secondaryText }]}>
            Examples and tips for using voice with VoiceNotion
          </Text>
        </View>

        {sections.map((section, index) => (
          <View
            key={index}
            style={[
              styles.section,
              { borderTopColor: theme.border },
              index === 0 && styles.firstSection,
            ]}
          >
            <Text
              style={[
                styles.sectionTitle,
                { color: theme.text },
                section.level === 3 && styles.subSectionTitle,
              ]}
            >
              {section.title}
            </Text>

            {section.content.map((line, lineIndex) => {
              if (line.startsWith("Try saying:")) {
                return (
                  <Text
                    key={`${index}-${lineIndex}`}
                    style={[
                      styles.trySayingLabel,
                      { color: theme.secondaryText },
                    ]}
                  >
                    {line}
                  </Text>
                );
              } else if (line.startsWith('"')) {
                return (
                  <View
                    key={`${index}-${lineIndex}`}
                    style={[
                      styles.commandExample,
                      { backgroundColor: theme.surface },
                    ]}
                  >
                    <Text
                      style={[styles.commandText, { color: theme.primary }]}
                    >
                      {line.replace(/"/g, "")}
                    </Text>
                  </View>
                );
              } else {
                return (
                  <Text
                    key={`${index}-${lineIndex}`}
                    style={[styles.contentText, { color: theme.secondaryText }]}
                  >
                    {line}
                  </Text>
                );
              }
            })}
          </View>
        ))}
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
    paddingHorizontal: 20,
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
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSubtitle: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  section: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderTopWidth: 1,
  },
  firstSection: {
    borderTopWidth: 0,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  trySayingLabel: {
    fontSize: 16,
    fontStyle: "italic",
    marginVertical: 8,
  },
  commandExample: {
    padding: 16,
    borderRadius: 8,
    marginVertical: 8,
  },
  commandText: {
    fontSize: 16,
    fontWeight: "500",
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginVertical: 8,
  },
});
