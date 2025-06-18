import React, { useState, useRef, useEffect } from "react";
import { View, StyleSheet, Platform, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import CustomToast from "./CustomToast";

// Create a global reference to access toast methods from outside React components
let toastRef = {
  show: () => {},
  hide: () => {},
  update: () => {},
};

// Helper function to truncate messages to a reasonable length
const truncateMessage = (message, maxLength = 24) => {
  if (!message) return "";
  return message.length > maxLength
    ? message.substring(0, maxLength) + "..."
    : message;
};

export const showToast = (options) => {
  // Truncate message if provided
  if (options.message) {
    options.message = truncateMessage(options.message);
  }
  toastRef.show(options);
};

export const hideToast = () => {
  toastRef.hide();
};

export const updateToast = (options) => {
  // Truncate message if provided
  if (options.message) {
    options.message = truncateMessage(options.message);
  }
  toastRef.update(options);
};

// Predefined toast shortcuts for common notifications
export const showSuccessToast = (message) => {
  showToast({
    type: "success",
    message: truncateMessage(message),
    duration: 4000,
  });
};

export const showErrorToast = (message) => {
  showToast({
    type: "error",
    message: truncateMessage(message),
    duration: 5000,
  });
};

export const showRecordingToast = () => {
  showToast({
    type: "recording",
    message: "Recording...",
    duration: 0, // Stay until manually dismissed
  });
};

export const showProcessingToast = () => {
  showToast({
    type: "processing",
    message: "Processing...",
    duration: 0, // Stay until manually dismissed
  });
};

const ToastManager = () => {
  const [visible, setVisible] = useState(false);
  const [toastProps, setToastProps] = useState({
    type: "info",
    title: "",
    message: "",
    duration: 5000,
    showProgress: false,
  });

  const insets = useSafeAreaInsets();
  const timeoutRef = useRef(null);

  useEffect(() => {
    // Assign the methods to our global reference
    toastRef = {
      show: show,
      hide: hide,
      update: update,
    };

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const show = (options) => {
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // If toast is already visible, hide it first with a short animation
    if (visible) {
      setVisible(false);

      // Small delay to allow hide animation to finish
      setTimeout(() => {
        setToastProps({
          ...toastProps,
          ...options,
          message: options.message ? truncateMessage(options.message) : "",
        });
        setVisible(true);
      }, 300);
    } else {
      // Set new props and show toast
      setToastProps({
        ...toastProps,
        ...options,
        message: options.message ? truncateMessage(options.message) : "",
      });
      setVisible(true);
    }

    // Auto-hide if duration is provided and greater than 0
    const duration =
      options.duration !== undefined ? options.duration : toastProps.duration;
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        hide();
      }, duration);
    }
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setVisible(false);
  };

  const update = (options) => {
    setToastProps({
      ...toastProps,
      ...options,
      message: options.message
        ? truncateMessage(options.message)
        : toastProps.message,
    });

    // Reset timeout if duration is provided
    if (options.duration !== undefined && options.duration > 0) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        hide();
      }, options.duration);
    }
  };

  // Calculate top position based on safe area insets
  const topPosition =
    Platform.OS === "ios" ? insets.top + 10 : StatusBar.currentHeight + 10;

  return (
    <View
      style={[styles.container, { paddingTop: topPosition }]}
      pointerEvents="box-none"
    >
      <CustomToast
        visible={visible}
        onHide={() => setVisible(false)}
        {...toastProps}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    elevation: 10000,
    alignItems: "center",
    pointerEvents: "box-none",
  },
});

export default ToastManager;
