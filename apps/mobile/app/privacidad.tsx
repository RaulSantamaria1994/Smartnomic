import { Screen } from '../src/components/Screen';
import { LegalDocument } from '../src/legal/LegalDocument';
import { PRIVACY_SECTIONS } from '../src/legal/privacy';
import { es } from '../src/i18n/es';

/** Pública: Play Console y quien no tiene la app (especificación 017, RF-1701). */
export default function Privacidad() {
  return (
    <Screen title={es.legal.privacyTitle} back align="top">
      <LegalDocument sections={PRIVACY_SECTIONS} />
    </Screen>
  );
}
