/* eslint-disable @typescript-eslint/no-require-imports */
/* global Image, document -- el código de page.evaluate se ejecuta en Chromium */
/**
 * Genera el icono, el icono adaptativo, la pantalla de carga, el favicon y el icono de
 * notificación de Smartnomic a partir de la imagen original del icono
 * (`assets/source/icon.jpg`). Usa Chromium con Playwright:
 *
 *   node apps/mobile/scripts/make-icons.cjs
 *
 * Del original se toma solo el dibujo (la casa, la moneda y la campana): se quita el fondo
 * crema y se vuelve a componer en cada tamaño, así el icono va a sangre y Android le pone
 * su propia máscara.
 */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SOURCE = path.join(ASSETS, 'source', 'icon.jpg');
/** Fondo crema del original; también el de la pantalla de carga e icono adaptativo (app.json). */
const CREAM = [242, 241, 236];
/** Recuadro del dibujo dentro del original de 2000 × 2000 px, con un poco de margen. */
const DRAWING = { x: 420, y: 485, width: 1160, height: 1015 };

/**
 * Cada recurso: tamaño, fondo, qué parte del ancho ocupa el dibujo y si va en silueta
 * blanca. El icono adaptativo deja el dibujo dentro de la zona segura (círculo del 66 %).
 */
const OUTPUTS = [
  { file: 'icon.png', size: 1024, background: 'cream', width: 0.7 },
  { file: 'adaptive-icon.png', size: 1024, background: null, width: 0.5 },
  { file: 'splash-icon.png', size: 1024, background: null, width: 0.9 },
  { file: 'favicon.png', size: 196, background: 'rounded', width: 0.74 },
  { file: 'notification-icon.png', size: 96, background: null, width: 0.9, silhouette: true },
];

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const source = `data:image/jpeg;base64,${fs.readFileSync(SOURCE).toString('base64')}`;
  const images = await page.evaluate(
    async ({ source, CREAM, DRAWING, OUTPUTS }) => {
      const img = new Image();
      img.src = source;
      await img.decode();

      // El dibujo sin el fondo: «color a transparencia» respecto al crema.
      const drawing = document.createElement('canvas');
      drawing.width = DRAWING.width;
      drawing.height = DRAWING.height;
      const dg = drawing.getContext('2d');
      dg.drawImage(img, -DRAWING.x, -DRAWING.y);
      const pixels = dg.getImageData(0, 0, drawing.width, drawing.height);
      const d = pixels.data;
      for (let i = 0; i < d.length; i += 4) {
        let alpha = 0;
        for (let c = 0; c < 3; c++) {
          const v = d[i + c];
          const bg = CREAM[c];
          alpha = Math.max(alpha, v > bg ? (v - bg) / (255 - bg) : (bg - v) / bg);
        }
        // El ruido del JPEG alrededor de los trazos no cuenta como dibujo.
        alpha = alpha < 0.08 ? 0 : Math.min(1, (alpha - 0.08) / 0.92);
        if (alpha > 0) {
          for (let c = 0; c < 3; c++) {
            const value = (d[i + c] - CREAM[c]) / alpha + CREAM[c];
            d[i + c] = Math.max(0, Math.min(255, Math.round(value)));
          }
        }
        d[i + 3] = Math.round(alpha * 255);
      }
      dg.putImageData(pixels, 0, 0);

      const cream = `rgb(${CREAM.join(',')})`;
      return OUTPUTS.map((out) => {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = out.size;
        const g = canvas.getContext('2d');
        g.imageSmoothingQuality = 'high';
        if (out.background === 'cream') {
          g.fillStyle = cream;
          g.fillRect(0, 0, out.size, out.size);
        } else if (out.background === 'rounded') {
          g.fillStyle = cream;
          g.beginPath();
          g.roundRect(0, 0, out.size, out.size, out.size * 0.22);
          g.fill();
        }
        const w = out.size * out.width;
        const h = (w * drawing.height) / drawing.width;
        let layer = drawing;
        if (out.silhouette) {
          layer = document.createElement('canvas');
          layer.width = drawing.width;
          layer.height = drawing.height;
          // Blanco opaco: la moneda y la campana, claras sobre el crema, también cuentan.
          const lg = layer.getContext('2d');
          const shape = dg.getImageData(0, 0, drawing.width, drawing.height);
          for (let i = 0; i < shape.data.length; i += 4) {
            shape.data[i] = shape.data[i + 1] = shape.data[i + 2] = 255;
            shape.data[i + 3] = Math.min(255, shape.data[i + 3] * 4);
          }
          lg.putImageData(shape, 0, 0);
        }
        g.drawImage(layer, (out.size - w) / 2, (out.size - h) / 2, w, h);
        return { file: out.file, size: out.size, png: canvas.toDataURL('image/png') };
      });
    },
    { source, CREAM, DRAWING, OUTPUTS },
  );
  for (const { file, size, png } of images) {
    fs.writeFileSync(path.join(ASSETS, file), Buffer.from(png.split(',')[1], 'base64'));
    console.log(`assets/${file} (${size} px)`);
  }
  await browser.close();
})();
