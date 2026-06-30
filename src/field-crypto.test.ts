import { afterEach, describe, expect, test, vi } from "vitest";

const { getDataKeyMock } = vi.hoisted(() => ({
  getDataKeyMock: vi.fn(),
}));

vi.mock("./api", () => ({
  getDataKey: getDataKeyMock,
}));

import {
  FIELD_CRYPTO_UNAVAILABLE_ERROR,
  clearFieldCrypto,
  createFieldCrypto,
  decryptFileBytes,
  encryptFileBytes,
  ensureFieldCrypto,
  getFieldCrypto,
  identityFieldCrypto,
} from "./field-crypto";

// 32 bytes → AES-256 key, base64-encoded the same way the Worker returns it.
const KEY = btoa("0123456789abcdef0123456789abcdef");

afterEach(() => {
  clearFieldCrypto();
  getDataKeyMock.mockReset();
});

describe("createFieldCrypto", () => {
  test("round-trips plaintext through encrypt/decrypt", async () => {
    const crypto = createFieldCrypto(KEY);
    const ciphertext = await crypto.encrypt("policy #A-1234, SSN on file");

    expect(ciphertext.startsWith("v1:")).toBe(true);
    expect(ciphertext).not.toContain("policy");
    expect(await crypto.decrypt(ciphertext)).toBe(
      "policy #A-1234, SSN on file",
    );
  });

  test("uses a fresh IV so identical plaintext yields different ciphertext", async () => {
    const crypto = createFieldCrypto(KEY);
    const a = await crypto.encrypt("same");
    const b = await crypto.encrypt("same");

    expect(a).not.toBe(b);
    expect(await crypto.decrypt(a)).toBe("same");
    expect(await crypto.decrypt(b)).toBe("same");
  });

  test("keeps empty strings empty (nothing to protect)", async () => {
    const crypto = createFieldCrypto(KEY);
    expect(await crypto.encrypt("")).toBe("");
  });

  test("passes through legacy plaintext (no v1: prefix) unchanged", async () => {
    const crypto = createFieldCrypto(KEY);
    expect(await crypto.decrypt("legacy plaintext value")).toBe(
      "legacy plaintext value",
    );
  });

  test("fails safe to empty on tampered ciphertext", async () => {
    const crypto = createFieldCrypto(KEY);
    const ciphertext = await crypto.encrypt("secret");
    const [, iv, ct] = ciphertext.split(":");
    const flipped = (ct[0] === "A" ? "B" : "A") + ct.slice(1);
    const tampered = `v1:${iv}:${flipped}`;

    const result = await crypto.decrypt(tampered);
    expect(result).not.toBe("secret");
    expect(result).toBe("");
  });
});

describe("identityFieldCrypto", () => {
  test("is a no-op pass-through both ways", async () => {
    expect(await identityFieldCrypto.encrypt("x")).toBe("x");
    expect(await identityFieldCrypto.decrypt("x")).toBe("x");
  });
});

describe("ensureFieldCrypto", () => {
  test("activates real encryption when the Worker returns a data key", async () => {
    getDataKeyMock.mockResolvedValue({ ok: true, key: KEY });

    const crypto = await ensureFieldCrypto("access-token");
    const ciphertext = await crypto.encrypt("policy #A-1234");

    expect(getDataKeyMock).toHaveBeenCalledWith("access-token");
    expect(ciphertext.startsWith("v1:")).toBe(true);
    expect(ciphertext).not.toContain("policy");
    expect(await getFieldCrypto().decrypt(ciphertext)).toBe("policy #A-1234");
  });

  test("fails closed when the Worker cannot return a data key", async () => {
    getDataKeyMock.mockResolvedValue({
      ok: false,
      error: "Field encryption is not configured.",
    });

    await expect(ensureFieldCrypto("access-token")).rejects.toThrow(
      FIELD_CRYPTO_UNAVAILABLE_ERROR,
    );

    expect(await getFieldCrypto().encrypt("private")).toBe("private");
  });
});

describe("file crypto", () => {
  test("round-trips file bytes through the active data key", async () => {
    getDataKeyMock.mockResolvedValue({ ok: true, key: KEY });
    const file = new File(["hello pdf bytes"], "casey.pdf", {
      type: "application/pdf",
    });

    const encrypted = await encryptFileBytes(file, "access-token");
    const decrypted = await decryptFileBytes(
      encrypted.ciphertext,
      encrypted.encryptionIv,
      file.type,
      "access-token",
    );

    expect(encrypted.encryptionVersion).toBe("file-v1");
    expect(encrypted.encryptedByteSize).toBeGreaterThan(file.size);
    expect(await readBlobText(decrypted)).toBe("hello pdf bytes");
    expect(getDataKeyMock).toHaveBeenCalledTimes(1);
  });
});

function readBlobText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.readAsText(blob);
  });
}
