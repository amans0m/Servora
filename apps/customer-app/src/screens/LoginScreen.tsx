import React, { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, useTheme } from '@servora/mobile-shared';

import type { AuthScreenProps } from '../navigation/types';
import { useLogin } from '../features/auth';
import { fieldStyle } from '../components/field';

export function LoginScreen({ navigation }: AuthScreenProps<'Login'>) {
  const t = useTheme();
  const login = useLogin();
  const [email, setEmail] = useState('ops@acme.example');
  const [password, setPassword] = useState('Servora@123');
  const field = fieldStyle(t);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <View style={{ flex: 1, padding: 24, justifyContent: 'center', gap: 14 }}>
        <Text style={{ color: t.colors.primary, fontSize: 32, fontWeight: '800' }}>Servora</Text>
        <Text style={{ color: t.colors.muted, marginBottom: 8 }}>Sign in to your business account</Text>

        <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor={t.colors.muted} autoCapitalize="none" keyboardType="email-address" style={field} />
        <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor={t.colors.muted} secureTextEntry style={field} />

        {login.isError ? <Text style={{ color: t.colors.danger }}>Sign in failed. Check your details.</Text> : null}

        <Button title="Sign in" block loading={login.isPending} onPress={() => login.mutate({ email, password })} />
        <Button title="Continue with Google" variant="ghost" block onPress={() => login.mutate({ email, password })} />
        <View style={{ height: 8 }} />
        <Button title="Create a business account" variant="ghost" block onPress={() => navigation.navigate('Register')} />
        <Button title="View design system" variant="ghost" block onPress={() => navigation.navigate('DesignSystem')} />
      </View>
    </SafeAreaView>
  );
}
