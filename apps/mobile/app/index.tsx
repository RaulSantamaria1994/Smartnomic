import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { fetchHealth } from '../src/api/health';
import { API_URL } from '../src/config';
import { es } from '../src/i18n/es';

type Status = 'checking' | 'ok' | 'error';

export default function Home() {
  const [status, setStatus] = useState<Status>('checking');

  const check = useCallback(() => {
    setStatus('checking');
    fetchHealth()
      .then(() => setStatus('ok'))
      .catch(() => setStatus('error'));
  }, []);

  useEffect(check, [check]);

  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        {es.appName}
      </Text>
      <Text style={styles.status} accessibilityLiveRegion="polite">
        {es.health[status]}
      </Text>
      <Text style={styles.url}>{API_URL || '/'}</Text>
      {status === 'error' && (
        <Pressable onPress={check} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>{es.health.retry}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, padding: 16 },
  title: { fontSize: 28, fontWeight: '700' },
  status: { fontSize: 18 },
  url: { fontSize: 14, opacity: 0.6 },
  button: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  buttonText: { fontSize: 16 },
});
