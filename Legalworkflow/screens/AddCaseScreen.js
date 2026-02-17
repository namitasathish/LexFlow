import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

const priorities = ['High', 'Medium', 'Low'];
const statuses = ['Open', 'In Progress', 'On Hold', 'Closed', 'Archived'];

export default function AddCaseScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const editCaseId = route.params?.caseId || null;

  const { cases, clients, createCase, updateCase } = useApp();
  const existing = useMemo(() => cases.find((c) => c.id === editCaseId) || null, [cases, editCaseId]);

  const [caseTitle, setCaseTitle] = useState(existing?.case_title || '');
  const [courtName, setCourtName] = useState(existing?.court_name || '');
  const [clientId, setClientId] = useState(existing?.client_id || '');
  const [filingDate, setFilingDate] = useState(existing?.filing_date || '');
  const [nextHearing, setNextHearing] = useState(existing?.next_hearing_date || '');
  const [deadline, setDeadline] = useState(existing?.deadline_date || '');
  const [priority, setPriority] = useState(existing?.priority || 'Medium');
  const [status, setStatus] = useState(existing?.status || 'Open');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!caseTitle.trim()) return;
    setSaving(true);
    try {
      const payload = {
        case_title: caseTitle,
        court_name: courtName,
        client_id: clientId || null,
        filing_date: filingDate || null,
        next_hearing_date: nextHearing || null,
        deadline_date: deadline || null,
        priority,
        status,
        notes,
      };
      if (existing) {
        await updateCase(existing.id, payload);
      } else {
        await createCase(payload);
      }
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>{existing ? 'Edit Case' : 'Add Case'}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Case Title *</Text>
        <TextInput value={caseTitle} onChangeText={setCaseTitle} style={styles.input} placeholder="Case title" />

        <Text style={styles.label}>Court Name</Text>
        <TextInput value={courtName} onChangeText={setCourtName} style={styles.input} placeholder="Court name" />

        <Text style={styles.label}>Link Client</Text>
        <View style={styles.pillsRow}>
          <TouchableOpacity
            style={[styles.pill, !clientId ? styles.pillOn : null]}
            onPress={() => setClientId('')}
          >
            <Text style={[styles.pillText, !clientId ? styles.pillTextOn : null]}>None</Text>
          </TouchableOpacity>
          {clients.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.pill, clientId === c.id ? styles.pillOn : null]}
              onPress={() => setClientId(c.id)}
            >
              <Text style={[styles.pillText, clientId === c.id ? styles.pillTextOn : null]} numberOfLines={1}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <Text style={styles.hint}>Tip: Add clients from the Clients screen first.</Text>

        <Text style={styles.label}>Filing Date (YYYY-MM-DD)</Text>
        <TextInput value={filingDate} onChangeText={setFilingDate} style={styles.input} placeholder="2026-02-07" />

        <Text style={styles.label}>Next Hearing Date (YYYY-MM-DD)</Text>
        <TextInput value={nextHearing} onChangeText={setNextHearing} style={styles.input} placeholder="2026-03-01" />

        <Text style={styles.label}>Deadline Date (YYYY-MM-DD)</Text>
        <TextInput value={deadline} onChangeText={setDeadline} style={styles.input} placeholder="2026-02-15" />

        <Text style={styles.label}>Priority</Text>
        <View style={styles.pillsRow}>
          {priorities.map((p) => (
            <TouchableOpacity key={p} style={[styles.pill, priority === p ? styles.pillOn : null]} onPress={() => setPriority(p)}>
              <Text style={[styles.pillText, priority === p ? styles.pillTextOn : null]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Status</Text>
        <View style={styles.pillsRow}>
          {statuses.map((s) => (
            <TouchableOpacity key={s} style={[styles.pill, status === s ? styles.pillOn : null]} onPress={() => setStatus(s)}>
              <Text style={[styles.pillText, status === s ? styles.pillTextOn : null]}>{s}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Notes</Text>
        <TextInput
          value={notes}
          onChangeText={setNotes}
          style={[styles.input, styles.textArea]}
          multiline
          placeholder="Notes"
        />

        <TouchableOpacity style={[styles.saveBtn, (!caseTitle.trim() || saving) ? styles.saveBtnDisabled : null]} onPress={handleSave} disabled={!caseTitle.trim() || saving}>
          <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Save'}</Text>
        </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  h1: { fontSize: 16, fontWeight: '800', color: colors.text },
  link: { color: colors.primary, fontWeight: '800' },
  content: { padding: 16, paddingBottom: 40 },
  label: { marginTop: 12, marginBottom: 6, fontWeight: '800', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  hint: { marginTop: 6, color: colors.textSecondary, fontSize: 12 },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: colors.surface, maxWidth: '100%' },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '700' },
  pillTextOn: { color: colors.white },
  saveBtn: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '900' },
});

