// Falla si hay una clave o un archivo secreto en lo que va a Git. Sin dependencias.
//   node scripts/check-secrets.mjs            archivos versionados (CI y `pnpm check`)
//   node scripts/check-secrets.mjs --staged   lo que entra en el commit (hook de pre-commit)
//   node scripts/check-secrets.mjs <archivos> esos archivos (para probarlo)
// Nunca imprime el valor encontrado: solo el archivo, la línea y el tipo.
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/** Cadenas que no deben estar en ningún archivo versionado. */
const PATTERNS = [
  ['clave de API de Google', /AIza[0-9A-Za-z_-]{35}/],
  ['clave privada', /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/],
  ['cuenta de servicio de Google', /"type"\s*:\s*"service_account"/],
  ['token de GitHub', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})/],
  ['clave de Brevo', /\bxkeysib-[A-Za-z0-9-]{20,}/],
  ['clave de acceso de AWS', /\bAKIA[0-9A-Z]{16}\b/],
  ['token de Slack', /\bxox[abprs]-[A-Za-z0-9-]{10,}/],
  [
    'URL de base de datos con contraseña',
    /postgres(?:ql)?:\/\/[^:@/\s]+:[^@\s]{3,}@(?!localhost\b|127\.0\.0\.1\b)[^\s/]+/,
  ],
];

/** Archivos que nunca deben versionarse, tengan lo que tengan dentro. */
const FORBIDDEN_FILES = [
  /(^|\/)google-services\.json$/,
  /(^|\/)GoogleService-Info\.plist$/,
  /-firebase-adminsdk-.*\.json$/,
  /\.(?:jks|keystore|p12|pfx|pem)$/,
  /(^|\/)\.env(?:\.(?!example$).+)?$/,
];

const IGNORED = [/(^|\/)pnpm-lock\.yaml$/, /(^|\/)scripts\/check-secrets\.mjs$/];

const git = (...args) =>
  execFileSync('git', args, { encoding: 'utf8', maxBuffer: 1 << 28 })
    .split('\n')
    .filter(Boolean);

const args = process.argv.slice(2);
const staged = args.includes('--staged');
const explicit = args.filter((arg) => !arg.startsWith('--'));

/** @type {{ name: string, read: () => string }[]} */
const files =
  explicit.length > 0
    ? explicit.map((name) => ({ name, read: () => readFileSync(name, 'utf8') }))
    : staged
      ? git('diff', '--cached', '--name-only', '--diff-filter=ACMR').map((name) => ({
          name,
          read: () =>
            execFileSync('git', ['show', `:${name}`], { encoding: 'utf8', maxBuffer: 1 << 28 }),
        }))
      : git('ls-files').map((name) => ({ name, read: () => readFileSync(name, 'utf8') }));

const problems = [];
for (const { name, read } of files) {
  const normalized = name.split(path.sep).join('/');
  if (IGNORED.some((rule) => rule.test(normalized))) continue;
  if (FORBIDDEN_FILES.some((rule) => rule.test(normalized))) {
    problems.push(`${normalized}: archivo que no debe versionarse`);
    continue;
  }
  let text;
  try {
    text = read();
  } catch {
    continue; // borrado o ilegible
  }
  if (text.includes('\0')) continue; // binario
  text.split('\n').forEach((line, index) => {
    for (const [label, pattern] of PATTERNS) {
      if (pattern.test(line)) problems.push(`${normalized}:${index + 1}: ${label}`);
    }
  });
}

if (problems.length > 0) {
  console.error('Posibles secretos en lo que va a Git (no se muestra su valor):');
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(
    'Quítalos, guárdalos como secretos (EAS, Railway, GitHub) y, si ya se subieron, rota la clave.',
  );
  process.exit(1);
}
console.log(`Sin secretos en ${files.length} archivos.`);
