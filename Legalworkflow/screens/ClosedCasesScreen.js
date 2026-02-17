import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

export default function ClosedCasesScreen() {
    const navigation = useNavigation();
    const { getClosedCaseStats, clientsById } = useApp();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            const s = await getClosedCaseStats();
            setStats(s);
            setLoading(false);
        })();
    }, [getClosedCaseStats]);

    const courtEntries = useMemo(() => {
        if (!stats?.byCourt) return [];
        return Object.entries(stats.byCourt)
            .map(([court, data]) => ({ court, ...data }))
            .sort((a, b) => b.count - a.count);
    }, [stats]);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.h1}>Closed Cases & Insights</Text>
                <View style={{ width: 40 }} />
            </View>

            {loading ? (
                <Text style={styles.empty}>Loading...</Text>
            ) : (
                <>
                    {/* Stats Summary */}
                    <View style={styles.statsRow}>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats?.totalClosed || 0}</Text>
                            <Text style={styles.statLabel}>Total Closed</Text>
                        </View>
                        <View style={styles.statCard}>
                            <Text style={styles.statNumber}>{stats?.avgDuration || 0}</Text>
                            <Text style={styles.statLabel}>Avg. Days</Text>
                        </View>
                    </View>

                    {/* By Court */}
                    {courtEntries.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Duration by Court</Text>
                            {courtEntries.map((entry) => (
                                <View key={entry.court} style={styles.courtRow}>
                                    <Text style={styles.courtName} numberOfLines={1}>{entry.court}</Text>
                                    <Text style={styles.courtStat}>{entry.count} cases · avg {entry.avgDays}d</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Case List */}
                    <Text style={styles.sectionTitlePad}>All Closed Cases</Text>
                    <FlatList
                        data={stats?.rows || []}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        renderItem={({ item }) => {
                            const clientName = item.client_id ? clientsById.get(item.client_id)?.name : '';
                            return (
                                <View style={styles.card}>
                                    <View style={styles.cardTop}>
                                        <Text style={styles.caseTitle} numberOfLines={1}>{item.case_title || 'Unknown Case'}</Text>
                                        {item.outcome ? (
                                            <View style={[styles.outcomePill, item.outcome === 'Won' ? styles.outcomeWon : item.outcome === 'Lost' ? styles.outcomeLost : styles.outcomeOther]}>
                                                <Text style={styles.outcomeText}>{item.outcome}</Text>
                                            </View>
                                        ) : null}
                                    </View>
                                    {!!item.court_name && <Text style={styles.meta}>Court: {item.court_name}</Text>}
                                    {!!clientName && <Text style={styles.meta}>Client: {clientName}</Text>}
                                    <Text style={styles.meta}>Duration: {item.duration_days} days</Text>
                                    {!!item.close_date && <Text style={styles.meta}>Closed: {item.close_date.slice(0, 10)}</Text>}
                                    {!!item.delay_notes && <Text style={styles.notes}>Notes: {item.delay_notes}</Text>}
                                </View>
                            );
                        }}
                        ListEmptyComponent={<Text style={styles.empty}>No closed cases yet.</Text>}
                    />
                </>
            )}
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
    statsRow: { flexDirection: 'row', padding: 16, gap: 12 },
    statCard: {
        flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        borderRadius: 12, padding: 16, alignItems: 'center',
    },
    statNumber: { fontSize: 28, fontWeight: '900', color: colors.primary },
    statLabel: { fontSize: 12, fontWeight: '700', color: colors.textSecondary, marginTop: 4 },
    section: { paddingHorizontal: 16, marginBottom: 8 },
    sectionTitle: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 8 },
    sectionTitlePad: { fontWeight: '900', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase', marginBottom: 8, paddingHorizontal: 16 },
    courtRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        borderRadius: 10, padding: 12, marginBottom: 6,
    },
    courtName: { flex: 1, fontWeight: '800', color: colors.text, marginRight: 8 },
    courtStat: { color: colors.textSecondary, fontWeight: '700', fontSize: 13 },
    card: {
        marginHorizontal: 16, marginBottom: 10, padding: 12,
        borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    caseTitle: { flex: 1, fontSize: 15, fontWeight: '900', color: colors.text, marginRight: 8 },
    outcomePill: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 },
    outcomeWon: { backgroundColor: '#dcfce7' },
    outcomeLost: { backgroundColor: '#fde8e8' },
    outcomeOther: { backgroundColor: '#fef9c3' },
    outcomeText: { fontSize: 11, fontWeight: '800' },
    meta: { color: colors.textSecondary, marginTop: 3, fontSize: 13 },
    notes: { color: colors.text, marginTop: 6, fontSize: 13, lineHeight: 18, fontStyle: 'italic' },
    empty: { padding: 16, color: colors.textSecondary },
});
