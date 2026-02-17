import React, { useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import TaskItem from '../components/TaskItem';
import { colors } from '../constants/colors';

export default function CaseDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const caseId = route.params?.caseId;

  const {
    cases,
    clientsById,
    tasksByCaseId,
    deleteCase,
    closeCase,
    addTask,
    setTaskCompleted,
    deleteTask,
  } = useApp();

  const c = useMemo(() => cases.find((x) => x.id === caseId) || null, [cases, caseId]);
  const client = c?.client_id ? clientsById.get(c.client_id) : null;
  const caseTasks = tasksByCaseId.get(caseId) || [];

  const [newTask, setNewTask] = useState('');
  const [delayNotes, setDelayNotes] = useState('');
  const [outcome, setOutcome] = useState('');

  if (!c) {
    return (
      <View style={styles.container}>
        <Text style={styles.empty}>Case not found.</Text>
      </View>
    );
  }

  const confirmDelete = () => {
    Alert.alert('Delete Case', 'This will delete the case and its tasks. Continue?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteCase(c.id);
          navigation.goBack();
        },
      },
    ]);
  };

  const confirmClose = () => {
    Alert.alert('Close Case', 'Mark this case as Closed and store it in closed_cases?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Close',
        style: 'default',
        onPress: async () => {
          await closeCase(c.id, delayNotes, outcome);
          setDelayNotes('');
          setOutcome('');
        },
      },
    ]);
  };

  const handleAddTask = async () => {
    if (!newTask.trim()) return;
    await addTask(c.id, { title: newTask.trim() });
    setNewTask('');
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1} numberOfLines={1}>
          Case Detail
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('Add Case', { caseId: c.id })}>
          <Text style={styles.link}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>{c.case_title}</Text>
        {!!client && <Text style={styles.meta}>Client: {client.name}</Text>}
        {!!c.court_name && <Text style={styles.meta}>Court: {c.court_name}</Text>}
        <Text style={styles.meta}>Priority: {c.priority}</Text>
        <Text style={styles.meta}>Status: {c.status}</Text>

        {!!c.filing_date && <Text style={styles.meta}>Filing: {String(c.filing_date).slice(0, 10)}</Text>}
        {!!c.next_hearing_date && <Text style={styles.meta}>Next hearing: {String(c.next_hearing_date).slice(0, 10)}</Text>}
        {!!c.deadline_date && <Text style={styles.meta}>Deadline: {String(c.deadline_date).slice(0, 10)}</Text>}

        {!!c.notes && (
          <>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{c.notes}</Text>
          </>
        )}

        {/* Documents */}
        <TouchableOpacity style={styles.docsBtn} onPress={() => navigation.navigate('Case Documents', { caseId: c.id, caseTitle: c.case_title })}>
          <Text style={styles.docsBtnText}>📄 View Documents</Text>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.actionBtn} onPress={confirmDelete}>
            <Text style={[styles.actionText, { color: colors.error }]}>Delete</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={confirmClose} disabled={c.status === 'Closed'}>
            <Text style={[styles.actionText, c.status === 'Closed' ? styles.disabledText : null]}>
              {c.status === 'Closed' ? 'Closed' : 'Close Case'}
            </Text>
          </TouchableOpacity>
        </View>

        {c.status !== 'Closed' && (
          <>
            <Text style={styles.sectionTitle}>Outcome (for closing)</Text>
            <View style={styles.outcomeRow}>
              {['Won', 'Lost', 'Settled', 'Withdrawn'].map((o) => (
                <TouchableOpacity key={o} style={[styles.outcomePill, outcome === o ? styles.outcomePillOn : null]} onPress={() => setOutcome(outcome === o ? '' : o)}>
                  <Text style={[styles.outcomeText, outcome === o ? styles.outcomeTextOn : null]}>{o}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Closure notes (optional)</Text>
            <TextInput
              value={delayNotes}
              onChangeText={setDelayNotes}
              style={[styles.input, styles.textArea]}
              multiline
              placeholder="Delay notes / timeline notes"
              placeholderTextColor={colors.textSecondary}
            />
          </>
        )}

        <Text style={styles.sectionTitle}>Tasks</Text>
        <View style={styles.taskAddRow}>
          <TextInput
            value={newTask}
            onChangeText={setNewTask}
            style={[styles.input, { flex: 1 }]}
            placeholder="New task title"
            placeholderTextColor={colors.textSecondary}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddTask} disabled={!newTask.trim()}>
            <Text style={styles.addBtnText}>Add</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.taskList}>
          {caseTasks.length === 0 ? (
            <Text style={styles.emptySmall}>No tasks yet.</Text>
          ) : (
            caseTasks.map((t) => (
              <TaskItem
                key={t.id}
                task={t}
                onToggle={() => setTaskCompleted(t.id, !t.completed)}
                onDelete={() => deleteTask(t.id)}
              />
            ))
          )}
        </View>
      </ScrollView>
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
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  h1: { fontSize: 16, fontWeight: '800', color: colors.text, flex: 1, textAlign: 'center' },
  link: { color: colors.primary, fontWeight: '900', width: 60 },
  content: { padding: 16, paddingBottom: 40 },
  title: { fontSize: 18, fontWeight: '900', color: colors.text, marginBottom: 8 },
  meta: { color: colors.textSecondary, marginTop: 4 },
  sectionTitle: { marginTop: 16, marginBottom: 6, fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  notes: { color: colors.text, lineHeight: 20 },
  actionsRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  actionBtn: { flex: 1, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  actionText: { fontWeight: '900', color: colors.text },
  disabledText: { color: colors.textSecondary },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  taskAddRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  addBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, paddingHorizontal: 14, opacity: 1 },
  addBtnText: { color: colors.white, fontWeight: '900' },
  taskList: { marginTop: 8, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface, paddingHorizontal: 12 },
  docsBtn: { marginTop: 16, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  docsBtnText: { color: colors.primary, fontWeight: '900' },
  outcomeRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  outcomePill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
  outcomePillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  outcomeText: { fontWeight: '700', color: colors.text },
  outcomeTextOn: { color: colors.white },
  empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
  emptySmall: { paddingVertical: 12, color: colors.textSecondary },
});

