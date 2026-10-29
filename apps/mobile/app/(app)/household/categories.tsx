import type { Category } from '@smartnomic/api';
import type { TransactionKind } from '@smartnomic/domain';
import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { api, queryKeys } from '../../../src/api/client';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Message } from '../../../src/components/Message';
import { Screen } from '../../../src/components/Screen';
import { TextField } from '../../../src/components/TextField';
import { useCan, useCategories, useMe } from '../../../src/hooks/data';
import { es } from '../../../src/i18n/es';
import { colors, spacing } from '../../../src/theme';
import { CategoryIcon } from '../../../src/design/CategoryIcon';
import { categoryPalette, typography } from '../../../src/design/tokens';

/** Colores para elegir: con contraste suficiente sobre blanco (constitución, art. VIII). */
const PALETTE = categoryPalette;

type Feedback = { text: string; kind: 'error' | 'success' } | null;

/** Crear, renombrar, archivar y restaurar categorías (T093, RF-021). */
export default function Categories() {
  const queryClient = useQueryClient();
  const me = useMe();
  const householdId = me.data?.household.id;
  const categories = useCategories(householdId);
  const canWrite = useCan()('categories.write');
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🏷️');
  const [color, setColor] = useState<string>(PALETTE[0].value);
  const [editing, setEditing] = useState<{ id: string; name: string; icon: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  if (!householdId || !categories.data) {
    return (
      <Screen>
        <ActivityIndicator accessibilityLabel={es.common.loading} />
      </Screen>
    );
  }

  async function run(key: string, action: () => Promise<unknown>, success?: string) {
    setFeedback(null);
    setBusy(key);
    try {
      await action();
      await queryClient.invalidateQueries({ queryKey: queryKeys.categories(householdId!) });
      if (success) setFeedback({ text: success, kind: 'success' });
      return true;
    } catch (e) {
      setFeedback({ text: e instanceof Error ? e.message : es.auth.errors.unknown, kind: 'error' });
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function create() {
    if (!name.trim()) return setFeedback({ text: es.categories.nameError, kind: 'error' });
    const ok = await run(
      'create',
      () =>
        api.createCategory(householdId!, {
          kind,
          name: name.trim(),
          icon: icon.trim() || '🏷️',
          color,
        }),
      es.categories.created,
    );
    if (ok) setName('');
  }

  async function saveEdit() {
    if (!editing) return;
    if (!editing.name.trim()) return setFeedback({ text: es.categories.nameError, kind: 'error' });
    const ok = await run(`edit-${editing.id}`, () =>
      api.updateCategory(householdId!, editing.id, {
        name: editing.name.trim(),
        icon: editing.icon.trim() || '🏷️',
      }),
    );
    if (ok) setEditing(null);
  }

  const all = categories.data.categories;
  const active = (k: TransactionKind) => all.filter((c) => c.kind === k && !c.archived);
  const archived = all.filter((c) => c.archived);

  const row = (c: Category) =>
    editing?.id === c.id ? (
      <View key={c.id} style={styles.row}>
        <TextField
          label={es.categories.name}
          value={editing.name}
          onChangeText={(value) => setEditing({ ...editing, name: value })}
          maxLength={40}
        />
        <TextField
          label={es.categories.icon}
          value={editing.icon}
          onChangeText={(value) => setEditing({ ...editing, icon: value })}
          maxLength={16}
        />
        <View style={styles.actions}>
          <Button
            variant="link"
            label={es.categories.save}
            loading={busy === `edit-${c.id}`}
            onPress={() => void saveEdit()}
          />
          <Button variant="link" label={es.categories.cancel} onPress={() => setEditing(null)} />
        </View>
      </View>
    ) : (
      <View key={c.id} style={styles.row}>
        <View style={styles.rowMain}>
          <CategoryIcon icon={c.icon} tone={c.color} />
          <Text style={styles.name}>{c.name}</Text>
          {canWrite && (
            <View style={styles.actions}>
              {!c.archived && (
                <Button
                  variant="link"
                  label={es.categories.edit}
                  accessibilityLabel={`${es.categories.edit} ${c.name}`}
                  onPress={() => setEditing({ id: c.id, name: c.name, icon: c.icon })}
                />
              )}
              <Button
                variant="link"
                label={c.archived ? es.categories.restore : es.categories.archive}
                accessibilityLabel={`${c.archived ? es.categories.restore : es.categories.archive} ${c.name}`}
                loading={busy === `archive-${c.id}`}
                onPress={() =>
                  void run(`archive-${c.id}`, () =>
                    api.updateCategory(householdId, c.id, { archived: !c.archived }),
                  )
                }
              />
            </View>
          )}
        </View>
      </View>
    );

  return (
    <Screen title={es.categories.title}>
      {!canWrite && <Text style={styles.muted}>{es.categories.readOnly}</Text>}
      {feedback && <Message text={feedback.text} kind={feedback.kind} />}

      {canWrite && (
        <View style={styles.card}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {es.categories.newTitle}
          </Text>
          <View
            style={styles.chips}
            accessibilityRole="radiogroup"
            accessibilityLabel={es.categories.kind}
          >
            <Chip
              label={es.categories.expense}
              selected={kind === 'expense'}
              onPress={() => setKind('expense')}
            />
            <Chip
              label={es.categories.income}
              selected={kind === 'income'}
              onPress={() => setKind('income')}
            />
          </View>
          <TextField
            label={es.categories.name}
            value={name}
            onChangeText={setName}
            maxLength={40}
          />
          <TextField
            label={es.categories.icon}
            value={icon}
            onChangeText={setIcon}
            maxLength={16}
          />
          <Text style={styles.label}>{es.categories.color}</Text>
          <View
            style={styles.chips}
            accessibilityRole="radiogroup"
            accessibilityLabel={es.categories.color}
          >
            {PALETTE.map(({ value, name: colorName }) => (
              <Pressable
                key={value}
                onPress={() => setColor(value)}
                accessibilityRole="radio"
                accessibilityLabel={colorName}
                accessibilityState={{ selected: color === value, checked: color === value }}
                aria-checked={color === value}
                style={[
                  styles.colorDot,
                  { backgroundColor: value },
                  color === value && styles.colorSelected,
                ]}
              />
            ))}
          </View>
          <Button
            label={es.categories.create}
            onPress={() => void create()}
            loading={busy === 'create'}
          />
        </View>
      )}

      {(['expense', 'income'] as const).map((k) => (
        <View key={k} style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {k === 'expense' ? es.categories.expense : es.categories.income}
          </Text>
          <View style={styles.card}>{active(k).map(row)}</View>
        </View>
      ))}

      {archived.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle} accessibilityRole="header">
            {es.categories.archivedTitle}
          </Text>
          <Text style={styles.muted}>{es.categories.archivedHint}</Text>
          <View style={styles.card}>{archived.map(row)}</View>
        </View>
      )}

      <Button variant="link" label={es.settings.back} onPress={() => router.back()} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.heading, color: colors.text },
  label: { ...typography.body, color: colors.text },
  muted: { ...typography.body, color: colors.muted },
  card: {
    gap: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  row: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  rowMain: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 44 },
  icon: { ...typography.title, width: 32, textAlign: 'center' },
  swatch: { width: 12, height: 12, borderRadius: 6 },
  name: { ...typography.body, color: colors.text, flex: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', columnGap: spacing.md },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  colorDot: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, borderColor: 'transparent' },
  colorSelected: { borderColor: colors.text },
});
