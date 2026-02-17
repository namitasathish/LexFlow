import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getDb } from '../database/db';
import { colors } from '../constants/colors';

export default function FirBuilderScreen() {
  const navigation = useNavigation();
  const [form, setForm] = useState({
    complainantName: '',
    complainantAddress: '',
    accusedName: '',
    incidentDate: '',
    incidentPlace: '',
    policeStation: '',
    summary: '',
    sections: '',
  });
  const [firText, setFirText] = useState('');

  const onChange = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const buildFirText = () => {
    const {
      complainantName,
      complainantAddress,
      accusedName,
      incidentDate,
      incidentPlace,
      policeStation,
      summary,
      sections,
    } = form;

    return (
      `To,\n` +
      `The Station House Officer,\n` +
      `${policeStation || '________________'} Police Station.\n\n` +
      `Subject: First Information Report under ${sections || 'relevant sections'}.\n\n` +
      `Sir/Madam,\n\n` +
      `I, ${complainantName || '________________'}, residing at ${complainantAddress || '________________'}, ` +
      `wish to lodge the following information regarding the commission of a cognizable offence.\n\n` +
      `1. Name of accused: ${accusedName || '________________'}\n` +
      `2. Date of occurrence: ${incidentDate || '________________'}\n` +
      `3. Place of occurrence: ${incidentPlace || '________________'}\n` +
      `4. Brief facts of the incident:\n${summary || '________________'}\n\n` +
      `I request you to kindly register an FIR and investigate the matter in accordance with law.\n\n` +
      `Place: ${incidentPlace || '________________'}\n` +
      `Date: ${incidentDate || '________________'}\n\n` +
      `Signature of Complainant\n` +
      `${complainantName || '________________'}\n`
    );
  };

  const handleGenerate = async () => {
    const text = buildFirText();
    setFirText(text);
    const db = await getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      'INSERT INTO firs (id, case_id, data, created_at) VALUES (?, ?, ?, ?)',
      [`fir_${Date.now()}`, null, text, now]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.link}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.h1}>FIR Builder</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.label}>Complainant Name</Text>
        <TextInput style={styles.input} value={form.complainantName} onChangeText={(t) => onChange('complainantName', t)} />

        <Text style={styles.label}>Complainant Address</Text>
        <TextInput style={[styles.input, styles.textArea]} value={form.complainantAddress} onChangeText={(t) => onChange('complainantAddress', t)} multiline />

        <Text style={styles.label}>Accused Name</Text>
        <TextInput style={styles.input} value={form.accusedName} onChangeText={(t) => onChange('accusedName', t)} />

        <Text style={styles.label}>Incident Date (YYYY-MM-DD)</Text>
        <TextInput style={styles.input} value={form.incidentDate} onChangeText={(t) => onChange('incidentDate', t)} />

        <Text style={styles.label}>Incident Place</Text>
        <TextInput style={styles.input} value={form.incidentPlace} onChangeText={(t) => onChange('incidentPlace', t)} />

        <Text style={styles.label}>Police Station</Text>
        <TextInput style={styles.input} value={form.policeStation} onChangeText={(t) => onChange('policeStation', t)} />

        <Text style={styles.label}>Relevant Sections (e.g. IPC 420)</Text>
        <TextInput style={styles.input} value={form.sections} onChangeText={(t) => onChange('sections', t)} />

        <Text style={styles.label}>Incident Summary</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          value={form.summary}
          onChangeText={(t) => onChange('summary', t)}
          multiline
        />

        <TouchableOpacity style={styles.btn} onPress={handleGenerate}>
          <Text style={styles.btnText}>Generate FIR Text</Text>
        </TouchableOpacity>

        {firText ? (
          <>
            <Text style={styles.label}>Generated FIR</Text>
            <View style={styles.firBox}>
              <Text style={styles.firText}>{firText}</Text>
            </View>
            <Text style={styles.hint}>
              You can copy this text and paste into official templates or export flows as needed.
            </Text>
          </>
        ) : null}
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
  h1: { fontSize: 16, fontWeight: '900', color: colors.text },
  link: { color: colors.primary, fontWeight: '900' },
  content: { padding: 16, paddingBottom: 40 },
  label: { marginTop: 12, marginBottom: 4, fontWeight: '800', color: colors.textSecondary, fontSize: 12, textTransform: 'uppercase' },
  input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.text },
  textArea: { minHeight: 80, textAlignVertical: 'top' },
  btn: { marginTop: 18, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  btnText: { color: colors.white, fontWeight: '900' },
  firBox: { marginTop: 12, borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, backgroundColor: colors.surface },
  firText: { color: colors.text, fontSize: 13, lineHeight: 18 },
  hint: { marginTop: 6, color: colors.textSecondary, fontSize: 12 },
});

