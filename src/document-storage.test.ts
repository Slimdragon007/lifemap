import { afterEach, describe, expect, test, vi } from "vitest";
import {
  DOCUMENT_STORAGE_BUCKET,
  MAX_DOCUMENT_FILE_BYTES,
  prepareEncryptedVaultFile,
  removeVaultFileObjects,
  uploadPreparedVaultFile,
  validateDocumentFile,
  type DocumentStorageClient,
} from "./document-storage";
import { clearFieldCrypto } from "./field-crypto";

const { getDataKeyMock } = vi.hoisted(() => ({
  getDataKeyMock: vi.fn(),
}));

vi.mock("./api", () => ({
  getDataKey: getDataKeyMock,
}));

const KEY = btoa("0123456789abcdef0123456789abcdef");
const USER_ID = "11111111-1111-4111-8111-111111111111";
const VAULT_ITEM_ID = "22222222-2222-4222-8222-222222222222";

afterEach(() => {
  clearFieldCrypto();
  getDataKeyMock.mockReset();
});

describe("document-storage", () => {
  test("accepts supported PDFs/images and rejects unsafe files", () => {
    expect(
      validateDocumentFile(
        new File(["pdf"], "form.pdf", { type: "application/pdf" }),
      ),
    ).toEqual({ ok: true, mimeType: "application/pdf" });

    expect(
      validateDocumentFile(
        new File(["x"], "script.svg", { type: "image/svg+xml" }),
      ),
    ).toEqual({
      ok: false,
      error: "Use a PDF, JPG, PNG, HEIC, or HEIF file.",
    });

    const oversized = new File(
      [new Uint8Array(MAX_DOCUMENT_FILE_BYTES + 1)],
      "large.pdf",
      {
      type: "application/pdf",
      },
    );

    expect(validateDocumentFile(oversized)).toEqual({
      ok: false,
      error: "Files must be 6 MB or smaller.",
    });
  });

  test("encrypts and uploads a prepared file as an owned ciphertext object", async () => {
    getDataKeyMock.mockResolvedValue({ ok: true, key: KEY });
    const upload = vi.fn(async () => ({ data: {}, error: null }));
    const client: DocumentStorageClient = {
      storage: {
        from: vi.fn(() => ({
          upload,
          download: vi.fn(),
          remove: vi.fn(),
        })),
      },
    };

    const prepared = await prepareEncryptedVaultFile({
      accessToken: "access-token",
      file: new File(["hello"], "passport.pdf", { type: "application/pdf" }),
      userId: USER_ID,
      vaultItemId: VAULT_ITEM_ID,
    });

    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    const uploadResult = await uploadPreparedVaultFile(
      client,
      prepared.prepared,
    );

    expect(uploadResult.ok).toBe(true);
    expect(client.storage.from).toHaveBeenCalledWith(DOCUMENT_STORAGE_BUCKET);
    expect(prepared.prepared.file.objectPath).toMatch(
      new RegExp(`^${USER_ID}/${VAULT_ITEM_ID}/[0-9a-f-]+\\.bin$`),
    );
    expect(upload).toHaveBeenCalledWith(
      prepared.prepared.file.objectPath,
      expect.any(Blob),
      {
        cacheControl: "0",
        contentType: "application/octet-stream",
        upsert: false,
      },
    );
    expect(prepared.prepared.file.originalName).toBe("passport.pdf");
    expect(prepared.prepared.file.encryptionVersion).toBe("file-v1");
    expect(prepared.prepared.encryptedBlob.type).toBe(
      "application/octet-stream",
    );
  });

  test("confirms Storage deleted every requested object before reporting success", async () => {
    const remove = vi.fn(async () => ({
      data: [{ name: `${USER_ID}/${VAULT_ITEM_ID}/file.bin` }],
      error: null,
    }));
    const client: DocumentStorageClient = {
      storage: {
        from: vi.fn(() => ({
          upload: vi.fn(),
          download: vi.fn(),
          remove,
        })),
      },
    };

    await expect(
      removeVaultFileObjects(client, [
        { objectPath: `${USER_ID}/${VAULT_ITEM_ID}/file.bin` },
      ]),
    ).resolves.toEqual({ ok: true });

    remove.mockResolvedValueOnce({ data: [], error: null });

    await expect(
      removeVaultFileObjects(client, [
        { objectPath: `${USER_ID}/${VAULT_ITEM_ID}/missing.bin` },
      ]),
    ).resolves.toEqual({
      ok: false,
      error: "LifeMap could not confirm stored files were removed.",
    });
  });
});
