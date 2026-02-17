import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SectionList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { groupByDay } from '../utils/deadlineEngine';
import { colors } from '../constants/colors';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function workloadLabel(count) {
  if (count >= 8) return { text: '🔴 Heavy', color: colors.error };
  if (count >= 4) return { text: '🟡 Medium', color: colors.warning };
  return { text: '🟢 Light', color: colors.success };
}

export default function WeeklyScreen() {
  const navigation = useNavigation();
  const { weeklyCases, tasks, clientsById, tasksByCaseId } = useApp();

  const sections = useMemo(() => {
    const groups = groupByDay(weeklyCases);
    const dayKeys = Object.keys(groups).sort();

    return dayKeys.map((key) => {
      const date = new Date(key + 'T00:00:00');
      const dayName = DAYS[date.getDay()];
      const label = `${dayName}, ${key}`;
      const casesForDay = groups[key] || [];

      // Tasks due on this day
      const tasksForDay = (tasks || []).filter((t) => {
        if (t.completed) return false;
        return t.due_date && t.due_date.startsWith(key);
      });

      // Check if any case has incomplete tasks (preparation needed)
      const prepNeeded = casesForDay.some((c) => {
        const ct = tasksByCaseId.get(c.id) || [];
        return ct.some((t) => !t.completed);
      });

      return {
        title: label,
        caseCount: casesForDay.length,
        taskCount: tasksForDay.length,
        prepNeeded,
        data: [...casesForDay.map((c) => ({ ...c, _type: 'case' })), ...tasksForDay.map((t) => ({ ...t, _type: 'task' }))],
      };
    });
  }, [weeklyCases, tasks, tasksByCaseId]);

  const totalItems = sections.reduce((s, sec) => s + sec.data.length, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>📆 Weekly Planner</Text>
        <View style={{ width: 40 }} />
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.id + index}
        stickySectionHeadersEnabled={false}
        ListHeaderComponent={() => (
          <View style={styles.summary}>
            <Text style={styles.summaryText}>{sections.length} day(s) with deadlines · {totalItems} total item(s)</Text>
          </View>
        )}
        renderSectionHeader={({ section }) => {
          const wl = workloadLabel(section.caseCount + section.taskCount);
          return (
            <View style={styles.dayHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.dayTitle}>{section.title}</Text>
                <Text style={styles.dayMeta}>
                  {section.caseCount} case(s) · {section.taskCount} task(s)
                  {section.prepNeeded ? ' · ⚠️ Prep needed' : ''}
                </Text>
              </View>
              <View style={[styles.workloadBadge, { backgroundColor: wl.color + '20' }]}>
                <Text style={[styles.workloadText, { color: wl.color }]}>{wl.text}</Text>
              </View>
            </View>
          );
        }}
        renderItem={({ item }) => {
          if (item._type === 'task') {
            return (
              <View style={[styles.itemCard, styles.taskCard]}>
                <Text style={styles.taskIcon}>✅</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                  <Text style={styles.itemMeta}>Task{item.due_date ? ` · Due: ${item.due_date.slice(0, 10)}` : ''}</Text>
                </View>
              </View>
            );
          }

          const clientName = item.client_id ? clientsById.get(item.client_id)?.name : '';
          const incompleteTasks = (tasksByCaseId.get(item.id) || []).filter((t) => !t.completed).length;

          return (
            <TouchableOpacity style={styles.itemCard} onPress={() => navigation.navigate('Case Detail', { caseId: item.id })}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.case_title}</Text>
                {!!clientName && <Text style={styles.itemMeta}>Client: {clientName}</Text>}
                {!!item.court_name && <Text style={styles.itemMeta}>Court: {item.court_name}</Text>}
                {incompleteTasks > 0 && <Text style={styles.prepWarning}>⚠️ {incompleteTasks} task(s) pending</Text>}
              </View>
              <View style={[styles.priorityBadge, item.priority === 'High' ? styles.priorityHigh : item.priority === 'Low' ? styles.priorityLow : styles.priorityMed]}>
                <Text style={styles.priorityText}>{item.priority}</Text>
              </View>
            </TouchableOpacity>
          );
        }}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No deadlines in the next 7 days. 🎉</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: 48, paddingHorizontal: 16, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  h1: { fontSize: 16, fontWeight: '900', color: colors.text },
  link: { color: colors.primary, fontWeight: '900' },
  summary: { padding: 16, paddingBottom: 8 },
  summaryText: { color: colors.textSecondary, fontWeight: '700' },
  dayHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  dayTitle: { fontSize: 15, fontWeight: '900', color: colors.text },
  dayMeta: { color: colors.textSecondary, fontSize: 12, fontWeight: '700', marginTop: 2 },
  workloadBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  workloadText: { fontWeight: '800', fontSize: 12 },
  itemCard: {
    marginHorizontal: 16, marginBottom: 6, padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'center',
  },
  taskCard: { borderLeftWidth: 3, borderLeftColor: colors.success },
  taskIcon: { marginRight: 10, fontSize: 16 },
  itemTitle: { fontWeight: '800', color: colors.text, flex: 1 },
  itemMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
  prepWarning: { color: colors.warning, fontWeight: '700', fontSize: 12, marginTop: 4 },
  priorityBadge: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
  priorityHigh: { backgroundColor: '#fde8e8' },
  priorityMed: { backgroundColor: '#dbeafe' },
  priorityLow: { backgroundColor: '#dcfce7' },
  priorityText: { fontSize: 11, fontWeight: '800', color: colors.text },
  empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
});
