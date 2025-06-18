"use dom";

import React, { useState, useEffect } from "react";

/**
 * A reusable confirmation dialog component with modern styling
 * @param {Object} props - Component props
 * @param {boolean} props.show - Whether to show the dialog
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {string} props.confirmText - Text for confirmation button
 * @param {string} props.cancelText - Text for cancel button
 * @param {Function} props.onConfirm - Callback when confirm button is clicked
 * @param {Function} props.onCancel - Callback when cancel button is clicked
 */
const ConfirmDialog = ({
  show,
  title = "Confirm",
  message = "Are you sure?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmButtonStyle = {},
  onConfirm,
  onCancel,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Handle animation timing when show prop changes
  useEffect(() => {
    if (show) {
      setIsAnimating(true);
      setTimeout(() => {
        setIsVisible(true);
      }, 10);
    } else {
      setIsVisible(false);
      setTimeout(() => {
        setIsAnimating(false);
      }, 300);
    }
  }, [show]);

  if (!show && !isAnimating) return null;

  // Determine if we should use dark theme based on system preference
  const prefersDarkMode =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Theme colors
  const theme = prefersDarkMode
    ? {
        background: "#121212",
        surface: "#1E1E1E",
        text: "#FFFFFF",
        secondaryText: "#CCCCCC",
        primary: "#0A84FF",
        error: "#FF453A",
        border: "#333333",
        cardBackground: "#1E1E1E",
        shadow: "rgba(0, 0, 0, 0.3)",
        overlay: "rgba(0, 0, 0, 0.7)",
      }
    : {
        background: "#FFFFFF",
        surface: "#F2F2F7",
        text: "#333333",
        secondaryText: "#666666",
        primary: "#007AFF",
        error: "#FF3B30",
        border: "#EEEEEE",
        cardBackground: "#FFFFFF",
        shadow: "rgba(0, 0, 0, 0.1)",
        overlay: "rgba(0, 0, 0, 0.5)",
      };

  // Merged confirm button style
  const mergedConfirmButtonStyle = {
    padding: "12px 20px",
    border: "none",
    borderRadius: "8px",
    background: theme.error,
    color: "white",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "15px",
    transition: "all 0.2s ease",
    ...confirmButtonStyle,
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: theme.overlay,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
        opacity: isVisible ? 1 : 0,
        transition: "opacity 0.3s ease",
        backdropFilter: "blur(5px)",
      }}
      onClick={(e) => {
        // Close when clicking outside the dialog
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }}
    >
      <div
        style={{
          backgroundColor: theme.cardBackground,
          padding: "24px",
          borderRadius: "16px",
          maxWidth: "320px",
          width: "85%",
          boxShadow: `0 10px 25px ${theme.shadow}`,
          transform: isVisible ? "scale(1)" : "scale(0.9)",
          transition: "transform 0.3s ease",
          border: prefersDarkMode ? `1px solid ${theme.border}` : "none",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px 0",
            color: theme.text,
            fontSize: "20px",
            fontWeight: "600",
            lineHeight: "1.3",
          }}
        >
          {title}
        </h3>

        <p
          style={{
            margin: "0 0 24px 0",
            color: theme.secondaryText,
            fontSize: "16px",
            lineHeight: "1.5",
          }}
        >
          {message}
        </p>

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: "12px",
            marginTop: "8px",
          }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "12px 20px",
              border: `1px solid ${theme.border}`,
              borderRadius: "8px",
              background: "transparent",
              color: theme.text,
              cursor: "pointer",
              fontSize: "15px",
              fontWeight: "500",
              transition: "all 0.2s ease",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = prefersDarkMode
                ? "#2A2A2A"
                : "#F5F5F5";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            {cancelText}
          </button>

          <button
            onClick={onConfirm}
            style={mergedConfirmButtonStyle}
            onMouseOver={(e) => {
              e.currentTarget.style.opacity = "0.9";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.opacity = "1";
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
