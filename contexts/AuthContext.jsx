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

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;

    const initializeAuth = async () => {
      try {
        console.log("🔑 AuthContext: Starting auth initialization...");

        // Get current session immediately
        const {
          data: { session: currentSession },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          console.error("❌ AuthContext: Session error:", sessionError);
        }

        if (!mounted.current) return;

        console.log("🔑 AuthContext: Current session:", !!currentSession);
        setSession(currentSession);

        // If we have a session, get the user
        if (currentSession?.user) {
          console.log("🔑 AuthContext: Setting user from session");
          setUser(currentSession.user);
        }

        // Mark as initialized and stop loading
        setInitialized(true);
        setLoading(false);
        console.log("🔑 AuthContext: Initialization complete");
      } catch (error) {
        console.error("❌ AuthContext: Initialization error:", error);
        if (mounted.current) {
          setInitialized(true);
          setLoading(false);
        }
      }
    };

    // Initialize auth
    initializeAuth();

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted.current) return;

      console.log("🔑 AuthContext: Auth state change:", event, !!newSession);

      setSession(newSession);

      if (event === "SIGNED_IN" && newSession?.user) {
        console.log("🔑 AuthContext: User signed in");
        setUser(newSession.user);
      } else if (event === "SIGNED_OUT") {
        console.log("🔑 AuthContext: User signed out");
        setUser(null);
      } else if (event === "TOKEN_REFRESHED" && newSession?.user) {
        console.log("🔑 AuthContext: Token refreshed");
        setUser(newSession.user);
      }
    });

    // Cleanup
    return () => {
      mounted.current = false;
      subscription?.unsubscribe();
    };
  }, []);

  // Fallback timeout - shorter and more reasonable
  useEffect(() => {
    if (!initialized) {
      const timeout = setTimeout(() => {
        if (!initialized && mounted.current) {
          console.warn("🚨 AuthContext: Timeout reached, stopping loading");
          setLoading(false);
          setInitialized(true);
        }
      }, 3000); // Reduced to 3 seconds

      return () => clearTimeout(timeout);
    }
  }, [initialized]);

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
        <Text style={{ fontSize: 18, marginBottom: 20 }}>sayNote</Text>
        <Text
          style={{
            fontSize: 14,
            color: "#666",
            textAlign: "center",
            marginBottom: 20,
          }}
        >
          Loading...
        </Text>
        {/* Simplified skip button that appears after 2 seconds */}
        {initialized === false && (
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
              setInitialized(true);
            }}
          >
            <Text style={{ color: "white", fontSize: 16 }}>Continue</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
