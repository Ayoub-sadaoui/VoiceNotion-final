import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../contexts/AuthContext";
import {
  signIn,
  signUp,
  signOut,
  resetPassword,
  getCurrentUser,
} from "../services/supabaseService";
import {
  fetchNotesFromSupabase,
  syncPendingNotesWithSupabase,
} from "../services/noteService";

/**
 * Hook for managing Supabase authentication and related operations
 */
export default function useSupabaseAuth() {
  const { user, isAuthenticated, loading } = useAuth();
  const [authLoading, setAuthLoading] = useState(false);
  const [syncLoading, setSyncLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Clear any success/error messages
  const clearMessages = useCallback(() => {
    setError(null);
    setSuccess(null);
  }, []);

  // Handle login
  const handleLogin = useCallback(
    async (email, password) => {
      try {
        setAuthLoading(true);
        clearMessages();

        const { data, error: signInError } = await signIn(email, password);

        if (signInError) {
          setError(signInError.message);
          return { success: false, error: signInError };
        }

        setSuccess("Login successful");
        return { success: true, data };
      } catch (err) {
        setError("An unexpected error occurred");
        return { success: false, error: err };
      } finally {
        setAuthLoading(false);
      }
    },
    [clearMessages]
  );

  // Handle signup
  const handleSignup = useCallback(
    async (email, password) => {
      try {
        setAuthLoading(true);
        clearMessages();

        const { data, error: signUpError } = await signUp(email, password);

        if (signUpError) {
          setError(signUpError.message);
          return { success: false, error: signUpError };
        }

        setSuccess(
          "Signup successful. Please check your email to confirm your account."
        );
        return { success: true, data };
      } catch (err) {
        setError("An unexpected error occurred");
        return { success: false, error: err };
      } finally {
        setAuthLoading(false);
      }
    },
    [clearMessages]
  );

  // Handle logout
  const handleLogout = useCallback(async () => {
    try {
      setAuthLoading(true);
      clearMessages();

      // Sync any pending notes before logout
      if (user) {
        await syncPendingNotesWithSupabase(user.id);
      }

      // Perform logout
      const { error } = await signOut();

      if (error) {
        setError(error.message);
        return { success: false, error };
      }

      setSuccess("Logout successful");
      return { success: true };
    } catch (err) {
      setError("An unexpected error occurred");
      return { success: false, error: err };
    } finally {
      setAuthLoading(false);
    }
  }, [user, clearMessages]);

  // Handle password reset
  const handleResetPassword = useCallback(
    async (email) => {
      try {
        setAuthLoading(true);
        clearMessages();

        const { error } = await resetPassword(email);

        if (error) {
          setError(error.message);
          return { success: false, error };
        }

        setSuccess("Password reset instructions sent to your email");
        return { success: true };
      } catch (err) {
        setError("An unexpected error occurred");
        return { success: false, error: err };
      } finally {
        setAuthLoading(false);
      }
    },
    [clearMessages]
  );

  // Sync notes with Supabase
  const syncNotes = useCallback(async () => {
    if (!user) {
      setError("User not authenticated");
      return { success: false, error: "User not authenticated" };
    }

    try {
      setSyncLoading(true);
      clearMessages();

      // Sync pending notes
      const result = await syncPendingNotesWithSupabase(user.id);

      if (!result.success) {
        setError(result.error);
        return result;
      }

      setSuccess(`Sync complete. ${result.synced || 0} notes synchronized.`);
      return result;
    } catch (err) {
      setError("An unexpected error occurred during sync");
      return { success: false, error: err };
    } finally {
      setSyncLoading(false);
    }
  }, [user, clearMessages]);

  // Fetch notes from Supabase
  const fetchNotes = useCallback(async () => {
    if (!user) {
      setError("User not authenticated");
      return { success: false, error: "User not authenticated" };
    }

    try {
      setSyncLoading(true);
      clearMessages();

      // Fetch notes from Supabase
      const result = await fetchNotesFromSupabase(user.id);

      if (!result.success) {
        setError(result.error);
        return result;
      }

      setSuccess("Notes fetched successfully");
      return result;
    } catch (err) {
      setError("An unexpected error occurred while fetching notes");
      return { success: false, error: err };
    } finally {
      setSyncLoading(false);
    }
  }, [user, clearMessages]);

  return {
    user,
    isAuthenticated,
    loading: loading || authLoading,
    syncLoading,
    error,
    success,
    clearMessages,
    login: handleLogin,
    signup: handleSignup,
    logout: handleLogout,
    resetPassword: handleResetPassword,
    syncNotes,
    fetchNotes,
  };
}
