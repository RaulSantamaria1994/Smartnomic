import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { es } from '../../src/i18n/es';
import { authClient } from '../../src/session/auth-client';
import { authErrorMessage } from '../../src/session/auth-errors';
import { safeNext } from '../../src/session/next';

export default function SignIn() {
  const next = safeNext(useLocalSearchParams<{ next?: string }>().next);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim()) return setError(es.auth.validation.emailRequired);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email: email.trim(), password });
    setLoading(false);
    if (error) return setError(authErrorMessage(error));
    router.replace(next ?? '/');
  }

  return (
    <Screen title={es.auth.signIn.title}>
      <TextField
        label={es.auth.email}
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        textContentType="emailAddress"
      />
      <TextField
        label={es.auth.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      {error && <Message text={error} />}
      <Button label={es.auth.signIn.submit} onPress={submit} loading={loading} />
      <Button
        variant="link"
        label={es.auth.signIn.forgot}
        onPress={() => router.push('/recuperar')}
      />
      <Button
        variant="link"
        label={es.auth.signIn.noAccount}
        onPress={() =>
          router.replace(next ? { pathname: '/registro', params: { next } } : '/registro')
        }
      />
    </Screen>
  );
}
