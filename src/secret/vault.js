// Browser half of scripts/seal.mjs: derives a key from the PIN and unwraps the content key.
// Nothing readable ships with the page; without a listed PIN the vault is just ciphertext.

const VAULT_URL = '/swipe-right/vault.json';
const { subtle } = globalThis.crypto;
const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

let vaultPromise;

// Fetched on the first PIN attempt, not on page load.
export function loadVault() {
  vaultPromise ??= fetch(VAULT_URL, { cache: 'no-cache' }).then((r) => {
    if (!r.ok) throw new Error('vault-missing');
    return r.json();
  });
  vaultPromise.catch(() => (vaultPromise = undefined));
  return vaultPromise;
}

// Resolves to the content key if `pin` is one of the sealed PINs, otherwise null.
export async function unlock(vault, pin) {
  const base = await subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  const pinKey = await subtle.deriveKey(
    { name: 'PBKDF2', salt: fromB64(vault.kdf.salt), iterations: vault.kdf.iterations, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  for (const wrapped of vault.keys) {
    try {
      const raw = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(wrapped.iv) }, pinKey, fromB64(wrapped.ct));
      return subtle.importKey('raw', raw, 'AES-GCM', false, ['decrypt']);
    } catch {
      // Wrong PIN for this slot; GCM authentication rejects it. Try the next one.
    }
  }
  return null;
}

export async function decryptProfile(vault, key) {
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(vault.data.iv) }, key, fromB64(vault.data.ct));
  return JSON.parse(new TextDecoder().decode(plain));
}

// Returns an object URL for the decrypted image.
export async function decryptPhoto(key, { src, iv, type }) {
  const ct = await fetch(src).then((r) => r.arrayBuffer());
  const plain = await subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, ct);
  return URL.createObjectURL(new Blob([plain], { type }));
}
