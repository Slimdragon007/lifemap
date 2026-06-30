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

export type FileCryptoPayload = {
  ciphertext: Blob;
  encryptedByteSize: number;
  encryptionIv: string;
  encryptionVersion: typeof FILE_CRYPTO_VERSION;
};

const PREFIX = "v1:";
const IV_BYTES = 12;
export const FILE_CRYPTO_VERSION = "file-v1";
export const FILE_CRYPTO_CONTENT_TYPE = "application/octet-stream";
export const FIELD_CRYPTO_UNAVAILABLE_ERROR =
  "LifeMap cannot save private details until encryption is available.";

// Demo mode, tests, and any path without a key use this no-op pass-through so
// the rest of the app never special-cases "is encryption on?".
export const identityFieldCrypto: FieldCrypto = {
  encrypt: async (plaintext) => plaintext,
  decrypt: async (value) => value,
};

export function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function base64ToBytes(base64: string): Uint8Array<ArrayBuffer> {
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
let activeKeyBase64: string | null = null;
let activeFileKeyPromise: Promise<CryptoKey> | null = null;

async function ensureDataKeyBase64(accessToken: string): Promise<string> {
  if (activeKeyBase64) {
    return activeKeyBase64;
  }
  const result = await getDataKey(accessToken);
  if (!result.ok) {
    console.warn("LifeMap data-key fetch failed; private writes blocked");
    throw new Error(FIELD_CRYPTO_UNAVAILABLE_ERROR);
  }
  activeKeyBase64 = result.key;
  return activeKeyBase64;
}

async function ensureFileKey(accessToken: string): Promise<CryptoKey> {
  const keyBase64 = await ensureDataKeyBase64(accessToken);
  if (!activeFileKeyPromise) {
    activeFileKeyPromise = crypto.subtle.importKey(
      "raw",
      base64ToBytes(keyBase64),
      { name: "AES-GCM" },
      false,
      ["encrypt", "decrypt"],
    );
  }
  return activeFileKeyPromise;
}

// Fetches the per-user key from the Worker and activates real encryption for the
// session. In real mode this must fail closed: sensitive writes should stop
// rather than degrade to unencrypted plaintext if the key endpoint is down.
export async function ensureFieldCrypto(
  accessToken: string,
): Promise<FieldCrypto> {
  if (active) {
    return active;
  }
  const keyBase64 = await ensureDataKeyBase64(accessToken);
  active = createFieldCrypto(keyBase64);
  return active;
}

export async function encryptFileBytes(
  file: File,
  accessToken: string,
): Promise<FileCryptoPayload> {
  const key = await ensureFileKey(accessToken);
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    await blobToArrayBuffer(file),
  );
  const bytes = new Uint8Array(ciphertext);
  return {
    ciphertext: new Blob([bytes], { type: FILE_CRYPTO_CONTENT_TYPE }),
    encryptedByteSize: bytes.byteLength,
    encryptionIv: bytesToBase64(iv),
    encryptionVersion: FILE_CRYPTO_VERSION,
  };
}

export async function decryptFileBytes(
  encryptedBlob: Blob,
  encryptionIv: string,
  mimeType: string,
  accessToken: string,
): Promise<Blob> {
  const key = await ensureFileKey(accessToken);
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: base64ToBytes(encryptionIv) },
    key,
    await blobToArrayBuffer(encryptedBlob),
  );
  return new Blob([new Uint8Array(plaintext)], { type: mimeType });
}

async function blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === "function") {
    return blob.arrayBuffer();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error("Could not read file bytes."));
      }
    };
    reader.readAsArrayBuffer(blob);
  });
}

// Synchronous accessor for the active crypto (identity until ensureFieldCrypto
// resolves).
export function getFieldCrypto(): FieldCrypto {
  return active ?? identityFieldCrypto;
}

// Clear on sign-out so a different user never reuses the prior key.
export function clearFieldCrypto(): void {
  active = null;
  activeKeyBase64 = null;
  activeFileKeyPromise = null;
}
