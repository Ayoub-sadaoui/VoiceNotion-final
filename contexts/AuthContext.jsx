import React, {
  createContext,
  useState,
  useEffect,
  useContext,
  useRef,
} from "react";
import {
  supabase,
  getCurrentUser,
  getSession,
} from "../services/supabaseService";
import { View, Text, TouchableOpacity } from "react-native";

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

// Global flag to prevent multiple initializations
let isInitializing = false;
let initializationPromise = null;

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    // Single initialization function
    const initializeAuth = async () => {
      // Prevent multiple initializations
      if (isInitializing && initializationPromise) {
        console.log("🔑 AuthContext: Already initializing, waiting...");
        await initializationPromise;
        return;
      }

      isInitializing = true;
      console.log("🔑 AuthContext: Starting initialization...");

      initializationPromise = (async () => {
        try {
          // Simple, direct calls without complex timeout logic
          const currentSession = await getSession();

          if (!mounted.current) return;

          console.log("🔑 AuthContext: Got session:", !!currentSession);
          setSession(currentSession);

          if (currentSession) {
            console.log("🔑 AuthContext: Session found, getting user...");
            const currentUser = await getCurrentUser();

            if (!mounted.current) return;

            console.log("🔑 AuthContext: Got user:", !!currentUser);
            setUser(currentUser);
          } else {
            console.log("🔑 AuthContext: No session found");
          }
        } catch (error) {
          console.error("❌ AuthContext: Error initializing auth:", error);
        } finally {
          if (mounted.current) {
            console.log(
              "🔑 AuthContext: Initialization complete, setting loading to false"
            );
            setLoading(false);
          }
          isInitializing = false;
          initializationPromise = null;
        }
      })();

      await initializationPromise;
    };

    // Start initialization
    initializeAuth();

    // Set up auth subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return;

      console.log("🔑 AuthContext: Auth state changed:", event, !!newSession);

      try {
        setSession(newSession);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          console.log("🔑 AuthContext: Getting user for event:", event);
          const newUser = await getCurrentUser();
          if (mounted.current) {
            console.log("🔑 AuthContext: Set user:", !!newUser);
            setUser(newUser);
          }
        } else if (event === "SIGNED_OUT") {
          if (mounted.current) {
            console.log("🔑 AuthContext: User signed out");
            setUser(null);
          }
        }
      } catch (error) {
        console.error("❌ AuthContext: Error in auth state change:", error);
      }
    });

    // Cleanup
    return () => {
      mounted.current = false;
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  // Emergency timeout - separate from initialization logic
  useEffect(() => {
    const emergencyTimeout = setTimeout(() => {
      if (loading && mounted.current) {
        console.warn(
          "🚨 AuthContext: Emergency timeout - forcing loading to false after 8 seconds"
        );
        setLoading(false);
      }
    }, 8000);

    return () => clearTimeout(emergencyTimeout);
  }, [loading]);

  const value = {
    user,
    session,
    isAuthenticated: !!user,
    loading,
    setUser,
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f5f5f5",
        }}
      >
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Loading...</Text>
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Initializing authentication...
        </Text>
        <TouchableOpacity
          style={{
            backgroundColor: "#007AFF",
            paddingHorizontal: 20,
            paddingVertical: 10,
            borderRadius: 8,
          }}
          onPress={() => {
            console.log("🚨 User manually skipped loading");
            setLoading(false);
          }}
        >
          <Text style={{ color: "white", fontSize: 16 }}>Skip Loading</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
