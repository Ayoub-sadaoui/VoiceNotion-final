import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { Stack } from "expo-router";

/**
 * LoadingView component - Shows a loading indicator
 */
export const LoadingView = ({ theme, message = "Loading page..." }) => {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
          {message}
        </Text>
      </View>
    </SafeAreaView>
  );
};

/**
 * ErrorView component - Shows an error message with a button to return home
 */
export const ErrorView = ({ theme, onReturnHome }) => {
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <View style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.error || "red" }]}>
          Error: Page not found
        </Text>
        <TouchableOpacity
          style={[styles.errorButton, { backgroundColor: theme.primary }]}
          onPress={onReturnHome}
        >
          <Text style={styles.errorButtonText}>Return to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    marginBottom: 16,
    fontSize: 16,
    fontWeight: "500",
  },
  errorButton: {
    padding: 16,
    borderRadius: 8,
  },
  errorButtonText: {
    fontSize: 16,
    fontWeight: "500",
    color: "white",
  },
});

export default {
  LoadingView,
  ErrorView,
};
