import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import { fetchPendingInvites } from "../services/collaborationService";

/**
 * Custom hook to manage pending invitations count
 * Returns the count of pending invitations for the current user
 */
export const usePendingInvites = () => {
  const { user } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadPendingCount = useCallback(async () => {
    if (!user?.email) {
      setPendingCount(0);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await fetchPendingInvites(user.email);
      if (!error && data) {
        setPendingCount(data.length);
      } else {
        setPendingCount(0);
      }
    } catch (err) {
      console.error("Error fetching pending invites count:", err);
      setPendingCount(0);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // Refresh function to be called when invites are accepted/declined
  const refreshPendingCount = useCallback(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  return {
    pendingCount,
    loading,
    refreshPendingCount,
  };
};
