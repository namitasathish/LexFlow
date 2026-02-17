import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert, SectionList } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDb, makeId } from '../database/db';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

const CATEGORIES = ['Evidence', 'Court Order', 'Agreement', 'Correspondence', 'ID Proof', 'Other'];

export default function DocumentsScreen() {
  const navigation = useNavigation();
  const { cases, clientsById, logActivity } = useApp();

  const [docs, setDocs] = useState([]);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [draft, setDraft] = useState({ name: '', category: 'Other', tags: '', case_id: '' });

  const refresh = useCallback(async () => {
    const db = await getDb();
    const rows = await db.getAllAsync(
      `SELECT d.*, c.case_title FROM documents d LEFT JOIN cases c ON d.case_id = c.id ORDER BY datetime(d.created_at) DESC`
    );
    setDocs(rows ?? []);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  // Group docs by case
  const sections = useMemo(() => {
    let filtered = docs;
    const q = search.trim().toLowerCase();
    if (q) {
      filtered = filtered.filter((d) =>
        (d.name || '').toLowerCase().includes(q) ||
        (d.tags || '').toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q)
      );
    }
    if (clientFilter) {
      const clientCaseIds = cases.filter((c) => c.client_id === clientFilter).map((c) => c.id);
      filtered = filtered.filter((d) => clientCaseIds.includes(d.case_id));
    }

    const groups = {};
    for (const d of filtered) {
      const key = d.case_id || '__unlinked__';
      if (!groups[key]) {
        groups[key] = { title: d.case_title || 'Unlinked Documents', case_id: key, data: [] };
      }
      groups[key].data.push(d);
    }
    return Object.values(groups);
  }, [docs, search, clientFilter, cases]);

  const pickAndSaveFile = async () => {
    try {
      const DocumentPicker = require('expo-document-picker');
      const result = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets?.[0];
      if (!file) return;

      const db = await getDb();
      const now = new Date().toISOString();
      const id = makeId('doc');
      const ext = file.name?.split('.').pop()?.toLowerCase() || '';
      const fileType = ['pdf'].includes(ext) ? 'pdf' : ['jpg', 'jpeg', 'png', 'gif'].includes(ext) ? 'image' : ['doc', 'docx'].includes(ext) ? 'docx' : ext;

      await db.runAsync(
        'INSERT INTO documents (id, case_id, name, uri, category, tags, created_at, file_size, file_type, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, draft.case_id || null, file.name || 'Unnamed', file.uri || null, draft.category, draft.tags.trim() || null, now, file.size || null, fileType, now]
      );
      await logActivity('document', id, 'created', `Uploaded file: ${file.name}`);
      setDraft({ name: '', category: 'Other', tags: '', case_id: '' });
      setShowForm(false);
      await refresh();
    } catch (e) {
      Alert.alert('Info', 'File picker not available. Use manual entry or install expo-document-picker.');
    }
  };

  const saveManual = async () => {
    if (!draft.name.trim()) return;
    const db = await getDb();
    const now = new Date().toISOString();
    const id = makeId('doc');
    await db.runAsync(
      'INSERT INTO documents (id, case_id, name, uri, category, tags, created_at, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, draft.case_id || null, draft.name.trim(), null, draft.category, draft.tags.trim() || null, now, now]
    );
    await logActivity('document', id, 'created', `Added document: ${draft.name.trim()}`);
    setDraft({ name: '', category: 'Other', tags: '', case_id: '' });
    setShowForm(false);
    await refresh();
  };

  const deleteDoc = async (id, name) => {
    Alert.alert('Delete', `Delete "${name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          const db = await getDb();
          await db.runAsync('DELETE FROM documents WHERE id = ?', [id]);
          await logActivity('document', id, 'deleted', `Deleted document: ${name}`);
          await refresh();
        },
      },
    ]);
  };

  const openFile = async (uri) => {
    if (!uri) {
      Alert.alert('No file', 'This entry has metadata only, no file attached.');
      return;
    }
    try {
      const Sharing = require('expo-sharing');
      const available = await Sharing.isAvailableAsync();
      if (available) await Sharing.shareAsync(uri);
      else Alert.alert('Cannot open', 'Sharing not available.');
    } catch (e) {
      Alert.alert('Cannot open', 'Install expo-sharing to open files.');
    }
  };

  // Unique clients that have cases with documents
  const clientsWithDocs = useMemo(() => {
    const caseIds = new Set(docs.map((d) => d.case_id).filter(Boolean));
    const clientIds = new Set();
    for (const c of cases) {
      if (caseIds.has(c.id) && c.client_id) clientIds.add(c.client_id);
    }
    return [...clientIds].map((id) => clientsById.get(id)).filter(Boolean);
  }, [docs, cases, clientsById]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Documents</Text>
        <TouchableOpacity onPress={() => setShowForm(!showForm)}>
          <Text style={styles.link}>{showForm ? 'Close' : '+ Add'}</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput style={styles.searchInput} value={search} onChangeText={setSearch} placeholder="Search documents..." placeholderTextColor={colors.textSecondary} />
      </View>

      {/* Client Filter */}
      {clientsWithDocs.length > 0 && (
        <View style={styles.filterRow}>
          <TouchableOpacity style={[styles.filterPill, !clientFilter ? styles.filterOn : null]} onPress={() => setClientFilter('')}>
            <Text style={[styles.filterText, !clientFilter ? styles.filterTextOn : null]}>All Clients</Text>
          </TouchableOpacity>
          {clientsWithDocs.map((cl) => (
            <TouchableOpacity key={cl.id} style={[styles.filterPill, clientFilter === cl.id ? styles.filterOn : null]} onPress={() => setClientFilter(clientFilter === cl.id ? '' : cl.id)}>
              <Text style={[styles.filterText, clientFilter === cl.id ? styles.filterTextOn : null]} numberOfLines={1}>{cl.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Add Form */}
      {showForm && (
        <View style={styles.form}>
          <TouchableOpacity style={styles.uploadBtn} onPress={pickAndSaveFile}>
            <Text style={styles.uploadBtnText}>📎 Pick File from Device</Text>
          </TouchableOpacity>
          <Text style={styles.orText}>— or add metadata —</Text>
          <TextInput style={styles.input} value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} placeholder="Document name *" placeholderTextColor={colors.textSecondary} />

          <Text style={styles.label}>Link to Case</Text>
          <View style={styles.pillsRow}>
            <TouchableOpacity style={[styles.pill, !draft.case_id ? styles.pillOn : null]} onPress={() => setDraft((d) => ({ ...d, case_id: '' }))}>
              <Text style={[styles.pillText, !draft.case_id ? styles.pillTextOn : null]}>None</Text>
            </TouchableOpacity>
            {cases.filter((c) => c.status !== 'Closed').slice(0, 20).map((c) => (
              <TouchableOpacity key={c.id} style={[styles.pill, draft.case_id === c.id ? styles.pillOn : null]} onPress={() => setDraft((d) => ({ ...d, case_id: c.id }))}>
                <Text style={[styles.pillText, draft.case_id === c.id ? styles.pillTextOn : null]} numberOfLines={1}>{c.case_title}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Category</Text>
          <View style={styles.pillsRow}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity key={cat} style={[styles.pill, draft.category === cat ? styles.pillOn : null]} onPress={() => setDraft((d) => ({ ...d, category: cat }))}>
                <Text style={[styles.pillText, draft.category === cat ? styles.pillTextOn : null]}>{cat}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput style={styles.input} value={draft.tags} onChangeText={(t) => setDraft((d) => ({ ...d, tags: t }))} placeholder="Tags, comma-separated" placeholderTextColor={colors.textSecondary} />

          <TouchableOpacity style={[styles.saveBtn, !draft.name.trim() ? styles.saveBtnDisabled : null]} onPress={saveManual} disabled={!draft.name.trim()}>
            <Text style={styles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Grouped Documents */}
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        stickySectionHeadersEnabled={false}
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title} ({section.data.length})</Text>
          </View>
        )}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{item.name}</Text>
              {!!item.category && <Text style={styles.meta}>📁 {item.category}</Text>}
              {!!item.tags && <Text style={styles.meta}>🏷️ {item.tags}</Text>}
              {!!item.file_type && <Text style={styles.meta}>📄 {item.file_type.toUpperCase()}{item.file_size ? ` · ${Math.round(item.file_size / 1024)}KB` : ''}</Text>}
              <Text style={styles.meta}>{(item.uploaded_at || item.created_at)?.slice(0, 10)}</Text>
            </View>
            <View style={styles.cardActions}>
              {item.uri && (
                <TouchableOpacity onPress={() => openFile(item.uri)} style={styles.openBtn}>
                  <Text style={styles.openBtnText}>Open</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity onPress={() => deleteDoc(item.id, item.name)}>
                <Text style={styles.danger}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No documents yet.</Text>}
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
  searchRow: { padding: 16, paddingBottom: 0 },
  searchInput: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  filterRow: { flexDirection: 'row', gap: 6, paddingHorizontal: 16, paddingVertical: 10, flexWrap: 'wrap' },
  filterPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface },
  filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { fontWeight: '700', color: colors.text, fontSize: 12 },
  filterTextOn: { color: colors.white },
  form: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  uploadBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  uploadBtnText: { color: colors.white, fontWeight: '900' },
  orText: { textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginVertical: 6 },
  label: { fontWeight: '800', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 4 },
  pillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface },
  pillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  pillText: { color: colors.text, fontWeight: '700', fontSize: 12 },
  pillTextOn: { color: colors.white },
  saveBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  saveBtnDisabled: { opacity: 0.6 },
  saveBtnText: { color: colors.white, fontWeight: '900' },
  sectionHeader: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  sectionTitle: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  card: {
    marginHorizontal: 16, marginBottom: 8, padding: 12,
    borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    flexDirection: 'row', alignItems: 'flex-start',
  },
  docName: { fontWeight: '900', color: colors.text },
  meta: { marginTop: 2, color: colors.textSecondary, fontSize: 12 },
  cardActions: { marginLeft: 10, gap: 8, alignItems: 'flex-end' },
  openBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  openBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },
  danger: { color: colors.error, fontWeight: '900', fontSize: 13 },
  empty: { padding: 16, color: colors.textSecondary },
});
