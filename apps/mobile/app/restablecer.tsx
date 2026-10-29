import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Button } from '../src/components/Button';
import { Message } from '../src/components/Message';
import { Screen } from '../src/components/Screen';
import { TextField } from '../src/components/TextField';
import { es } from '../src/i18n/es';
import { authClient } from '../src/session/auth-client';
import { authErrorMessage } from '../src/session/auth-errors';
import { MIN_PASSWORD_LENGTH } from '../src/session/password';

/** Destino del enlace del email: `/restablecer?token=…` (o `?error=INVALID_TOKEN`). */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string; error?: string }>();
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const token = typeof params.token === 'string' ? params.token : undefined;
  const linkError = params.error
    ? es.auth.errors.invalidToken
    : !token
      ? es.auth.reset.missingToken
      : null;

  async function submit() {
    if (!token) return;
    setError(null);
    if (password.length < MIN_PASSWORD_LENGTH) return setError(es.auth.validation.passwordTooShort);
    if (password !== repeat) return setError(es.auth.validation.passwordsDontMatch);
    setLoading(true);
    const { error } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);
    if (error) return setError(authErrorMessage(error));
    setDone(true);
  }

  if (done) {
    return (
      <Screen brand title={es.auth.reset.title}>
        <Message kind="success" text={es.auth.reset.done} />
        <Button label={es.auth.reset.goToSignIn} onPress={() => router.replace('/entrar')} />
      </Screen>
    );
  }

  if (linkError) {
    return (
      <Screen brand title={es.auth.reset.title}>
        <Message text={linkError} />
        <Button label={es.auth.reset.requestNew} onPress={() => router.replace('/recuperar')} />
      </Screen>
    );
  }

  return (
    <Screen brand title={es.auth.reset.title}>
      <TextField
        label={es.auth.newPassword}
        hint={es.auth.passwordHint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
      />
      <TextField
        label={es.auth.repeatPassword}
        value={repeat}
        onChangeText={setRepeat}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        onSubmitEditing={submit}
      />
      {error && <Message text={error} />}
      <Button label={es.auth.reset.submit} onPress={submit} loading={loading} />
    </Screen>
  );
}
