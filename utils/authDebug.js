/**
 * Authentication debugging utility.
 * Use this to diagnose and fix auth-related issues.
 */

import { supabase } from "../services/supabaseService";

/**
 * Comprehensive authentication check that tests multiple methods of verifying user authentication.
 * Returns detailed debug information about the current auth state.
 */
export const checkAuthStatus = async () => {
  try {
    // Method 1: Session check
    const sessionResponse = await supabase.auth.getSession();
    const session = sessionResponse?.data?.session;
    const sessionUserId = session?.user?.id;

    // Method 2: Direct user check
    const userResponse = await supabase.auth.getUser();
    const user = userResponse?.data?.user;
    const userId = user?.id;

    // Method 3: Test a protected RLS query
    let rlsTestResult = null;
    let rlsError = null;

    try {
      // Try to select from a table that should have RLS enabled
      // Just fetch one record to check if we have the RLS permissions
      const { data, error } = await supabase
        .from("notes") // assuming 'notes' is an RLS-protected table
        .select("id")
        .limit(1);

      rlsTestResult = {
        success: !error,
        hasData: data && data.length > 0,
        error: error ? error.message : null,
      };
    } catch (err) {
      rlsError = err.message;
    }

    // Determine the overall auth state
    const isAuthenticated = !!userId && !!session;

    // Return comprehensive debug information
    return {
      isAuthenticated,
      session: {
        exists: !!session,
        userId: sessionUserId || null,
        expiresAt: session?.expires_at || null,
        tokenDetails: session
          ? {
              hasAccessToken: !!session.access_token,
              hasRefreshToken: !!session.refresh_token,
              accessTokenLength: session.access_token?.length || 0,
              refreshTokenLength: session.refresh_token?.length || 0,
            }
          : null,
      },
      user: {
        exists: !!user,
        id: userId || null,
        email: user?.email || null,
        emailConfirmed: user?.email_confirmed_at ? true : false,
        lastSignIn: user?.last_sign_in_at || null,
      },
      rlsTest: {
        success: rlsTestResult?.success || false,
        hasData: rlsTestResult?.hasData || false,
        error: rlsTestResult?.error || rlsError,
      },
    };
  } catch (error) {
    return {
      error: error.message,
      isAuthenticated: false,
    };
  }
};

/**
 * Use this function to verify that file paths match your RLS policies
 * @param {string} userId - The user's ID
 * @param {string} filePath - The file path to test
 * @returns {boolean} - Whether the path matches the pattern expected by RLS
 */
export const validateStorageRLSPath = (userId, filePath) => {
  if (!userId || !filePath) return false;

  // Check if the file path starts with the user ID as expected by the RLS policy
  const pathStartsWithUserId = filePath.startsWith(`${userId}/`);

  // Check if the path matches the expected RLS pattern from split_part check
  const firstPathSegment = filePath.split("/")[0];
  const matchesRlsCheck = firstPathSegment === userId;

  return {
    valid: pathStartsWithUserId && matchesRlsCheck,
    pathStartsWithUserId,
    matchesRlsCheck,
    firstPathSegment,
    expectedPrefix: `${userId}/`,
  };
};
