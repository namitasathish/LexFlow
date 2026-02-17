import React, { useMemo, useState } from 'react';
import { View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import ClientCard from '../components/ClientCard';
import { colors } from '../constants/colors';

export default function ClientsScreen() {
  const navigation = useNavigation();
  const { clients, cases, createClient, updateClient, deleteClient } = useApp();
  const [q, setQ] = useState('');

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter((c) => (c.name || '').toLowerCase().includes(query));
  }, [q, clients]);

  const [draft, setDraft] = useState({ id: null, name: '', phone: '', email: '', address: '' });
  const isEditing = !!draft.id;

  const startEdit = (client) => setDraft({ ...client });
  const resetDraft = () => setDraft({ id: null, name: '', phone: '', email: '', address: '' });

  const save = async () => {
    if (!draft.name.trim()) return;
    if (isEditing) {
      await updateClient(draft.id, draft);
    } else {
      await createClient(draft);
    }
    resetDraft();
  };

  const confirmDelete = (clientId) => {
    const linkedCount = cases.filter((x) => x.client_id === clientId).length;
    Alert.alert(
      'Delete Client',
      linkedCount
        ? `This client is linked to ${linkedCount} case(s). Those cases will remain, but client link will be cleared. Continue?`
        : 'Delete this client?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: async () => deleteClient(clientId) },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Clients</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput value={q} onChangeText={setQ} placeholder="Search clients" placeholderTextColor={colors.textSecondary} style={styles.search} />
      </View>

      <View style={styles.form}>
        <Text style={styles.formTitle}>{isEditing ? 'Edit Client' : 'Add Client'}</Text>
        <TextInput value={draft.name} onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))} style={styles.input} placeholder="Name *" />
        <TextInput value={draft.phone} onChangeText={(t) => setDraft((d) => ({ ...d, phone: t }))} style={styles.input} placeholder="Phone" />
        <TextInput value={draft.email} onChangeText={(t) => setDraft((d) => ({ ...d, email: t }))} style={styles.input} placeholder="Email" autoCapitalize="none" />
        <TextInput value={draft.address} onChangeText={(t) => setDraft((d) => ({ ...d, address: t }))} style={[styles.input, styles.textArea]} placeholder="Address" multiline />
        <View style={styles.formActions}>
          <TouchableOpacity style={[styles.btn, styles.btnPrimary, !draft.name.trim() ? styles.btnDisabled : null]} onPress={save} disabled={!draft.name.trim()}>
            <Text style={styles.btnTextPrimary}>{isEditing ? 'Update' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btn} onPress={resetDraft}>
            <Text style={styles.btnText}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View>
            <ClientCard item={item} onPress={() => navigation.navigate('Client Detail', { clientId: item.id })} />
            <View style={styles.clientActions}>
              <Text style={styles.clientCases}>
                Cases: {cases.filter((x) => x.client_id === item.id).length}
              </Text>
              <View style={styles.clientBtns}>
                <TouchableOpacity onPress={() => startEdit(item)}>
                  <Text style={styles.editLink}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item.id)}>
                  <Text style={styles.danger}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingBottom: 24 }}
        ListEmptyComponent={<Text style={styles.empty}>No clients yet.</Text>}
      />
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
  searchWrap: { padding: 16 },
  search: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  form: { marginHorizontal: 16, marginBottom: 10, padding: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, backgroundColor: colors.surface },
  formTitle: { fontWeight: '900', color: colors.text, marginBottom: 8 },
  input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 8 },
  textArea: { minHeight: 60, textAlignVertical: 'top' },
  formActions: { flexDirection: 'row', gap: 10, marginTop: 10 },
  btn: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '900', color: colors.text },
  btnTextPrimary: { fontWeight: '900', color: colors.white },
  clientActions: { marginHorizontal: 16, marginTop: -2, marginBottom: 10, flexDirection: 'row', justifyContent: 'space-between' },
  clientCases: { color: colors.textSecondary, fontWeight: '700' },
  clientBtns: { flexDirection: 'row', gap: 16 },
  editLink: { color: colors.primary, fontWeight: '900' },
  danger: { color: colors.error, fontWeight: '900' },
  empty: { paddingHorizontal: 16, paddingVertical: 10, color: colors.textSecondary },
});

