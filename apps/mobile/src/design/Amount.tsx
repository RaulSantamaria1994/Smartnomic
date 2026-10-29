import type { Cents } from '@smartnomic/domain';
import { formatMoney, formatSignedMoney } from '../format';
import { AppText } from './Text';
import { color, type TypographyVariant } from './tokens';

/**
 * Importe con cifras tabulares. Con `kind` lleva signo (+/−) y los ingresos van en verde:
 * el signo hace que no dependa solo del color.
 */
export function Amount({
  cents,
  kind,
  variant = 'amount',
  muted,
  strike,
}: {
  cents: Cents;
  kind?: 'income' | 'expense';
  variant?: TypographyVariant;
  muted?: boolean;
  strike?: boolean;
}) {
  const text = kind ? formatSignedMoney(cents, kind) : formatMoney(cents);
  const tone = muted
    ? color.text.muted
    : kind === 'income'
      ? color.amount.income
      : color.amount.expense;
  return (
    <AppText
      variant={variant}
      tabular
      style={[{ color: tone }, strike && { textDecorationLine: 'line-through' }]}
      numberOfLines={1}
    >
      {text}
    </AppText>
  );
}
