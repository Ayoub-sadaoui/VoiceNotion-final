import React from "react";
import { Text, View, StyleSheet, Pressable } from "react-native";
import { Link } from "expo-router";

/**
 * PageLink component - A direct link to a page using expo-router's Link component
 * This provides a more reliable navigation method than using router.push
 */
export default function PageLink({ page, onPress }) {
  return (
    <Link href={`/note/${page.id}`} asChild>
      <Pressable
        style={styles.container}
        onPress={() => onPress && onPress(page)}
      >
        <Text>{page.title}</Text>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 10,
  },
});
