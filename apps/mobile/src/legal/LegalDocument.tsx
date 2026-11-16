import { StyleSheet, View } from 'react-native';
import { AppText } from '../design';
import { spacing } from '../design/tokens';
import type { LegalSection } from './privacy';

/** Apartados de un texto legal: título y párrafos, sin tarjetas (especificación 017). */
export function LegalDocument({ sections }: { sections: readonly LegalSection[] }) {
  return (
    <View style={styles.stack}>
      {sections.map((section) => (
        <View key={section.title} style={styles.block}>
          <AppText variant="heading">{section.title}</AppText>
          {section.paragraphs.map((paragraph) => (
            <AppText key={paragraph} variant="body">
              {paragraph}
            </AppText>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: spacing.lg },
  block: { gap: spacing.sm },
});
