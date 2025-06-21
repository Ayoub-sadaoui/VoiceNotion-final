import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../utils/themeContext";
import { useAuth } from "../../contexts/AuthContext";
import { syncPendingNotesWithSupabase } from "../../services/noteService";

export default function BackupScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { user } = useAuth();

  const [autoSync, setAutoSync] = useState(true);
  const [syncOnWifi, setSyncOnWifi] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [syncStats, setSyncStats] = useState({
    total: 0,
    synced: 0,
    pending: 0,
  });

  // Load sync settings and status on mount
  useEffect(() => {
    // In a real app, these would be loaded from AsyncStorage or similar
    // For demo purposes, we'll just set some example data
    setLastSync(new Date(Date.now() - 24 * 60 * 60 * 1000)); // 1 day ago
    setSyncStats({
      total: 42,
      synced: 39,
      pending: 3,
    });
  }, []);

  // Handle manual sync
  const handleSync = async () => {
    if (!user) {
      Alert.alert(
        "Authentication Required",
        "Please sign in to sync your notes",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSyncing(true);

    try {
      // Perform the actual sync
      await syncPendingNotesWithSupabase(user.id);

      // Update sync stats
      setSyncStats((prev) => ({
        ...prev,
        synced: prev.total,
        pending: 0,
      }));

      // Update last sync time
      setLastSync(new Date());

      Alert.alert(
        "Sync Complete",
        "All notes have been successfully synced to the cloud.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert(
        "Sync Failed",
        "There was a problem syncing your notes. Please try again later.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSyncing(false);
    }
  };

  // Format the last sync date
  const formatSyncDate = (date) => {
    if (!date) return "Never";

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays === 1) return "Yesterday";
    return date.toLocaleDateString();
  };

  // Handle export data
  const handleExportData = () => {
    Alert.alert(
      "Export Data",
      "This will export all your notes as a JSON file. This feature is coming soon.",
      [{ text: "OK" }]
    );
  };

  // Handle clear local data
  const handleClearLocalData = () => {
    Alert.alert(
      "Clear Local Data",
      "This will delete all locally stored notes. Your cloud backup will not be affected. Are you sure?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear Data",
          style: "destructive",
          onPress: () => {
            // In a real app, this would clear local storage
            Alert.alert("Data Cleared", "All local data has been cleared.");
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      <Stack.Screen
        options={{
          title: "Backup & Sync",
          headerShown: true,
        }}
      />

      <ScrollView style={styles.content}>
        {/* Sync status section */}
        <View style={[styles.section, { backgroundColor: theme.surface }]}>
          <View style={styles.syncStatusHeader}>
            <View style={styles.syncStatusInfo}>
              <Text style={[styles.syncStatusTitle, { color: theme.text }]}>
                Sync Status
              </Text>
              <Text
                style={[
                  styles.syncStatusSubtitle,
                  { color: theme.secondaryText },
                ]}
              >
                Last sync: {formatSyncDate(lastSync)}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.syncButton,
                { backgroundColor: theme.primary },
                isSyncing && { opacity: 0.7 },
              ]}
              onPress={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <>
                  <Ionicons name="sync" size={16} color="#FFFFFF" />
                  <Text style={styles.syncButtonText}>Sync Now</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {syncStats.total}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Total Notes
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text style={[styles.statValue, { color: theme.text }]}>
                {syncStats.synced}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Synced
              </Text>
            </View>

            <View style={styles.statItem}>
              <Text
                style={[
                  styles.statValue,
                  { color: syncStats.pending > 0 ? theme.error : theme.text },
                ]}
              >
                {syncStats.pending}
              </Text>
              <Text style={[styles.statLabel, { color: theme.secondaryText }]}>
                Pending
              </Text>
            </View>
          </View>
        </View>

        {/* Sync settings section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Sync Settings
          </Text>

          <View style={styles.settingItem}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Auto-Sync
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Automatically sync notes when changes are made
              </Text>
            </View>
            <Switch
              value={autoSync}
              onValueChange={setAutoSync}
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={autoSync ? "#ffffff" : "#f4f3f4"}
            />
          </View>

          <View style={[styles.settingItem, { borderTopColor: theme.border }]}>
            <View style={styles.settingInfo}>
              <Text style={[styles.settingTitle, { color: theme.text }]}>
                Sync on Wi-Fi Only
              </Text>
              <Text
                style={[
                  styles.settingDescription,
                  { color: theme.secondaryText },
                ]}
              >
                Only sync when connected to Wi-Fi
              </Text>
            </View>
            <Switch
              value={syncOnWifi}
              onValueChange={setSyncOnWifi}
              trackColor={{ false: "#767577", true: theme.primary }}
              thumbColor={syncOnWifi ? "#ffffff" : "#f4f3f4"}
              disabled={!autoSync}
            />
          </View>
        </View>

        {/* Data management section */}
        <View style={[styles.section, { borderTopColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Data Management
          </Text>

          <TouchableOpacity
            style={styles.dataButton}
            onPress={handleExportData}
          >
            <View style={styles.dataButtonContent}>
              <Ionicons
                name="download-outline"
                size={22}
                color={theme.primary}
              />
              <Text style={[styles.dataButtonText, { color: theme.text }]}>
                Export All Data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.dataButton, { borderTopColor: theme.border }]}
            onPress={handleClearLocalData}
          >
            <View style={styles.dataButtonContent}>
              <Ionicons name="trash-outline" size={22} color={theme.error} />
              <Text style={[styles.dataButtonText, { color: theme.error }]}>
                Clear Local Data
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={theme.icon} />
          </TouchableOpacity>
        </View>

        {/* Info section */}
        <View
          style={[
            styles.section,
            { borderTopColor: theme.border, marginBottom: 40 },
          ]}
        >
          <Text style={[styles.infoText, { color: theme.secondaryText }]}>
            sayNote automatically backs up your notes to the cloud when you're
            signed in. Your notes are encrypted and can only be accessed with
            your account.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
    marginBottom: 16,
    borderTopWidth: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  syncStatusHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  syncStatusInfo: {
    flex: 1,
  },
  syncStatusTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  syncStatusSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  syncButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#FFFFFF",
    fontWeight: "500",
    marginLeft: 6,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  settingItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
  },
  settingDescription: {
    fontSize: 14,
    marginTop: 4,
  },
  dataButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  dataButtonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dataButtonText: {
    fontSize: 16,
    marginLeft: 12,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
});
