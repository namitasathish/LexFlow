import React, { useState } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform, ScrollView
} from 'react-native';
import { useApp } from '../context/AppContext';
import { colors } from '../constants/colors';

export default function RegisterScreen({ navigation }) {
    const { register } = useApp();
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleRegister = async () => {
        if (!name || !email || !password) {
            Alert.alert('Error', 'Please fill in all fields');
            return;
        }
        setLoading(true);
        const res = await register(name, email, password);
        setLoading(false);
        if (!res.success) {
            Alert.alert('Registration Failed', res.error);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <ScrollView contentContainerStyle={styles.scroll}>
                <View style={styles.header}>
                    <Text style={styles.emoji}>📝</Text>
                    <Text style={styles.title}>Join Legal Workflow</Text>
                    <Text style={styles.subtitle}>Create your lawyer profile</Text>
                </View>

                <View style={styles.form}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Adv. Namita Sathish"
                        value={name}
                        onChangeText={setName}
                        autoCapitalize="words"
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="lawyer@example.com"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />

                    <Text style={styles.label}>Password</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />

                    <TouchableOpacity
                        style={[styles.btn, loading && styles.btnDisabled]}
                        onPress={handleRegister}
                        disabled={loading}
                    >
                        <Text style={styles.btnText}>{loading ? 'Creating Account...' : 'Sign Up'}</Text>
                    </TouchableOpacity>

                    <View style={styles.footer}>
                        <Text style={styles.footerText}>Already have an account? </Text>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.link}>Login</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
    header: { alignItems: 'center', marginBottom: 40 },
    emoji: { fontSize: 60, marginBottom: 10 },
    title: { fontSize: 28, fontWeight: '900', color: colors.text, textAlign: 'center' },
    subtitle: { fontSize: 16, color: colors.textSecondary, fontWeight: '600' },
    form: { backgroundColor: colors.surface, padding: 20, borderRadius: 16, elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8 },
    label: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
        borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 16, color: colors.text, backgroundColor: colors.background
    },
    btn: { backgroundColor: colors.primary, borderRadius: 10, padding: 16, alignItems: 'center', marginTop: 24 },
    btnDisabled: { opacity: 0.6 },
    btnText: { color: colors.white, fontWeight: '800', fontSize: 16 },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
    footerText: { color: colors.textSecondary, fontSize: 14 },
    link: { color: colors.primary, fontWeight: '800', fontSize: 14 },
});
