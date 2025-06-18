"use dom";

import React, { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../utils/themeContext";
import "./toast.css";

const CustomToast = ({
  visible,
  message,
  type = "info",
  title,
  duration = 3000,
  onHide,
  showProgress = false,
}) => {
  const { isDark } = useTheme();
  const progressRef = useRef(null);
  const containerRef = useRef(null);
  const timeoutRef = useRef(null);
  const [iconsLoaded, setIconsLoaded] = useState(false);

  // Check if Ionicons are loaded
  useEffect(() => {
    // Simple check to see if icons are available
    const checkIcons = () => {
      try {
        const testIcon = document.createElement("span");
        testIcon.className = "ionicon";
        const hasIcons = window
          .getComputedStyle(testIcon)
          .fontFamily.includes("Ionicons");
        setIconsLoaded(hasIcons);
      } catch (error) {
        console.error("Error checking icon font:", error);
        setIconsLoaded(false);
      }
    };

    // Try to check icons immediately
    checkIcons();

    // Also check after a delay to ensure fonts have loaded
    const timer = setTimeout(checkIcons, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Define toast icon based on type
  const getToastIcon = () => {
    switch (type) {
      case "success":
        return "checkmark-circle";
      case "error":
        return "close-circle";
      case "warning":
        return "warning";
      case "recording":
        return "mic";
      case "processing":
        return "sync";
      default:
        return "information-circle";
    }
  };

  // Define toast icon color based on type
  const getToastIconColor = () => {
    switch (type) {
      case "success":
        return "#4CAF50";
      case "error":
        return "#F44336";
      case "warning":
        return "#FFC107";
      case "recording":
        return "#E91E63";
      case "processing":
        return "#2196F3";
      default:
        return "#2196F3";
    }
  };

  // Handle progress bar animation
  useEffect(() => {
    if (visible && showProgress && progressRef.current && duration > 0) {
      progressRef.current.style.width = "0%";
      progressRef.current.style.transition = `width ${duration}ms linear`;

      // Force reflow to ensure the animation starts from 0%
      void progressRef.current.offsetWidth;

      // Start animation
      progressRef.current.style.width = "100%";
    }
  }, [visible, showProgress, duration]);

  // Handle visibility and auto-hide
  useEffect(() => {
    if (visible) {
      if (containerRef.current) {
        containerRef.current.classList.remove(
          "toast-exit",
          "toast-exit-active"
        );
        containerRef.current.classList.add("toast-enter");

        // Force reflow
        void containerRef.current.offsetWidth;

        containerRef.current.classList.add("toast-enter-active");
      }

      if (duration > 0) {
        timeoutRef.current = setTimeout(() => {
          hideToast();
        }, duration);
      }
    } else {
      hideToast();
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [visible, duration]);

  const hideToast = () => {
    if (containerRef.current) {
      containerRef.current.classList.remove(
        "toast-enter",
        "toast-enter-active"
      );
      containerRef.current.classList.add("toast-exit");

      // Force reflow
      void containerRef.current.offsetWidth;

      containerRef.current.classList.add("toast-exit-active");

      setTimeout(() => {
        if (onHide) onHide();
      }, 300);
    } else {
      if (onHide) onHide();
    }
  };

  // Render icon with fallback
  const renderIcon = () => {
    if (!iconsLoaded) {
      // Render a colored circle as fallback
      return (
        <div
          className="toast-icon-fallback"
          style={{ backgroundColor: getToastIconColor() }}
        />
      );
    }

    return (
      <Ionicons name={getToastIcon()} size={16} color={getToastIconColor()} />
    );
  };

  // Render close icon with fallback
  const renderCloseIcon = () => {
    if (!iconsLoaded) {
      // Render a simple X as fallback
      return <div className="toast-close-fallback">×</div>;
    }

    return <Ionicons name="close" size={14} color="#888888" />;
  };

  if (!visible) return null;

  const themeClass = isDark ? "theme-dark" : "theme-light";
  const isPulseAnimation = type === "recording" || type === "processing";

  return (
    <div ref={containerRef} className={`toast-container ${themeClass}`}>
      <div className={`toast-content-wrapper toast-${type}`}>
        <div className="toast-content">
          <div className={`toast-icon ${isPulseAnimation ? "pulse-icon" : ""}`}>
            {renderIcon()}
          </div>

          {message && <div className="toast-message">{message}</div>}

          <div className="toast-close" onClick={hideToast}>
            {renderCloseIcon()}
          </div>
        </div>

        {showProgress && (
          <div
            ref={progressRef}
            className="toast-progress"
            style={{ backgroundColor: getToastIconColor() }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomToast;
