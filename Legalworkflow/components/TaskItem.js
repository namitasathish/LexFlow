import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function TaskItem({ task, onToggle, onDelete }) {
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={onToggle} style={[styles.checkbox, task.completed ? styles.checkboxOn : null]}>
        {task.completed ? <Text style={styles.check}>✓</Text> : null}
      </TouchableOpacity>
      <View style={styles.body}>
        <Text style={[styles.title, task.completed ? styles.done : null]} numberOfLines={2}>
          {task.title}
        </Text>
        {!!task.due_date && <Text style={styles.meta}>Due: {String(task.due_date).slice(0, 10)}</Text>}
      </View>
      <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  checkboxOn: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  check: {
    color: colors.white,
    fontWeight: '900',
  },
  body: { flex: 1 },
  title: { color: colors.text, fontSize: 14, fontWeight: '600' },
  done: { textDecorationLine: 'line-through', color: colors.textSecondary },
  meta: { marginTop: 4, fontSize: 12, color: colors.textSecondary },
  deleteBtn: { paddingHorizontal: 8, paddingVertical: 6 },
  deleteText: { color: colors.error, fontWeight: '700', fontSize: 12 },
});

