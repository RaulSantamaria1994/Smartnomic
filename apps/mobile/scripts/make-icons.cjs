/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Genera el icono, el icono adaptativo, la pantalla de carga, el favicon y el icono de
 * notificación de Smartnomic a partir de un dibujo vectorial (especificación 003, D018).
 * Usa Chromium con Playwright para pasar el SVG a PNG:
 *
 *   node apps/mobile/scripts/make-icons.cjs
 *
 * Los colores son los de los tokens «Calma» (src/design/tokens.ts).
 */
const { chromium } = require('playwright');
const path = require('node:path');

const PINE = '#0E5A4C';
const HONEY = '#F3C77A';
const WHITE = '#FFFFFF';
const OUT = path.join(__dirname, '..', 'assets');

/** La casa y la moneda, en un lienzo de 1024 × 1024 con el dibujo en el 50 % central. */
function mark({ stroke = WHITE, coin = HONEY, scale = 1 } = {}) {
  const t = `translate(512 512) scale(${scale}) translate(-512 -512)`;
  return `
    <g transform="${t}" fill="none" stroke="${stroke}" stroke-width="76" stroke-linecap="round" stroke-linejoin="round">
      <path d="M262 500 L512 286 L762 500" />
      <path d="M340 446 V752 H684 V446" />
      ${coin ? `<circle cx="512" cy="604" r="82" fill="${coin}" stroke="none" />` : `<circle cx="512" cy="604" r="56" fill="${stroke}" stroke="none" />`}
    </g>`;
}

const svg = (body, background) => `
  <svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
    ${background ? `<rect width="1024" height="1024" fill="${background}" />` : ''}
    ${body}
  </svg>`;

const ASSETS = [
  // Icono principal: a sangre; Android y la web le ponen la máscara.
  { file: 'icon.png', size: 1024, svg: svg(mark(), PINE) },
  // Icono adaptativo: solo el dibujo, dentro de la zona segura (66 %).
  { file: 'adaptive-icon.png', size: 1024, svg: svg(mark({ scale: 0.78 })) },
  // Pantalla de carga: el dibujo sobre transparente; el fondo pino lo pone app.json.
  { file: 'splash-icon.png', size: 1024, svg: svg(mark()) },
  // Favicon con esquinas redondeadas.
  {
    file: 'favicon.png',
    size: 196,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
      <rect width="1024" height="1024" rx="224" fill="${PINE}" />${mark()}</svg>`,
  },
  // Icono de notificación de Android: silueta blanca sobre transparente.
  { file: 'notification-icon.png', size: 96, svg: svg(mark({ coin: null, scale: 1.25 })) },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  for (const asset of ASSETS) {
    await page.setViewportSize({ width: asset.size, height: asset.size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent">
        <div style="width:${asset.size}px;height:${asset.size}px">${asset.svg.replace('width="1024" height="1024"', `width="${asset.size}" height="${asset.size}"`)}</div>
      </body></html>`,
    );
    await page
      .locator('div')
      .screenshot({ path: path.join(OUT, asset.file), omitBackground: true });
    console.log(`assets/${asset.file} (${asset.size} px)`);
  }
  await browser.close();
})();
