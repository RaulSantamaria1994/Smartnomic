import { TIMEZONE_HEADER } from '@smartnomic/api';
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
import { MIN_PASSWORD_LENGTH } from '../../src/session/password';

export default function SignUp() {
  const next = safeNext(useLocalSearchParams<{ next?: string }>().next);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!name.trim()) return setError(es.auth.validation.nameRequired);
    if (!email.trim()) return setError(es.auth.validation.emailRequired);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(es.auth.validation.passwordTooShort);
    setLoading(true);
    const { error } = await authClient.signUp.email({
      name: name.trim(),
      email: email.trim(),
      password,
      // El hogar se crea con la zona horaria del dispositivo (RF-002).
      fetchOptions: {
        headers: { [TIMEZONE_HEADER]: Intl.DateTimeFormat().resolvedOptions().timeZone },
      },
    });
    setLoading(false);
    if (error) return setError(authErrorMessage(error));
    router.replace(next ?? '/');
  }

  return (
    <Screen brand title={es.auth.signUp.title}>
      <TextField
        label={es.auth.name}
        value={name}
        onChangeText={setName}
        autoComplete="name"
        textContentType="name"
      />
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
        hint={es.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      {error && <Message text={error} />}
      <Button label={es.auth.signUp.submit} onPress={submit} loading={loading} />
      <Button
        variant="link"
        label={es.auth.signUp.haveAccount}
        onPress={() => router.replace(next ? { pathname: '/entrar', params: { next } } : '/entrar')}
      />
    </Screen>
  );
}
