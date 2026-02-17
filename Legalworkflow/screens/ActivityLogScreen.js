import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

const ENTITY_ICONS = {
    case: '📋',
    task: '✅',
    client: '👤',
    document: '📄',
    interaction: '💬',
};

const ACTION_COLORS = {
    created: colors.success,
    updated: colors.primary,
    completed: colors.success,
    reopened: colors.warning,
    closed: colors.textSecondary,
    deleted: colors.error,
    follow_up_done: colors.success,
};

export default function ActivityLogScreen() {
    const navigation = useNavigation();
    const { getActivityLog } = useApp();
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');

    useEffect(() => {
        (async () => {
            const rows = await getActivityLog(200);
            setLogs(rows);
            setLoading(false);
        })();
    }, [getActivityLog]);

    const filtered = useMemo(() => {
        if (filter === 'all') return logs;
        return logs.filter((l) => l.entity_type === filter);
    }, [logs, filter]);

    const formatTime = (ts) => {
        if (!ts) return '';
        const d = new Date(ts);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        const diffHrs = Math.floor(diffMins / 60);
        if (diffHrs < 24) return `${diffHrs}h ago`;
        const diffDays = Math.floor(diffHrs / 24);
        if (diffDays < 7) return `${diffDays}d ago`;
        return ts.slice(0, 10);
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.link}>Back</Text>
                </TouchableOpacity>
                <Text style={styles.h1}>Activity Log</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Filter pills */}
            <View style={styles.filters}>
                {[
                    { key: 'all', label: 'All' },
                    { key: 'case', label: '📋 Cases' },
                    { key: 'task', label: '✅ Tasks' },
                    { key: 'client', label: '👤 Clients' },
                    { key: 'document', label: '📄 Docs' },
                ].map((f) => (
                    <TouchableOpacity key={f.key} style={[styles.filterPill, filter === f.key ? styles.filterOn : null]} onPress={() => setFilter(f.key)}>
                        <Text style={[styles.filterText, filter === f.key ? styles.filterTextOn : null]}>{f.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            {loading ? (
                <Text style={styles.empty}>Loading...</Text>
            ) : (
                <FlatList
                    data={filtered}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingBottom: 24 }}
                    renderItem={({ item }) => (
                        <View style={styles.logItem}>
                            <View style={styles.logIcon}>
                                <Text style={styles.logIconText}>{ENTITY_ICONS[item.entity_type] || '📌'}</Text>
                            </View>
                            <View style={styles.logContent}>
                                <Text style={styles.logDesc}>{item.description}</Text>
                                <View style={styles.logMeta}>
                                    <View style={[styles.actionBadge, { backgroundColor: (ACTION_COLORS[item.action] || colors.textSecondary) + '20' }]}>
                                        <Text style={[styles.actionText, { color: ACTION_COLORS[item.action] || colors.textSecondary }]}>{item.action}</Text>
                                    </View>
                                    <Text style={styles.logTime}>{formatTime(item.timestamp)}</Text>
                                </View>
                            </View>
                        </View>
                    )}
                    ListEmptyComponent={<Text style={styles.empty}>No activity yet.</Text>}
                />
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
    filters: { flexDirection: 'row', gap: 8, padding: 16, flexWrap: 'wrap' },
    filterPill: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: colors.surface },
    filterOn: { backgroundColor: colors.primary, borderColor: colors.primary },
    filterText: { fontWeight: '700', color: colors.text, fontSize: 13 },
    filterTextOn: { color: colors.white },
    logItem: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8 },
    logIcon: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border,
        alignItems: 'center', justifyContent: 'center', marginRight: 10,
    },
    logIconText: { fontSize: 16 },
    logContent: { flex: 1 },
    logDesc: { color: colors.text, fontWeight: '600', fontSize: 14 },
    logMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    actionBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    actionText: { fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
    logTime: { color: colors.textSecondary, fontSize: 12, fontWeight: '600' },
    empty: { padding: 16, color: colors.textSecondary },
});
