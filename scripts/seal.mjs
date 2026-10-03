// Encrypts the private profile in secret/ into public/swipe-right/ so it can be published.
//
//   secret/pins.txt       one 4-digit PIN per line (any of them unlocks the page)
//   secret/profile.json   the profile content
//   secret/photos/*       photos referenced from profile.json
//
// secret/ is git-ignored and never leaves this machine; only ciphertext is written to public/.
//
// Scheme: a random content key encrypts the profile and every photo (AES-256-GCM). That key is
// then wrapped once per PIN with a key derived from the PIN (PBKDF2-SHA256), so the browser can
// unlock with any listed PIN without the PINs themselves ever being published.

import { mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const { subtle } = globalThis.crypto;
const rand = (n) => globalThis.crypto.getRandomValues(new Uint8Array(n));

const ROOT = resolve(fileURLToPath(import.meta.url), '../..');
const SECRET = join(ROOT, 'secret');
const OUT = join(ROOT, 'public', 'swipe-right');
const PHOTO_URL = '/swipe-right/p/'; // must match where OUT is served from
const ITERATIONS = 600_000;
const WEAK_PINS = new Set(['0000', '1111', '1234', '4321', '1212', '6969', '0007', '2580']);
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.avif': 'image/avif' };

const b64 = (bytes) => Buffer.from(bytes).toString('base64');
const hex = (bytes) => Buffer.from(bytes).toString('hex');

function fail(msg) {
  console.error(`\n  ✖ ${msg}\n`);
  process.exit(1);
}

async function readPins() {
  const file = join(SECRET, 'pins.txt');
  if (!existsSync(file)) fail('secret/pins.txt not found. Create it with one 4-digit PIN per line.');
  const pins = new Set();
  for (const [i, raw] of (await readFile(file, 'utf8')).split(/\r?\n/).entries()) {
    const line = raw.replace(/#.*/, '').trim();
    if (!line) continue;
    if (!/^\d{4}$/.test(line)) fail(`secret/pins.txt line ${i + 1}: "${line}" is not a 4-digit PIN.`);
    pins.add(line);
  }
  if (!pins.size) fail('secret/pins.txt has no PINs. Add at least one 4-digit PIN (one per line).');
  for (const pin of pins) {
    if (WEAK_PINS.has(pin) || /^(\d)\1{3}$/.test(pin)) console.warn(`  ! ${pin} is a very guessable PIN.`);
  }
  return [...pins];
}

async function encrypt(key, data) {
  const iv = rand(12);
  const ct = new Uint8Array(await subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  return { iv, ct };
}

async function pinKey(pin, salt) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  return subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
}

async function main() {
  const pins = await readPins();
  const profileFile = join(SECRET, 'profile.json');
  if (!existsSync(profileFile)) fail('secret/profile.json not found.');
  let profile;
  try {
    profile = JSON.parse(await readFile(profileFile, 'utf8'));
  } catch (e) {
    fail(`secret/profile.json is not valid JSON: ${e.message}`);
  }
  if (JSON.stringify(profile).includes('[your')) {
    console.warn('  ! profile.json still contains "[your ...]" placeholders.');
  }

  const rawKey = rand(32);
  const contentKey = await subtle.importKey('raw', rawKey, 'AES-GCM', false, ['encrypt']);

  // Start from a clean slate so removed photos and old ciphertext don't linger.
  await rm(OUT, { recursive: true, force: true });
  await mkdir(join(OUT, 'p'), { recursive: true });

  const photos = [];
  for (const rel of profile.photos ?? []) {
    const file = join(SECRET, rel);
    if (!existsSync(file)) fail(`photo not found: secret/${rel}`);
    const type = MIME[extname(file).toLowerCase()];
    if (!type) fail(`unsupported photo type: secret/${rel} (use jpg, png, webp, gif or avif)`);
    const bytes = await readFile(file);
    if (bytes.length > 1.5 * 1024 * 1024) {
      console.warn(`  ! secret/${rel} is ${(bytes.length / 1048576).toFixed(1)} MB; resize to ~1200px wide for faster loading.`);
    }
    const { iv, ct } = await encrypt(contentKey, bytes);
    const name = `${hex(rand(8))}.bin`;
    await writeFile(join(OUT, 'p', name), ct);
    photos.push({ src: PHOTO_URL + name, iv: b64(iv), type });
  }

  const data = await encrypt(contentKey, new TextEncoder().encode(JSON.stringify({ ...profile, photos })));

  const salt = rand(16);
  const keys = [];
  for (const pin of pins) {
    const { iv, ct } = await encrypt(await pinKey(pin, salt), rawKey);
    keys.push({ iv: b64(iv), ct: b64(ct) });
  }
  // Shuffle so the order of wrapped keys says nothing about pins.txt.
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }

  const vault = { v: 1, kdf: { salt: b64(salt), iterations: ITERATIONS }, keys, data: { iv: b64(data.iv), ct: b64(data.ct) } };
  await writeFile(join(OUT, 'vault.json'), JSON.stringify(vault));

  const files = await readdir(join(OUT, 'p'));
  console.log(`\n  ✔ sealed profile with ${pins.length} PIN${pins.length === 1 ? '' : 's'} and ${files.length} photo${files.length === 1 ? '' : 's'} → public/swipe-right/\n`);
}

main();
