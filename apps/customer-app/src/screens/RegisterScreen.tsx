import React, { useState } from 'react';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBar, Button, useTheme } from '@servora/mobile-shared';

import type { AuthScreenProps } from '../navigation/types';
import { useLogin } from '../features/auth';
import { fieldStyle } from '../components/field';

const GSTIN_RE = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export function RegisterScreen({ navigation }: AuthScreenProps<'Register'>) {
  const t = useTheme();
  const login = useLogin();
  const field = fieldStyle(t);
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gstin, setGstin] = useState('');

  const gstValid = gstin.length === 0 || GSTIN_RE.test(gstin.toUpperCase());
  const canSubmit = company.length > 1 && email.includes('@') && password.length >= 8 && gstValid;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <AppBar title="Create business account" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
        <Field label="Company name"><TextInput value={company} onChangeText={setCompany} placeholder="Acme Technologies Pvt Ltd" placeholderTextColor={t.colors.muted} style={field} /></Field>
        <Field label="Work email"><TextInput value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" placeholder="ops@acme.example" placeholderTextColor={t.colors.muted} style={field} /></Field>
        <Field label="Password"><TextInput value={password} onChangeText={setPassword} secureTextEntry placeholder="At least 8 characters" placeholderTextColor={t.colors.muted} style={field} /></Field>
        <Field label="GSTIN (verified at sign-up)">
          <TextInput value={gstin} onChangeText={(v) => setGstin(v.toUpperCase())} autoCapitalize="characters" placeholder="27AAACA1234A1Z5" placeholderTextColor={t.colors.muted} style={field} />
          {!gstValid ? <Text style={{ color: t.colors.danger, fontSize: 12, marginTop: 4 }}>Invalid GSTIN format</Text> : null}
          <Text style={{ color: t.colors.muted, fontSize: 12, marginTop: 4 }}>
            We verify your GSTIN with the government registry to auto-fill your legal name & address.
          </Text>
        </Field>

        <Button title="Create account" block disabled={!canSubmit} loading={login.isPending} onPress={() => login.mutate({ email, password })} />
      </ScrollView>
    </SafeAreaView>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <View style={{ gap: 6 }}>
        <Text style={{ color: t.colors.ink, fontWeight: '600', fontSize: 13 }}>{label}</Text>
        {children}
      </View>
    );
  }
}
