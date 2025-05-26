import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useTheme } from "../../utils/themeContext";
import usePageStorage from "../../hooks/usePageStorage";

export default function NoteIndexScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const { pages, loading } = usePageStorage();

  // Log any params we received for debugging
  useEffect(() => {
    console.log("Note index received params:", params);
  }, [params]);

  const navigateToFirstPage = () => {
    if (pages && pages.length > 0) {
      const pageId = pages[0].id;
      console.log("Navigating to first page:", pageId);
      router.push(`/note/${pageId}`);
    } else {
      console.log("No pages available");
      alert("No pages available to navigate to");
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Note Index</Text>
      <Text style={[styles.description, { color: theme.secondaryText }]}>
        This is a test page to verify routing is working correctly
      </Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            { backgroundColor: theme.secondary, marginTop: 12 },
          ]}
          onPress={navigateToFirstPage}
        >
          <Text style={styles.buttonText}>Go to First Page</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 30,
  },
  buttonContainer: {
    width: "100%",
    maxWidth: 300,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
