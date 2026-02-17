import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';
import { getCaseDueDate } from '../utils/deadlineEngine';

function priorityColor(priority) {
  if (priority === 'High') return colors.error;
  if (priority === 'Medium') return colors.warning;
  return colors.secondary;
}

function urgencyBadge(item) {
  const daysLeft = item._daysLeft;
  if (daysLeft === undefined || daysLeft === null) return null;
  if (item._overdue || daysLeft < 0)
    return { emoji: '🔴', text: `${Math.abs(daysLeft)}d overdue`, color: '#dc2626', bg: '#fde8e8' };
  if (daysLeft === 0)
    return { emoji: '🔴', text: 'Due today', color: '#dc2626', bg: '#fde8e8' };
  if (daysLeft <= 2)
    return { emoji: '🟡', text: `${daysLeft}d left`, color: '#d97706', bg: '#fef9c3' };
  if (daysLeft <= 7)
    return { emoji: '🟢', text: `${daysLeft}d left`, color: '#16a34a', bg: '#dcfce7' };
  return { emoji: '🟢', text: `${daysLeft}d left`, color: '#64748b', bg: '#f1f5f9' };
}

export default function CaseCard({ item, clientName, onPress }) {
  // Calculate days left if not already present
  let enriched = item;
  if (item._daysLeft === undefined) {
    const due = getCaseDueDate(item);
    if (due) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const d = new Date(due);
      d.setHours(0, 0, 0, 0);
      const diff = Math.round((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      enriched = { ...item, _daysLeft: diff, _overdue: diff < 0 };
    }
  }

  const badge = urgencyBadge(enriched);

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <View style={styles.topRow}>
        <Text style={styles.title} numberOfLines={1}>
          {item.case_title || 'Untitled case'}
        </Text>
        <View style={[styles.priorityBadge, { backgroundColor: priorityColor(item.priority) }]}>
          <Text style={styles.priorityText}>{item.priority || 'Medium'}</Text>
        </View>
      </View>

      {!!clientName && <Text style={styles.meta}>Client: {clientName}</Text>}
      {!!item.court_name && <Text style={styles.meta}>Court: {item.court_name}</Text>}

      <View style={styles.bottomRow}>
        <View style={[styles.statusPill, item.status === 'Open' ? styles.statusOpen : item.status === 'Closed' ? styles.statusClosed : styles.statusOther]}>
          <Text style={styles.statusText}>{item.status || 'Open'}</Text>
        </View>

        {badge && (
          <View style={[styles.urgencyBadge, { backgroundColor: badge.bg }]}>
            <Text style={[styles.urgencyText, { color: badge.color }]}>
              {badge.emoji} {badge.text}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginVertical: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  priorityText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '800',
  },
  meta: {
    marginTop: 4,
    fontSize: 13,
    color: colors.textSecondary,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    gap: 8,
  },
  statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
  statusOpen: { backgroundColor: '#dbeafe' },
  statusClosed: { backgroundColor: '#dcfce7' },
  statusOther: { backgroundColor: '#f3f4f6' },
  statusText: { fontSize: 11, fontWeight: '800', color: colors.text },
  urgencyBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '800',
  },
});
