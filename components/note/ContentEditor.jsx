import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import Editor from "../Editor";

/**
 * ContentEditor component - Handles the main editor area of the note screen
 */
const ContentEditor = ({
  editorRef,
  initialContent,
  title,
  icon,
  onChange,
  onNavigateToPage,
  keyboardHeight,
  isKeyboardVisible,
  currentPageId,
  onCreateNestedPage,
  onDeletePage,
  nestedPages,
  recentTranscription,
  forceRefresh,
  theme,
  isDark,
}) => {
  // Convert theme object to theme name string for the editor
  const themeName = isDark ? "dark" : "light";

  return (
    <KeyboardAvoidingView
      style={styles.editorContainer}
      behavior={Platform.OS === "ios" ? "padding" : null}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      {initialContent &&
      Array.isArray(initialContent) &&
      initialContent.length > 0 ? (
        <Editor
          key={`editor-${forceRefresh}`}
          ref={editorRef}
          title={title}
          icon={icon}
          initialContent={initialContent}
          onChange={onChange}
          onNavigateToPage={onNavigateToPage}
          keyboardHeight={keyboardHeight}
          isKeyboardVisible={isKeyboardVisible}
          currentPageId={currentPageId}
          onCreateNestedPage={onCreateNestedPage}
          onDeletePage={onDeletePage}
          nestedPages={nestedPages}
          recentTranscription={recentTranscription}
          theme={themeName}
        />
      ) : (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.secondary} />
          <Text style={[styles.loadingText, { color: theme.secondaryText }]}>
            Preparing editor...
          </Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  editorContainer: {
    flex: 1,
    width: "100%",
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
});

export default ContentEditor;
