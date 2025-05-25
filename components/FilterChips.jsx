import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Animated,
} from "react-native";
import { useTheme } from "../utils/themeContext";

/**
 * Filter Chips Component
 *
 * Displays horizontally scrollable filter chips for categories, tags, etc.
 * Includes animations for selection change
 */
const FilterChips = ({ filters, onFilterChange }) => {
  const { theme } = useTheme();
  const [selectedFilter, setSelectedFilter] = useState(filters[0]?.id || null);

  // Refs for storing animation values for each filter
  const animatedValues = useRef(
    filters.map(() => new Animated.Value(0))
  ).current;

  const handleFilterSelect = (filterId, index) => {
    // Only animate if selecting a different filter
    if (filterId !== selectedFilter) {
      // Find previous selected index
      const previousIndex = filters.findIndex(
        (filter) => filter.id === selectedFilter
      );

      // Animate deselection of previous filter
      if (previousIndex !== -1) {
        Animated.timing(animatedValues[previousIndex], {
          toValue: 0,
          duration: 200,
          useNativeDriver: false,
        }).start();
      }

      // Animate selection of new filter
      Animated.sequence([
        Animated.timing(animatedValues[index], {
          toValue: 0.5,
          duration: 100,
          useNativeDriver: false,
        }),
        Animated.spring(animatedValues[index], {
          toValue: 1,
          friction: 6,
          useNativeDriver: false,
        }),
      ]).start();

      setSelectedFilter(filterId);
      onFilterChange && onFilterChange(filterId);
    }
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      decelerationRate="fast"
      snapToAlignment="center"
    >
      {filters.map((filter, index) => {
        const isSelected = filter.id === selectedFilter;

        // Interpolate animation values for smooth transitions
        const backgroundColorAnim = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.chip.background, theme.chip.selected],
        });

        const textColorAnim = animatedValues[index].interpolate({
          inputRange: [0, 1],
          outputRange: [theme.chip.text, theme.chip.selectedText],
        });

        const scaleAnim = animatedValues[index].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [1, 1.05, 1],
        });

        // Set initial animated value based on selection state
        if (isSelected && animatedValues[index]._value === 0) {
          animatedValues[index].setValue(1);
        }

        return (
          <Animated.View
            key={filter.id}
            style={{
              transform: [{ scale: scaleAnim }],
            }}
          >
            <TouchableOpacity
              style={[
                styles.chip,
                {
                  backgroundColor: isSelected
                    ? theme.chip.selected
                    : theme.chip.background,
                  borderColor: isSelected ? theme.primary : theme.border,
                },
              ]}
              onPress={() => handleFilterSelect(filter.id, index)}
              activeOpacity={0.7}
            >
              <Animated.Text
                style={[
                  styles.chipText,
                  {
                    color: isSelected
                      ? theme.chip.selectedText
                      : theme.chip.text,
                  },
                ]}
              >
                {filter.name}
              </Animated.Text>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 8,
    height: 60,
  },
  chip: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 16,
    marginRight: 8,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
  },
});

export default FilterChips;
