// App-layer field encryption for the sensitive family-data columns
// (vault_items.detail, family_members.care_notes / details).
//
// The browser fetches a per-user key from the Worker (HKDF over a master secret)
// once per session and AES-256-GCM encrypts these fields BEFORE they reach
// Supabase, so the columns are ciphertext at rest. This is transparent to the
// user (no passphrase) and recoverable (the Worker can re-derive the key). It is
// NOT zero-knowledge — the win is at-rest ciphertext against a DB breach, a
// stolen backup, a leaked anon key, or an RLS misconfig.
//
// Stored format: `v1:<base64(iv)>:<base64(ciphertext)>`. A value without the
// `v1:` prefix is treated as legacy plaintext and passed through unchanged, so
// existing rows keep working with no backfill and new writes are encrypted.

import { getDataKey } from "./api";

export type FieldCrypto = {
  encrypt: (plaintext: string) => Promise<string>;
  decrypt: (value: string) => Promise<string>;
};

const PREFIX = "v1:";
const IV_BYTES = 12;

// Demo mode, tests, and any path without a key use this no-op pass-through so
// the rest of the app never special-cases "is encryption on?".
export const identityFieldCrypto: FieldCrypto = {
  encrypt: async (plaintext) => plaintext,
  decrypt: async (value) => value,
};

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// Builds a FieldCrypto from a base64 256-bit key. Pure — no network. Exported so
// tests can exercise a real roundtrip without the Worker.
export function createFieldCrypto(keyBase64: string): FieldCrypto {
  const keyPromise = crypto.subtle.importKey(
    "raw",
    base64ToBytes(keyBase64),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"],
  );

  return {
    async encrypt(plaintext: string): Promise<string> {
      if (!plaintext) {
        return plaintext; // keep empty fields empty — nothing to protect
      }
      const key = await keyPromise;
      const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
      const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        new TextEncoder().encode(plaintext),
      );
      return `${PREFIX}${bytesToBase64(iv)}:${bytesToBase64(new Uint8Array(ciphertext))}`;
    },

    async decrypt(value: string): Promise<string> {
      if (typeof value !== "string" || !value.startsWith(PREFIX)) {
        return value; // legacy plaintext (or empty) — pass through unchanged
      }
      const [, ivB64, ctB64] = value.split(":");
      if (!ivB64 || !ctB64) {
        return "";
      }
      try {
        const key = await keyPromise;
        const plaintext = await crypto.subtle.decrypt(
          { name: "AES-GCM", iv: base64ToBytes(ivB64) },
          key,
          base64ToBytes(ctB64),
        );
        return new TextDecoder().decode(plaintext);
      } catch (error) {
        // Tampered / wrong-key / corrupt: fail safe to empty rather than crash
        // the whole load or surface wrong plaintext.
        console.warn("LifeMap field decrypt failed", error);
        return "";
      }
    },
  };
}

// ── Session-scoped active crypto ─────────────────────────────────────────────

let active: FieldCrypto | null = null;

// Fetches the per-user key from the Worker and activates real encryption for the
// session. Falls back to identity (pass-through) if the key can't be fetched, so
// a key-endpoint outage degrades to "unencrypted new writes" rather than a hard
// failure. Returns the crypto in effect.
export async function ensureFieldCrypto(
  accessToken: string,
): Promise<FieldCrypto> {
  if (active) {
    return active;
  }
  const result = await getDataKey(accessToken);
  if (!result.ok) {
    console.warn("LifeMap data-key fetch failed; field encryption inactive");
    return identityFieldCrypto;
  }
  active = createFieldCrypto(result.key);
  return active;
}

// Synchronous accessor for the active crypto (identity until ensureFieldCrypto
// resolves).
export function getFieldCrypto(): FieldCrypto {
  return active ?? identityFieldCrypto;
}

// Clear on sign-out so a different user never reuses the prior key.
export function clearFieldCrypto(): void {
  active = null;
}
