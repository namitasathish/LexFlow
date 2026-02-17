import React, { useEffect, useState, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDb } from '../database/db';
import { colors } from '../constants/colors';

export default function BareActsScreen() {
  const navigation = useNavigation();
  const [acts, setActs] = useState([]);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const db = await getDb();
      const rows = await db.getAllAsync('SELECT * FROM bare_acts ORDER BY act_title ASC, section ASC');
      setActs(rows ?? []);
    })();
  }, []);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return acts;
    return acts.filter((a) => {
      const title = (a.act_title || '').toLowerCase();
      const section = (a.section || '').toLowerCase();
      const content = (a.content || '').toLowerCase();
      return title.includes(query) || section.includes(query) || content.includes(query);
    });
  }, [acts, q]);

  const toggleBookmark = async (id) => {
    const next = acts.map((a) =>
      a.id === id ? { ...a, bookmarked: a.bookmarked ? 0 : 1 } : a
    );
    setActs(next);
    const db = await getDb();
    const act = next.find((a) => a.id === id);
    await db.runAsync('UPDATE bare_acts SET bookmarked = ? WHERE id = ?', [act.bookmarked ? 1 : 0, id]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>Bare Acts</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.searchWrap}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Search acts, sections, content"
          placeholderTextColor={colors.textSecondary}
          style={styles.search}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 24 }}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.title}>{item.act_title}</Text>
              <TouchableOpacity onPress={() => toggleBookmark(item.id)} style={styles.bookmarkBtn}>
                <Text style={[styles.bookmarkText, item.bookmarked ? styles.bookmarkOn : null]}>
                  {item.bookmarked ? '★' : '☆'}
                </Text>
              </TouchableOpacity>
            </View>
            {!!item.section && <Text style={styles.section}>{item.section}</Text>}
            <Text style={styles.content}>{item.content}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No bare acts seeded in this demo yet.</Text>
        }
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
  search: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  card: {
    marginHorizontal: 16,
    marginBottom: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: { fontSize: 15, fontWeight: '900', color: colors.text, flex: 1, marginRight: 8 },
  section: { marginTop: 4, fontWeight: '700', color: colors.textSecondary },
  content: { marginTop: 6, color: colors.text, fontSize: 13, lineHeight: 18 },
  bookmarkBtn: { paddingHorizontal: 4, paddingVertical: 4 },
  bookmarkText: { fontSize: 20, color: colors.textSecondary },
  bookmarkOn: { color: colors.warning },
  empty: { paddingHorizontal: 16, paddingVertical: 10, color: colors.textSecondary },
});

