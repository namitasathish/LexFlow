import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDb } from '../database/db';
import { requestNotificationPermission } from '../utils/notifications';
import { colors } from '../constants/colors';
import { useApp } from '../context/AppContext';

const NOTIFICATIONS_ENABLED_KEY = '@law_notifications_enabled';

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { user, logout } = useApp();
  const [notifEnabled, setNotifEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const raw = await AsyncStorage.getItem(NOTIFICATIONS_ENABLED_KEY);
      setNotifEnabled(raw === 'true');
      setLoading(false);
    })();
  }, []);

  const toggleNotif = async (value) => {
    if (value) {
      const ok = await requestNotificationPermission();
      if (!ok) {
        await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, 'false');
        setNotifEnabled(false);
        return;
      }
    }
    await AsyncStorage.setItem(NOTIFICATIONS_ENABLED_KEY, value ? 'true' : 'false');
    setNotifEnabled(value);
  };

  const clearAllData = () => {
    Alert.alert('Clear all data', 'This deletes all cases, clients, tasks, and closed case history. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          const db = await getDb();
          await db.execAsync(`
            DELETE FROM tasks;
            DELETE FROM closed_cases;
            DELETE FROM cases;
            DELETE FROM clients;
          `);
          navigation.navigate('Home');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>Enable local alerts</Text>
          <Switch
            value={notifEnabled}
            onValueChange={toggleNotif}
            disabled={loading}
            trackColor={{ false: colors.border, true: colors.primary }}
          />
        </View>
        <Text style={styles.hint}>
          Alerts are scheduled for case deadlines based on priority (High: 7/2/0 days; Medium: 2/0; Low: 0).
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={[styles.row, { marginBottom: 12 }]}>
          <Text style={styles.rowLabel}>Logged in as</Text>
          <Text style={styles.valueText}>{user?.name}</Text>
        </View>
        <TouchableOpacity style={styles.btn} onPress={logout}>
          <Text style={styles.btnText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Data Management</Text>
        <TouchableOpacity style={styles.dangerBtn} onPress={clearAllData}>
          <Text style={styles.dangerText}>Delete all local data</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 48,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: { fontSize: 16, fontWeight: '900', color: colors.text },
  link: { color: colors.primary, fontWeight: '900' },
  section: { padding: 16 },
  sectionTitle: { fontWeight: '900', color: colors.textSecondary, textTransform: 'uppercase', fontSize: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12 },
  rowLabel: { fontWeight: '800', color: colors.text },
  valueText: { color: colors.textSecondary, fontWeight: '700' },
  hint: { marginTop: 8, color: colors.textSecondary, fontSize: 12 },
  btn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, padding: 12, alignItems: 'center' },
  btnText: { color: colors.primary, fontWeight: '900' },
  dangerBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.error, borderRadius: 10, padding: 12, alignItems: 'center' },
  dangerText: { color: colors.error, fontWeight: '900' },
});
