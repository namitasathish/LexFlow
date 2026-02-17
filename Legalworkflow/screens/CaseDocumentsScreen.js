import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Alert } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { getDb, makeId } from '../database/db';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

const CATEGORIES = ['Evidence', 'Court Order', 'Agreement', 'Correspondence', 'ID Proof', 'Other'];

export default function CaseDocumentsScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const caseId = route.params?.caseId;
    const caseTitle = route.params?.caseTitle || 'Case';

    const { cases, clients, logActivity } = useApp();
    const [docs, setDocs] = useState([]);
    const [draft, setDraft] = useState({ name: '', category: 'Other', tags: '' });

    const refresh = useCallback(async () => {
        const db = await getDb();
        const query = caseId
            ? 'SELECT * FROM documents WHERE case_id = ? ORDER BY datetime(created_at) DESC'
            : 'SELECT * FROM documents ORDER BY datetime(created_at) DESC';
        const params = caseId ? [caseId] : [];
        const rows = await db.getAllAsync(query, params);
        setDocs(rows ?? []);
    }, [caseId]);

    useEffect(() => { refresh(); }, [refresh]);

    const pickAndSaveFile = async () => {
        // Try to use expo-document-picker if available
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
                [id, caseId || null, file.name || 'Unnamed', file.uri || null, draft.category, draft.tags.trim() || null, now, file.size || null, fileType, now]
            );
            await logActivity('document', id, 'created', `Uploaded file: ${file.name}`);
            setDraft({ name: '', category: 'Other', tags: '' });
            await refresh();
        } catch (e) {
            // expo-document-picker not installed - fallback to manual entry
            saveManual();
        }
    };

    const saveManual = async () => {
        if (!draft.name.trim()) return;
        const db = await getDb();
        const now = new Date().toISOString();
        const id = makeId('doc');
        await db.runAsync(
            'INSERT INTO documents (id, case_id, name, uri, category, tags, created_at, uploaded_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [id, caseId || null, draft.name.trim(), null, draft.category, draft.tags.trim() || null, now, now]
        );
        await logActivity('document', id, 'created', `Added document: ${draft.name.trim()}`);
        setDraft({ name: '', category: 'Other', tags: '' });
        await refresh();
    };

    const deleteDoc = async (id, name) => {
        Alert.alert('Delete Document', `Delete "${name}"?`, [
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
            Alert.alert('No file', 'This document has no file attached — metadata only.');
            return;
        }
        try {
            const Sharing = require('expo-sharing');
            const available = await Sharing.isAvailableAsync();
            if (available) {
                await Sharing.shareAsync(uri);
            } else {
                Alert.alert('Cannot open', 'Sharing is not available on this device.');
            }
        } catch (e) {
            Alert.alert('Cannot open', 'Install expo-sharing to open files.');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.h1} numberOfLines={1}>{caseId ? 'Case Documents' : 'All Documents'}</Text>
                <View style={{ width: 40 }} />
            </View>

            {caseId && <Text style={styles.subtitle}>{caseTitle}</Text>}

            {/* Add Document */}
            <View style={styles.form}>
                <Text style={styles.formTitle}>Add Document</Text>

                <TouchableOpacity style={styles.uploadBtn} onPress={pickAndSaveFile}>
                    <Text style={styles.uploadBtnText}>📎 Pick File from Device</Text>
                </TouchableOpacity>

                <Text style={styles.orText}>— or add metadata manually —</Text>

                <TextInput
                    style={styles.input}
                    value={draft.name}
                    onChangeText={(t) => setDraft((d) => ({ ...d, name: t }))}
                    placeholder="Document name *"
                    placeholderTextColor={colors.textSecondary}
                />

                <Text style={styles.label}>Category</Text>
                <View style={styles.catPills}>
                    {CATEGORIES.map((cat) => (
                        <TouchableOpacity
                            key={cat}
                            style={[styles.catPill, draft.category === cat ? styles.catPillOn : null]}
                            onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                        >
                            <Text style={[styles.catPillText, draft.category === cat ? styles.catPillTextOn : null]}>{cat}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <TextInput
                    style={styles.input}
                    value={draft.tags}
                    onChangeText={(t) => setDraft((d) => ({ ...d, tags: t }))}
                    placeholder="Tags, comma-separated"
                    placeholderTextColor={colors.textSecondary}
                />

                <TouchableOpacity
                    style={[styles.saveBtn, !draft.name.trim() ? styles.saveBtnDisabled : null]}
                    onPress={saveManual}
                    disabled={!draft.name.trim()}
                >
                    <Text style={styles.saveBtnText}>Save Metadata</Text>
                </TouchableOpacity>
            </View>

            {/* Documents List */}
            <FlatList
                data={docs}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
                renderItem={({ item }) => (
                    <View style={styles.card}>
                        <View style={styles.cardTop}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docName}>{item.name}</Text>
                                {!!item.category && <Text style={styles.meta}>📁 {item.category}</Text>}
                                {!!item.tags && <Text style={styles.meta}>🏷️ {item.tags}</Text>}
                                {!!item.file_type && <Text style={styles.meta}>📄 {item.file_type.toUpperCase()}{item.file_size ? ` · ${Math.round(item.file_size / 1024)}KB` : ''}</Text>}
                                <Text style={styles.meta}>Added: {(item.uploaded_at || item.created_at)?.slice(0, 10)}</Text>
                            </View>
                            <View style={styles.cardActions}>
                                {item.uri && (
                                    <TouchableOpacity onPress={() => openFile(item.uri)} style={styles.actionBtn}>
                                        <Text style={styles.actionBtnText}>Open</Text>
                                    </TouchableOpacity>
                                )}
                                <TouchableOpacity onPress={() => deleteDoc(item.id, item.name)}>
                                    <Text style={styles.danger}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                )}
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
    h1: { fontSize: 16, fontWeight: '900', color: colors.text, flex: 1, textAlign: 'center' },
    link: { color: colors.primary, fontWeight: '900' },
    subtitle: { paddingHorizontal: 16, paddingTop: 8, color: colors.textSecondary, fontWeight: '700' },
    form: { margin: 16, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    formTitle: { fontWeight: '900', color: colors.text, marginBottom: 8 },
    uploadBtn: { backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center', marginBottom: 8 },
    uploadBtnText: { color: colors.white, fontWeight: '900' },
    orText: { textAlign: 'center', color: colors.textSecondary, fontSize: 12, marginVertical: 6 },
    label: { fontWeight: '800', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginTop: 8, marginBottom: 4 },
    input: { backgroundColor: colors.white, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginTop: 4 },
    catPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    catPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: colors.surface },
    catPillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    catPillText: { color: colors.text, fontWeight: '700', fontSize: 12 },
    catPillTextOn: { color: colors.white },
    saveBtn: { marginTop: 10, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: colors.white, fontWeight: '900' },
    card: { marginBottom: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    cardTop: { flexDirection: 'row', alignItems: 'flex-start' },
    docName: { fontWeight: '900', color: colors.text },
    meta: { marginTop: 3, color: colors.textSecondary, fontSize: 12 },
    cardActions: { marginLeft: 10, gap: 8, alignItems: 'flex-end' },
    actionBtn: { backgroundColor: colors.primary, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
    actionBtnText: { color: colors.white, fontWeight: '800', fontSize: 12 },
    danger: { color: colors.error, fontWeight: '900', fontSize: 13 },
    empty: { paddingHorizontal: 16, paddingVertical: 10, color: colors.textSecondary },
});
