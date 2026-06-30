import {
  decryptFileBytes,
  encryptFileBytes,
  FILE_CRYPTO_CONTENT_TYPE,
} from "./field-crypto";
import type { VaultItemFile } from "./familyOS";

export const DOCUMENT_STORAGE_BUCKET = "lifemap-documents";
export const MAX_DOCUMENT_FILE_BYTES = 6 * 1024 * 1024;
export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
] as const;
export const DOCUMENT_FILE_ACCEPT = [
  ...ACCEPTED_DOCUMENT_MIME_TYPES,
  ".pdf",
  ".jpg",
  ".jpeg",
  ".png",
  ".heic",
  ".heif",
].join(",");

type StorageError = { message?: string } | null;

type UploadResult = {
  data: unknown;
  error: StorageError;
};

type DownloadResult = {
  data: Blob | null;
  error: StorageError;
};

type RemoveResult = {
  data: unknown;
  error: StorageError;
};

export type DocumentStorageClient = {
  storage: {
    from: (bucketId: string) => {
      upload: (
        path: string,
        body: Blob,
        options: { cacheControl: string; contentType: string; upsert: false },
      ) => Promise<UploadResult>;
      download: (path: string) => Promise<DownloadResult>;
      remove: (paths: string[]) => Promise<RemoveResult>;
    };
  };
};

export type DocumentFileValidation =
  | { ok: true; mimeType: string }
  | { ok: false; error: string };

export type PreparedVaultFile = {
  file: VaultItemFile;
  encryptedBlob: Blob;
};

export type UploadedVaultFile = {
  file: VaultItemFile;
};

export type VaultFileDownload = {
  blob: Blob;
  fileName: string;
  mimeType: string;
};

export function validateDocumentFile(file: File): DocumentFileValidation {
  if (file.size <= 0) {
    return { ok: false, error: "Choose a real PDF or photo." };
  }
  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    return { ok: false, error: "Files must be 6 MB or smaller." };
  }

  const mimeType = mimeTypeForFile(file);
  if (!mimeType) {
    return {
      ok: false,
      error: "Use a PDF, JPG, PNG, HEIC, or HEIF file.",
    };
  }

  return { ok: true, mimeType };
}

export async function prepareEncryptedVaultFile({
  accessToken,
  file,
  userId,
  vaultItemId,
}: {
  accessToken: string;
  file: File;
  userId: string;
  vaultItemId: string;
}): Promise<
  | { ok: true; prepared: PreparedVaultFile }
  | { ok: false; error: string }
> {
  const validation = validateDocumentFile(file);
  if (!validation.ok) {
    return validation;
  }

  const fileId = crypto.randomUUID();
  const encrypted = await encryptFileBytes(file, accessToken);
  return {
    ok: true,
    prepared: {
      encryptedBlob: encrypted.ciphertext,
      file: {
        id: fileId,
        vaultItemId,
        bucketId: DOCUMENT_STORAGE_BUCKET,
        objectPath: vaultFileObjectPath(userId, vaultItemId, fileId),
        encryptionVersion: encrypted.encryptionVersion,
        encryptionIv: encrypted.encryptionIv,
        originalName: file.name.trim() || "document",
        mimeType: validation.mimeType,
        byteSize: file.size,
        encryptedByteSize: encrypted.encryptedByteSize,
      },
    },
  };
}

export async function uploadPreparedVaultFile(
  client: DocumentStorageClient,
  prepared: PreparedVaultFile,
): Promise<{ ok: true; uploaded: UploadedVaultFile } | { ok: false; error: string }> {
  const result = await client.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .upload(prepared.file.objectPath, prepared.encryptedBlob, {
      cacheControl: "0",
      contentType: FILE_CRYPTO_CONTENT_TYPE,
      upsert: false,
    });

  if (result.error) {
    return {
      ok: false,
      error: result.error.message ?? "LifeMap could not upload that file.",
    };
  }

  return { ok: true, uploaded: { file: prepared.file } };
}

export async function removeVaultFileObjects(
  client: DocumentStorageClient,
  files: Array<Pick<VaultItemFile, "objectPath">>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const objectPaths = files.map((file) => file.objectPath).filter(Boolean);
  if (objectPaths.length === 0) {
    return { ok: true };
  }

  const result = await client.storage
    .from(DOCUMENT_STORAGE_BUCKET)
    .remove(objectPaths);
  if (result.error) {
    return {
      ok: false,
      error: result.error.message ?? "LifeMap could not remove stored files.",
    };
  }
  if (!confirmedRemovedPaths(result.data, objectPaths)) {
    return {
      ok: false,
      error: "LifeMap could not confirm stored files were removed.",
    };
  }
  return { ok: true };
}

function confirmedRemovedPaths(data: unknown, objectPaths: string[]): boolean {
  if (!Array.isArray(data)) {
    return false;
  }

  const removed = new Set(
    data.flatMap((item) => {
      if (!isRecord(item)) {
        return [];
      }
      return typeof item.name === "string" ? [item.name] : [];
    }),
  );
  return objectPaths.every((path) => removed.has(path));
}

export async function downloadVaultFile({
  accessToken,
  client,
  file,
}: {
  accessToken: string;
  client: DocumentStorageClient;
  file: VaultItemFile;
}): Promise<
  { ok: true; download: VaultFileDownload } | { ok: false; error: string }
> {
  const result = await client.storage
    .from(file.bucketId)
    .download(file.objectPath);

  if (result.error || !result.data) {
    return {
      ok: false,
      error: result.error?.message ?? "LifeMap could not download that file.",
    };
  }

  const blob = await decryptFileBytes(
    result.data,
    file.encryptionIv,
    file.mimeType,
    accessToken,
  );
  return {
    ok: true,
    download: {
      blob,
      fileName: file.originalName,
      mimeType: file.mimeType,
    },
  };
}

export function formatFileBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${Math.round(bytes / 102.4) / 10} KB`;
  }
  return `${Math.round(bytes / (1024 * 102.4)) / 10} MB`;
}

function vaultFileObjectPath(
  userId: string,
  vaultItemId: string,
  fileId: string,
): string {
  return `${userId}/${vaultItemId}/${fileId}.bin`;
}

function mimeTypeForFile(file: File): string | null {
  if (isAcceptedMimeType(file.type)) {
    return file.type;
  }

  const extension = file.name.split(".").pop()?.toLocaleLowerCase() ?? "";
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return null;
  }
}

function isAcceptedMimeType(value: string): value is (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number] {
  return ACCEPTED_DOCUMENT_MIME_TYPES.includes(
    value as (typeof ACCEPTED_DOCUMENT_MIME_TYPES)[number],
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
