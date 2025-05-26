import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter, useLocalSearchParams, useSegments } from "expo-router";
import { useTheme } from "../../utils/themeContext";

export default function DebugScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();
  const segments = useSegments();

  // Log routing information
  useEffect(() => {
    console.log("Debug Screen - URL Segments:", segments);
    console.log("Debug Screen - URL Params:", params);
  }, [segments, params]);

  // Convert an object to a displayable string
  const objectToString = (obj) => {
    return JSON.stringify(obj, null, 2);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>
        Routing Debug Info
      </Text>

      <ScrollView style={styles.scrollView}>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            URL Segments:
          </Text>
          <Text
            style={[
              styles.code,
              { color: theme.text, backgroundColor: theme.codeBackground },
            ]}
          >
            {objectToString(segments)}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            URL Params:
          </Text>
          <Text
            style={[
              styles.code,
              { color: theme.text, backgroundColor: theme.codeBackground },
            ]}
          >
            {objectToString(params)}
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonText}>Go Back</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.secondary }]}
          onPress={() => router.push("/note")}
        >
          <Text style={styles.buttonText}>Go to Note Index</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  code: {
    fontFamily: "monospace",
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 8,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "500",
  },
});
