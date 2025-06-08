"use dom";

import React from "react";

/**
 * A reusable confirmation dialog component
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
  confirmButtonStyle = {
    padding: "8px 16px",
    border: "none",
    borderRadius: "4px",
    background: "#ff4d4f",
    color: "white",
    cursor: "pointer",
  },
  onConfirm,
  onCancel,
}) => {
  if (!show) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 2000,
      }}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: "20px",
          borderRadius: "8px",
          maxWidth: "300px",
          width: "80%",
        }}
      >
        <h3 style={{ margin: "0 0 15px 0" }}>{title}</h3>
        <p style={{ margin: "0 0 20px 0" }}>{message}</p>
        <div
          style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}
        >
          <button
            onClick={onCancel}
            style={{
              padding: "8px 16px",
              border: "1px solid #ddd",
              borderRadius: "4px",
              background: "#f5f5f5",
              cursor: "pointer",
            }}
          >
            {cancelText}
          </button>
          <button onClick={onConfirm} style={confirmButtonStyle}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
