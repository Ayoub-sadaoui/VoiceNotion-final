import React, { useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  PanResponder,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/themeContext";
import { useRouter } from "expo-router";

/**
 * Note Card Component
 *
 * Displays a preview of a note with title, summary, and metadata
 * Includes swipe gestures for quick actions
 */
const NoteCard = ({ note }) => {
  const { theme } = useTheme();
  const router = useRouter();
  const [isPinned, setIsPinned] = useState(note.isPinned);

  // Animation values
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // Define pan responder for swipe gestures
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        // When touch starts, slightly scale down the card for feedback
        Animated.spring(scaleAnim, {
          toValue: 0.98,
          friction: 5,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow horizontal swiping up to a limit
        const swipeLimit = 100;
        const dx = gestureState.dx;

        // Calculate opacity based on swipe distance for visual feedback
        const newOpacity = 1 - Math.abs(dx) / 300;
        opacityAnim.setValue(newOpacity > 0.5 ? newOpacity : 0.5);

        // Limit the swipe distance
        if (dx > 0 && dx <= swipeLimit) {
          slideAnim.setValue(dx); // Right swipe
        } else if (dx < 0 && dx >= -swipeLimit) {
          slideAnim.setValue(dx); // Left swipe
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        // Reset card scale
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          useNativeDriver: true,
        }).start();

        // Reset opacity
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();

        // Determine action based on swipe direction and distance
        const swipeThreshold = 50;

        if (gestureState.dx > swipeThreshold) {
          // Right swipe - Pin/Unpin
          handlePin();
          resetPosition();
        } else if (gestureState.dx < -swipeThreshold) {
          // Left swipe - Delete
          handleDelete();
          resetPosition();
        } else {
          // Reset position if swipe wasn't far enough
          resetPosition();
        }
      },
    })
  ).current;

  // Reset card position
  const resetPosition = () => {
    Animated.spring(slideAnim, {
      toValue: 0,
      friction: 5,
      useNativeDriver: true,
    }).start();
  };

  // Handle pin action
  const handlePin = () => {
    const newPinState = !isPinned;
    setIsPinned(newPinState);

    // Animated feedback
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.05,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    // Show feedback toast
    Alert.toast
      ? Alert.toast(`Note ${newPinState ? "pinned" : "unpinned"}`)
      : console.log(`Note ${newPinState ? "pinned" : "unpinned"}`);
  };

  // Handle delete action
  const handleDelete = () => {
    Alert.alert("Delete Note", "Are you sure you want to delete this note?", [
      {
        text: "Cancel",
        style: "cancel",
        onPress: resetPosition,
      },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          // Animate removal
          Animated.parallel([
            Animated.timing(scaleAnim, {
              toValue: 0.9,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            // Note would be deleted from state here
            console.log("Note deleted:", note.id);
          });
        },
      },
    ]);
  };

  const handlePress = () => {
    // Add subtle press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.98,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate to note detail view
      router.push(`/note/${note.id}`);
    });
  };

  // Format the date - today, yesterday, or actual date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          transform: [{ translateX: slideAnim }, { scale: scaleAnim }],
          opacity: opacityAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.card,
          {
            backgroundColor: theme.card.background,
            shadowColor: theme.card.shadow,
            borderColor: theme.border,
          },
        ]}
        onPress={handlePress}
        activeOpacity={0.7}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {note.title}
          </Text>
          {isPinned && (
            <Ionicons
              name="pin"
              size={16}
              color={theme.primary}
              style={styles.pinIcon}
            />
          )}
        </View>

        <Text
          style={[styles.summary, { color: theme.secondaryText }]}
          numberOfLines={3}
        >
          {note.content}
        </Text>

        <View style={styles.footer}>
          <Text style={[styles.date, { color: theme.tertiaryText }]}>
            {formatDate(note.updatedAt)}
          </Text>

          {note.tags && note.tags.length > 0 && (
            <View style={styles.tagContainer}>
              <Text
                style={[styles.tag, { color: theme.primary }]}
                numberOfLines={1}
              >
                {note.tags[0]}
                {note.tags.length > 1 ? ` +${note.tags.length - 1}` : ""}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
      <View style={styles.swipeHintContainer}>
        <Text style={[styles.swipeHint, { color: theme.tertiaryText }]}>
          Swipe right to pin, left to delete
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  pinIcon: {
    marginLeft: 8,
  },
  summary: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  date: {
    fontSize: 12,
  },
  tagContainer: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tag: {
    fontSize: 12,
    fontWeight: "500",
  },
  swipeHintContainer: {
    alignItems: "center",
    paddingVertical: 4,
  },
  swipeHint: {
    fontSize: 10,
    opacity: 0.6,
  },
});

export default NoteCard;
