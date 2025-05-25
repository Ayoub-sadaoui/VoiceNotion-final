import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { notes } from "../../utils/mockData";

export default function NoteDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [voiceState, setVoiceState] = useState("idle");

  // Fetch note data
  useEffect(() => {
    // Simulate API call
    const fetchNote = async () => {
      try {
        // Find note by ID from mock data
        const foundNote = notes.find((n) => n.id === id);
        if (foundNote) {
          setNote(foundNote);
        } else {
          // Note not found
          console.error("Note not found:", id);
        }
      } catch (error) {
        console.error("Error fetching note:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchNote();
  }, [id]);

  // Handle voice input
  const handleVoiceInput = () => {
    if (voiceState === "idle") {
      setVoiceState("listening");

      // Simulate processing
      setTimeout(() => {
        setVoiceState("processing");
        setTimeout(() => {
          setVoiceState("idle");
        }, 1500);
      }, 2000);
    } else if (voiceState === "listening") {
      setVoiceState("idle");
    }
  };

  // Handle going back
  const handleBack = () => {
    router.back();
  };

  // Format content for display
  const formatContent = (content) => {
    return content.split("\n").map((line, index) => (
      <Text key={index} style={[styles.contentText, { color: theme.text }]}>
        {line}
      </Text>
    ));
  };

  if (loading) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Loading note...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!note) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: theme.background }]}
      >
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={48} color={theme.error} />
          <Text style={[styles.errorText, { color: theme.text }]}>
            Note not found
          </Text>
          <TouchableOpacity
            style={[styles.returnButton, { backgroundColor: theme.primary }]}
            onPress={handleBack}
          >
            <Text style={styles.returnButtonText}>Return to Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton}>
          <Ionicons name="ellipsis-horizontal" size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.noteContainer}>
        <Text style={[styles.noteTitle, { color: theme.text }]}>
          {note.title}
        </Text>

        {note.tags && note.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {note.tags.map((tag, index) => (
              <View
                key={index}
                style={[
                  styles.tag,
                  {
                    backgroundColor: theme.chip.background,
                    borderColor: theme.border,
                  },
                ]}
              >
                <Text style={[styles.tagText, { color: theme.primary }]}>
                  #{tag}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.contentContainer}>
          {formatContent(note.content)}
        </View>

        <Text style={[styles.dateText, { color: theme.tertiaryText }]}>
          Last edited: {new Date(note.updatedAt).toLocaleString()}
        </Text>
      </View>

      <View style={[styles.footer, { borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.editButton, { backgroundColor: theme.primary }]}
          onPress={() => router.push(`/editor?noteId=${note.id}`)}
        >
          <Ionicons name="create-outline" size={20} color="#FFFFFF" />
          <Text style={styles.editButtonText}>Edit Note</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 18,
    marginTop: 16,
    marginBottom: 24,
  },
  returnButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  returnButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 8,
  },
  actionButton: {
    padding: 8,
  },
  noteContainer: {
    flex: 1,
    padding: 20,
  },
  noteTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 20,
  },
  tag: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 14,
    fontWeight: "500",
  },
  contentContainer: {
    marginBottom: 20,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 10,
  },
  dateText: {
    fontSize: 12,
    marginTop: 20,
  },
  footer: {
    padding: 20,
    borderTopWidth: 1,
    alignItems: "center",
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  editButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
    marginLeft: 8,
  },
});
