import { router } from 'expo-router';
import { useState } from 'react';
import { Text } from 'react-native';
import { Button } from '../../src/components/Button';
import { Message } from '../../src/components/Message';
import { Screen } from '../../src/components/Screen';
import { TextField } from '../../src/components/TextField';
import { es } from '../../src/i18n/es';
import { authClient, resetPasswordRedirect } from '../../src/session/auth-client';
import { authErrorMessage } from '../../src/session/auth-errors';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim()) return setError(es.auth.validation.emailRequired);
    setLoading(true);
    const { error } = await authClient.requestPasswordReset({
      email: email.trim(),
      redirectTo: resetPasswordRedirect(),
    });
    setLoading(false);
    if (error) return setError(authErrorMessage(error));
    // Siempre el mismo mensaje, exista o no la cuenta.
    setSent(true);
  }

  return (
    <Screen title={es.auth.forgot.title}>
      {sent ? (
        <Message kind="success" text={es.auth.forgot.sent} />
      ) : (
        <>
          <Text>{es.auth.forgot.explanation}</Text>
          <TextField
            label={es.auth.email}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            textContentType="emailAddress"
            onSubmitEditing={submit}
          />
          {error && <Message text={error} />}
          <Button label={es.auth.forgot.submit} onPress={submit} loading={loading} />
        </>
      )}
      <Button
        variant="link"
        label={es.auth.forgot.back}
        onPress={() => router.replace('/entrar')}
      />
    </Screen>
  );
}
