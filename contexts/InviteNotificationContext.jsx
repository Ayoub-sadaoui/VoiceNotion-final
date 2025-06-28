import React, { createContext, useContext, useCallback } from "react";
import { usePendingInvites } from "../hooks/usePendingInvites";

/**
 * Context for managing invitation notifications across the app
 */
const InviteNotificationContext = createContext({
  pendingCount: 0,
  loading: false,
  refreshPendingCount: () => {},
});

export const useInviteNotifications = () => {
  const context = useContext(InviteNotificationContext);
  if (!context) {
    throw new Error(
      "useInviteNotifications must be used within an InviteNotificationProvider"
    );
  }
  return context;
};

export const InviteNotificationProvider = ({ children }) => {
  const { pendingCount, loading, refreshPendingCount } = usePendingInvites();

  const value = {
    pendingCount,
    loading,
    refreshPendingCount,
  };

  return (
    <InviteNotificationContext.Provider value={value}>
      {children}
    </InviteNotificationContext.Provider>
  );
};
