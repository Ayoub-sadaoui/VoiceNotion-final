import React, { createContext, useState, useEffect, useContext } from "react";
import {
  supabase,
  getCurrentUser,
  getSession,
} from "../services/supabaseService";
import { View, Text } from "react-native";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize auth state
    const initializeAuth = async () => {
      try {
        const currentSession = await getSession();
        setSession(currentSession);

        if (currentSession) {
          const currentUser = await getCurrentUser();
          setUser(currentUser);
        }
      } catch (error) {
        console.error("Error initializing auth:", error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Set up auth subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);

      if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
        const newUser = await getCurrentUser();
        setUser(newUser);
      } else if (event === "SIGNED_OUT") {
        setUser(null);
      }
    });

    // Clean up subscription
    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    loading,
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
