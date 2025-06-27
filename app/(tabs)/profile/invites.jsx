import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../../utils/themeContext";
import { useAuth } from "../../../contexts/AuthContext";
import ScreenHeader from "../../../components/ScreenHeader";
import {
  fetchPendingInvites,
  acceptInvite,
} from "../../../services/collaborationService";
import { useRouter } from "expo-router";

export default function InvitesScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInvites = useCallback(async () => {
    if (!user?.email) return;
    try {
      setLoading(true);
      const { data, error } = await fetchPendingInvites(user.email);
      if (!error && data) setInvites(data);
    } catch (err) {
      console.error("Error fetching invites", err);
    } finally {
      setLoading(false);
    }
  }, [user?.email]);

  useEffect(() => {
    loadInvites();
  }, [loadInvites]);

  const handleAccept = async (inviteId) => {
    try {
      const { error } = await acceptInvite(inviteId);
      if (error) throw error;
      setInvites((prev) => prev.filter((inv) => inv.id !== inviteId));
      Alert.alert(
        "Invitation Accepted",
        "You now have access to this page! You can find it in the Shared Pages section on the home screen.",
        [{ text: "OK" }]
      );
    } catch (err) {
      Alert.alert("Error", "Failed to accept invite");
      console.error(err);
    }
  };

  const renderItem = ({ item }) => (
    <View style={[styles.inviteRow, { borderBottomColor: theme.border }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: theme.text, fontWeight: "500" }}>
          {item.page_title || `Page: ${item.page_id.substring(0, 8)}...`}
        </Text>
        <Text style={{ color: theme.secondaryText, fontSize: 12 }}>
          From:{" "}
          {item.inviter_name ||
            item.inviter_email ||
            item.inviter_id?.substring(0, 8) ||
            "Unknown"}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.acceptButton, { backgroundColor: theme.primary }]}
        onPress={() => handleAccept(item.id)}
      >
        <Text style={{ color: "white", fontWeight: "600" }}>Accept</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScreenHeader title="Invitations" onBack={() => router.back()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={theme.primary} />
      ) : invites.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="mail-open-outline" size={64} color={theme.icon} />
          <Text style={{ color: theme.secondaryText, marginTop: 12 }}>
            No pending invitations
          </Text>
        </View>
      ) : (
        <FlatList
          data={invites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inviteRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  acceptButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
