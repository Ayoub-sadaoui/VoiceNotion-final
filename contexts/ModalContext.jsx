import React, { createContext, useState, useContext } from "react";
import { View, StyleSheet } from "react-native";

// Create the context
const ModalContext = createContext({
  showModal: () => {},
  hideModal: () => {},
});

/**
 * Provider component for the modal context
 * This will render modals at the top level of the app
 */
export const ModalProvider = ({ children }) => {
  const [modalContent, setModalContent] = useState(null);

  // Function to show a modal with the given content
  const showModal = (content) => {
    setModalContent(content);
  };

  // Function to hide the current modal
  const hideModal = () => {
    setModalContent(null);
  };

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      {modalContent && (
        <View style={StyleSheet.absoluteFill}>{modalContent}</View>
      )}
    </ModalContext.Provider>
  );
};

// Custom hook to use the modal context
export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within a ModalProvider");
  }
  return context;
};

// Add the modal service functions to the global object for easier access
if (global) {
  global.showModal = (content) => {
    // This will be replaced with the actual showModal function when the context is initialized
    console.warn("Modal service not yet initialized");
  };

  global.hideModal = () => {
    // This will be replaced with the actual hideModal function when the context is initialized
    console.warn("Modal service not yet initialized");
  };
}

export default ModalContext;
