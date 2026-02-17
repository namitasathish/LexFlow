import React, { useEffect, useState, useCallback } from 'react';
import {
    View, Text, FlatList, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, Linking,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

const INTERACTION_TYPES = [
    { key: 'call', icon: '📞', label: 'Call' },
    { key: 'email', icon: '📧', label: 'Email' },
    { key: 'meeting', icon: '🤝', label: 'Meeting' },
    { key: 'note', icon: '📝', label: 'Note' },
];

export default function ClientDetailScreen() {
    const navigation = useNavigation();
    const route = useRoute();
    const clientId = route.params?.clientId;

    const {
        clients, cases, clientsById, updateClient, deleteClient,
        addInteraction, getClientInteractions, markFollowUpDone,
    } = useApp();

    const client = clientsById.get(clientId) || null;
    const linkedCases = cases.filter((c) => c.client_id === clientId);

    const [interactions, setInteractions] = useState([]);
    const [showForm, setShowForm] = useState(false);
    const [draft, setDraft] = useState({ type: 'note', summary: '', follow_up_date: '' });
    const [editingInfo, setEditingInfo] = useState(false);
    const [editDraft, setEditDraft] = useState({ name: '', phone: '', email: '', address: '' });

    const loadInteractions = useCallback(async () => {
        if (!clientId) return;
        const rows = await getClientInteractions(clientId);
        setInteractions(rows);
    }, [clientId, getClientInteractions]);

    useEffect(() => {
        loadInteractions();
    }, [loadInteractions]);

    useEffect(() => {
        if (client) {
            setEditDraft({ name: client.name || '', phone: client.phone || '', email: client.email || '', address: client.address || '' });
        }
    }, [client]);

    if (!client) {
        return (
            <View style={styles.container}>
                <Text style={styles.empty}>Client not found.</Text>
            </View>
        );
    }

    const handleSaveInfo = async () => {
        if (!editDraft.name.trim()) return;
        await updateClient(clientId, editDraft);
        setEditingInfo(false);
    };

    const handleDelete = () => {
        const count = linkedCases.length;
        Alert.alert(
            'Delete Client',
            count ? `This client has ${count} linked case(s). Cases will remain but client link will be cleared.` : 'Delete this client?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Delete', style: 'destructive', onPress: async () => { await deleteClient(clientId); navigation.goBack(); } },
            ]
        );
    };

    const handleAddInteraction = async () => {
        if (!draft.summary.trim()) return;
        await addInteraction(clientId, draft);
        setDraft({ type: 'note', summary: '', follow_up_date: '' });
        setShowForm(false);
        await loadInteractions();
    };

    const handleFollowUpDone = async (id) => {
        await markFollowUpDone(id);
        await loadInteractions();
    };

    const pendingFollowUps = interactions.filter((i) => i.follow_up_date && !i.follow_up_done);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.h1} numberOfLines={1}>Client</Text>
                <TouchableOpacity onPress={() => setEditingInfo(!editingInfo)}>
                    <Text style={styles.link}>{editingInfo ? 'Cancel' : 'Edit'}</Text>
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Client Info */}
                {editingInfo ? (
                    <View style={styles.infoCard}>
                        <TextInput style={styles.input} value={editDraft.name} onChangeText={(t) => setEditDraft((d) => ({ ...d, name: t }))} placeholder="Name *" />
                        <TextInput style={styles.input} value={editDraft.phone} onChangeText={(t) => setEditDraft((d) => ({ ...d, phone: t }))} placeholder="Phone" keyboardType="phone-pad" />
                        <TextInput style={styles.input} value={editDraft.email} onChangeText={(t) => setEditDraft((d) => ({ ...d, email: t }))} placeholder="Email" autoCapitalize="none" />
                        <TextInput style={[styles.input, styles.textArea]} value={editDraft.address} onChangeText={(t) => setEditDraft((d) => ({ ...d, address: t }))} placeholder="Address" multiline />
                        <View style={styles.btnRow}>
                            <TouchableOpacity style={[styles.btn, styles.btnPrimary]} onPress={handleSaveInfo}>
                                <Text style={styles.btnTextWhite}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={[styles.btn, styles.btnDanger]} onPress={handleDelete}>
                                <Text style={styles.btnTextDanger}>Delete Client</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ) : (
                    <View style={styles.infoCard}>
                        <Text style={styles.clientName}>{client.name}</Text>
                        {!!client.phone && (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${client.phone}`)}>
                                <Text style={styles.infoLink}>📞 {client.phone}</Text>
                            </TouchableOpacity>
                        )}
                        {!!client.email && (
                            <TouchableOpacity onPress={() => Linking.openURL(`mailto:${client.email}`)}>
                                <Text style={styles.infoLink}>📧 {client.email}</Text>
                            </TouchableOpacity>
                        )}
                        {!!client.address && <Text style={styles.infoText}>📍 {client.address}</Text>}
                    </View>
                )}

                {/* Quick Actions */}
                <View style={styles.quickActions}>
                    {!!client.phone && (
                        <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL(`tel:${client.phone}`)}>
                            <Text style={styles.quickBtnText}>📞 Call</Text>
                        </TouchableOpacity>
                    )}
                    {!!client.email && (
                        <TouchableOpacity style={styles.quickBtn} onPress={() => Linking.openURL(`mailto:${client.email}`)}>
                            <Text style={styles.quickBtnText}>📧 Email</Text>
                        </TouchableOpacity>
                    )}
                    <TouchableOpacity style={styles.quickBtn} onPress={() => setShowForm(!showForm)}>
                        <Text style={styles.quickBtnText}>📝 Add Note</Text>
                    </TouchableOpacity>
                </View>

                {/* Pending Follow-ups */}
                {pendingFollowUps.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Pending Follow-ups</Text>
                        {pendingFollowUps.map((fu) => (
                            <View key={fu.id} style={styles.followUpCard}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.followUpDate}>Due: {fu.follow_up_date?.slice(0, 10)}</Text>
                                    <Text style={styles.followUpSummary}>{fu.summary}</Text>
                                </View>
                                <TouchableOpacity onPress={() => handleFollowUpDone(fu.id)} style={styles.doneBtn}>
                                    <Text style={styles.doneBtnText}>Done</Text>
                                </TouchableOpacity>
                            </View>
                        ))}
                    </View>
                )}

                {/* Linked Cases */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Linked Cases ({linkedCases.length})</Text>
                    {linkedCases.length === 0 ? (
                        <Text style={styles.emptySmall}>No cases linked.</Text>
                    ) : (
                        linkedCases.map((c) => (
                            <TouchableOpacity key={c.id} style={styles.caseCard} onPress={() => navigation.navigate('Case Detail', { caseId: c.id })}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.caseName} numberOfLines={1}>{c.case_title}</Text>
                                    {!!c.court_name && <Text style={styles.caseMeta}>{c.court_name}</Text>}
                                </View>
                                <View style={[styles.statusPill, c.status === 'Open' ? styles.statusOpen : c.status === 'Closed' ? styles.statusClosed : styles.statusOther]}>
                                    <Text style={styles.statusText}>{c.status}</Text>
                                </View>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                {/* Add Interaction Form */}
                {showForm && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Log Interaction</Text>
                        <View style={styles.typePills}>
                            {INTERACTION_TYPES.map((t) => (
                                <TouchableOpacity key={t.key} style={[styles.typePill, draft.type === t.key ? styles.typePillOn : null]} onPress={() => setDraft((d) => ({ ...d, type: t.key }))}>
                                    <Text style={[styles.typePillText, draft.type === t.key ? styles.typePillTextOn : null]}>{t.icon} {t.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput style={[styles.input, styles.textArea]} value={draft.summary} onChangeText={(t) => setDraft((d) => ({ ...d, summary: t }))} placeholder="Summary *" multiline />
                        <TextInput style={styles.input} value={draft.follow_up_date} onChangeText={(t) => setDraft((d) => ({ ...d, follow_up_date: t }))} placeholder="Follow-up date (YYYY-MM-DD, optional)" />
                        <TouchableOpacity style={[styles.btn, styles.btnPrimary, !draft.summary.trim() ? styles.btnDisabled : null]} onPress={handleAddInteraction} disabled={!draft.summary.trim()}>
                            <Text style={styles.btnTextWhite}>Save Interaction</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Contact History Timeline */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Contact History ({interactions.length})</Text>
                    {interactions.length === 0 ? (
                        <Text style={styles.emptySmall}>No interactions logged yet.</Text>
                    ) : (
                        interactions.map((i) => {
                            const typeInfo = INTERACTION_TYPES.find((t) => t.key === i.type) || INTERACTION_TYPES[3];
                            return (
                                <View key={i.id} style={styles.timelineItem}>
                                    <View style={styles.timelineDot}>
                                        <Text style={styles.timelineIcon}>{typeInfo.icon}</Text>
                                    </View>
                                    <View style={styles.timelineContent}>
                                        <Text style={styles.timelineType}>{typeInfo.label} · {(i.interaction_date || i.created_at)?.slice(0, 10)}</Text>
                                        <Text style={styles.timelineSummary}>{i.summary}</Text>
                                        {i.follow_up_date && (
                                            <Text style={[styles.timelineFollowUp, i.follow_up_done ? styles.followUpDone : null]}>
                                                Follow-up: {i.follow_up_date.slice(0, 10)} {i.follow_up_done ? '✅' : '⏳'}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            );
                        })
                    )}
                </View>
            </ScrollView>
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
    link: { color: colors.primary, fontWeight: '900', width: 60 },
    content: { padding: 16, paddingBottom: 40 },

    infoCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 16, marginBottom: 12 },
    clientName: { fontSize: 20, fontWeight: '900', color: colors.text, marginBottom: 8 },
    infoLink: { color: colors.primary, fontWeight: '700', marginTop: 4, fontSize: 15 },
    infoText: { color: colors.text, marginTop: 4, fontSize: 15 },

    quickActions: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    quickBtn: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
    quickBtnText: { fontWeight: '800', color: colors.text },

    section: { marginBottom: 16 },
    sectionTitle: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
    emptySmall: { color: colors.textSecondary, paddingVertical: 8 },

    followUpCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#fef9c3',
        borderWidth: 1, borderColor: '#fbbf24', borderRadius: 10, padding: 12, marginBottom: 6,
    },
    followUpDate: { fontWeight: '900', color: colors.text, fontSize: 13 },
    followUpSummary: { color: colors.text, marginTop: 2, fontSize: 13 },
    doneBtn: { backgroundColor: colors.success, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
    doneBtnText: { color: colors.white, fontWeight: '900', fontSize: 12 },

    caseCard: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface,
        borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginBottom: 6,
    },
    caseName: { fontWeight: '800', color: colors.text, flex: 1 },
    caseMeta: { color: colors.textSecondary, fontSize: 12, marginTop: 2 },
    statusPill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 },
    statusOpen: { backgroundColor: '#dbeafe' },
    statusClosed: { backgroundColor: '#dcfce7' },
    statusOther: { backgroundColor: '#f3f4f6' },
    statusText: { fontSize: 11, fontWeight: '800', color: colors.text },

    typePills: { flexDirection: 'row', gap: 8, marginBottom: 10, flexWrap: 'wrap' },
    typePill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
    typePillOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    typePillText: { fontWeight: '700', color: colors.text },
    typePillTextOn: { color: colors.white },

    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text, marginBottom: 8 },
    textArea: { minHeight: 70, textAlignVertical: 'top' },

    btnRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
    btn: { flex: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
    btnPrimary: { backgroundColor: colors.primary, borderColor: colors.primary },
    btnDanger: { borderColor: colors.error },
    btnDisabled: { opacity: 0.6 },
    btnTextWhite: { color: colors.white, fontWeight: '900' },
    btnTextDanger: { color: colors.error, fontWeight: '900' },

    timelineItem: { flexDirection: 'row', marginBottom: 10 },
    timelineDot: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
    timelineIcon: { fontSize: 16 },
    timelineContent: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 10 },
    timelineType: { fontWeight: '800', color: colors.textSecondary, fontSize: 12 },
    timelineSummary: { color: colors.text, marginTop: 3, fontSize: 14 },
    timelineFollowUp: { marginTop: 4, fontSize: 12, fontWeight: '700', color: colors.warning },
    followUpDone: { color: colors.success },

    empty: { padding: 24, textAlign: 'center', color: colors.textSecondary },
});
