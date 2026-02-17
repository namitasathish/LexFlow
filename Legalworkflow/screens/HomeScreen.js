import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { getOverdueCases } from '../utils/deadlineEngine';
import CaseCard from '../components/CaseCard';
import { colors } from '../constants/colors';

const PRIORITIES = ['All', 'High', 'Medium', 'Low'];
const STATUSES = ['All', 'Open', 'In Progress', 'On Hold', 'Closed', 'Archived'];

export default function HomeScreen() {
  const navigation = useNavigation();
  const {
    cases, clients, urgentCases, todayCases, loading,
    getPendingFollowUps, getActivityLog, clientsById, user, logout
  } = useApp();

  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [followUps, setFollowUps] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);

  // Load follow-ups & recent activity
  const loadExtras = useCallback(async () => {
    try {
      const fu = await getPendingFollowUps();
      setFollowUps(fu || []);
      const al = await getActivityLog(5);
      setRecentActivity(al || []);
    } catch (e) { }
  }, [getPendingFollowUps, getActivityLog]);

  useEffect(() => { loadExtras(); }, [loadExtras]);

  const overdueCases = useMemo(() => getOverdueCases(cases), [cases]);

  // Stats
  const openCount = useMemo(() => cases.filter((c) => c.status !== 'Closed').length, [cases]);
  const closedCount = useMemo(() => cases.filter((c) => c.status === 'Closed').length, [cases]);

  // Filtered + searched cases
  const filtered = useMemo(() => {
    let list = cases;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((c) =>
        (c.case_title || '').toLowerCase().includes(q) ||
        (c.court_name || '').toLowerCase().includes(q) ||
        (c.notes || '').toLowerCase().includes(q) ||
        (clientsById.get(c.client_id)?.name || '').toLowerCase().includes(q)
      );
    }
    if (priorityFilter !== 'All') list = list.filter((c) => c.priority === priorityFilter);
    if (statusFilter !== 'All') list = list.filter((c) => c.status === statusFilter);
    return list;
  }, [cases, search, priorityFilter, statusFilter, clientsById]);

  const getClientName = (clientId) => clientsById.get(clientId)?.name || '';

  // Header / top section rendered via ListHeaderComponent
  const ListHeader = () => (
    <>
      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}><Text style={styles.statNum}>{cases.length}</Text><Text style={styles.statLabel}>Total</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, { color: colors.primary }]}>{openCount}</Text><Text style={styles.statLabel}>Open</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, { color: colors.error }]}>{overdueCases.length}</Text><Text style={styles.statLabel}>Overdue</Text></View>
        <View style={styles.statCard}><Text style={[styles.statNum, { color: colors.success }]}>{closedCount}</Text><Text style={styles.statLabel}>Closed</Text></View>
      </View>

      {/* Today Section */}
      {todayCases.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📅 Today's Deadlines ({todayCases.length})</Text>
          {todayCases.map((c) => (
            <TouchableOpacity key={c.id} style={styles.todayCard} onPress={() => navigation.navigate('Case Detail', { caseId: c.id })}>
              <Text style={styles.todayText} numberOfLines={1}>{c.case_title}</Text>
              <View style={[styles.pill, c.priority === 'High' ? styles.pillHigh : c.priority === 'Low' ? styles.pillLow : styles.pillMed]}>
                <Text style={styles.pillText}>{c.priority}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Pending Follow-ups */}
      {followUps.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⏳ Pending Follow-ups ({followUps.length})</Text>
          {followUps.slice(0, 3).map((fu) => (
            <View key={fu.id} style={styles.followUpCard}>
              <Text style={styles.followUpClient}>👤 {fu.client_name || 'Unknown'}</Text>
              <Text style={styles.followUpSum} numberOfLines={1}>{fu.summary}</Text>
              <Text style={styles.followUpDate}>Due: {fu.follow_up_date?.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Urgent Cases */}
      {urgentCases.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔥 Urgent ({urgentCases.length})</Text>
          {urgentCases.map((c) => (
            <CaseCard key={c.id} item={c} clientName={getClientName(c.client_id)} onPress={() => navigation.navigate('Case Detail', { caseId: c.id })} />
          ))}
        </View>
      )}

      {/* Nav Shortcuts */}
      <View style={styles.navGrid}>
        {[
          { label: '📆 Weekly', screen: 'Weekly Planner' },
          { label: '📚 Bare Acts', screen: 'Bare Acts' },
          { label: '📝 FIR Builder', screen: 'FIR Builder' },
          { label: '👥 Clients', screen: 'Clients' },
          { label: '📄 Documents', screen: 'Documents' },
          { label: '📊 Closed Cases', screen: 'Closed Cases' },
          { label: '📋 Activity Log', screen: 'Activity Log' },
          { label: '⚙️ Settings', screen: 'Settings' },
        ].map((item) => (
          <TouchableOpacity key={item.screen} style={styles.navBtn} onPress={() => navigation.navigate(item.screen)}>
            <Text style={styles.navBtnText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      {recentActivity.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>🕐 Recent Activity</Text>
            <TouchableOpacity onPress={() => navigation.navigate('Activity Log')}>
              <Text style={styles.seeAll}>See all</Text>
            </TouchableOpacity>
          </View>
          {recentActivity.map((a) => (
            <View key={a.id} style={styles.activityItem}>
              <Text style={styles.activityText} numberOfLines={1}>{a.description}</Text>
              <Text style={styles.activityTime}>{a.timestamp?.slice(0, 10)}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Search & Filters */}
      <View style={styles.searchSection}>
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search cases, clients, courts ..."
          placeholderTextColor={colors.textSecondary}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          {PRIORITIES.map((p) => (
            <TouchableOpacity key={p} style={[styles.filterPill, priorityFilter === p ? styles.filterPillOn : null]} onPress={() => setPriorityFilter(p)}>
              <Text style={[styles.filterPillText, priorityFilter === p ? styles.filterPillTextOn : null]}>{p}</Text>
            </TouchableOpacity>
          ))}
          <View style={{ width: 10 }} />
          {STATUSES.map((s) => (
            <TouchableOpacity key={s} style={[styles.filterPill, statusFilter === s ? styles.filterPillOn : null]} onPress={() => setStatusFilter(s)}>
              <Text style={[styles.filterPillText, statusFilter === s ? styles.filterPillTextOn : null]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <Text style={styles.sectionTitlePad}>All Cases ({filtered.length})</Text>
    </>
  );

  return (
    <View style={styles.container}>
      {/* App Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.h1}>⚖️ Legal Workflow</Text>
          <Text style={styles.userSub}>Welcome, {user?.name || 'Lawyer'}</Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('Add Case')}>
            <Text style={styles.addBtnText}>+ Case</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={{ paddingHorizontal: 16 }}>
            <CaseCard item={item} clientName={getClientName(item.client_id)} onPress={() => navigation.navigate('Case Detail', { caseId: item.id })} />
          </View>
        )}
        ListEmptyComponent={
          !loading ? <Text style={styles.empty}>No cases found.</Text> : <Text style={styles.empty}>Loading...</Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  h1: { fontSize: 18, fontWeight: '900', color: colors.text },
  userSub: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginTop: -2 },
  addBtn: { backgroundColor: colors.primary, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  addBtnText: { color: colors.white, fontWeight: '900', fontSize: 13 },

  statsRow: { flexDirection: 'row', gap: 8, padding: 16 },
  statCard: {
    flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, padding: 10, alignItems: 'center',
  },
  statNum: { fontSize: 22, fontWeight: '900', color: colors.text },
  statLabel: { fontSize: 11, fontWeight: '700', color: colors.textSecondary, marginTop: 2 },

  section: { marginHorizontal: 16, marginBottom: 12 },
  sectionTitle: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 6 },
  sectionTitlePad: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 6, paddingHorizontal: 16 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  seeAll: { color: colors.primary, fontWeight: '800', fontSize: 12 },

  todayCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff7ed', borderWidth: 1, borderColor: '#fed7aa', borderRadius: 10, padding: 10, marginBottom: 6 },
  todayText: { flex: 1, fontWeight: '800', color: colors.text, marginRight: 8 },

  followUpCard: { backgroundColor: '#fef9c3', borderWidth: 1, borderColor: '#fbbf24', borderRadius: 10, padding: 10, marginBottom: 6 },
  followUpClient: { fontWeight: '800', color: colors.text, fontSize: 13 },
  followUpSum: { color: colors.text, fontSize: 13, marginTop: 2 },
  followUpDate: { color: colors.warning, fontWeight: '700', fontSize: 12, marginTop: 2 },

  pill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  pillHigh: { backgroundColor: '#fde8e8' },
  pillMed: { backgroundColor: '#dbeafe' },
  pillLow: { backgroundColor: '#dcfce7' },
  pillText: { fontSize: 11, fontWeight: '800', color: colors.text },

  navGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, marginBottom: 12 },
  navBtn: { width: '48%', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  navBtnText: { fontWeight: '800', color: colors.text, fontSize: 13 },

  activityItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  activityText: { flex: 1, color: colors.text, fontSize: 13 },
  activityTime: { color: colors.textSecondary, fontSize: 11, marginLeft: 8 },

  searchSection: { paddingHorizontal: 16, marginBottom: 12 },
  searchInput: {
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 8,
  },
  filterScroll: { marginBottom: 4 },
  filterPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 5, marginRight: 6, backgroundColor: colors.surface },
  filterPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterPillText: { fontWeight: '700', color: colors.text, fontSize: 12 },
  filterPillTextOn: { color: colors.white },

  empty: { padding: 16, textAlign: 'center', color: colors.textSecondary },
});
