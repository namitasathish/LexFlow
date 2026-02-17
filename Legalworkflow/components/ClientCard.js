import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors } from '../constants/colors';

export default function ClientCard({ item, onPress }) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75}>
      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>
      {!!item.phone && <Text style={styles.meta}>Phone: {item.phone}</Text>}
      {!!item.email && <Text style={styles.meta}>Email: {item.email}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 16,
    marginVertical: 6,
  },
  name: { fontSize: 16, fontWeight: '700', color: colors.text },
  meta: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
});

