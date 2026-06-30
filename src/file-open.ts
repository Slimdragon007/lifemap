import type { VaultFileDownload } from "./document-storage";

const FILE_OPEN_REVOKE_DELAY_MS = 60_000;

type FileOpenDom = {
  document: Document;
  url: Pick<typeof URL, "createObjectURL" | "revokeObjectURL">;
  setTimeout: Window["setTimeout"];
};

export function reserveFileWindow(): Window | null {
  const opened = window.open("about:blank", "_blank");
  if (!opened) {
    return null;
  }

  try {
    opened.opener = null;
    opened.document.title = "Opening secure file";
    opened.document.body.style.fontFamily =
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
    opened.document.body.style.margin = "24px";
    opened.document.body.textContent = "Opening secure file...";
  } catch {
    // Some browser contexts restrict about:blank document access. The window can
    // still be navigated once the decrypted object URL is ready.
  }

  return opened;
}

export function closeReservedFileWindow(fileWindow: Window | null): void {
  if (!fileWindow) {
    return;
  }

  try {
    fileWindow.close();
  } catch {
    // Best-effort cleanup only.
  }
}

export function openDownloadedFile(
  download: VaultFileDownload,
  fileWindow: Window | null,
  dom: FileOpenDom = {
    document,
    url: URL,
    setTimeout: window.setTimeout.bind(window),
  },
): void {
  const objectUrl = dom.url.createObjectURL(download.blob);

  if (fileWindow && !fileWindow.closed) {
    fileWindow.location.href = objectUrl;
  } else {
    const link = dom.document.createElement("a");
    link.href = objectUrl;
    link.download = download.fileName;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    dom.document.body.append(link);
    link.click();
    link.remove();
  }

  dom.setTimeout(() => {
    dom.url.revokeObjectURL(objectUrl);
  }, FILE_OPEN_REVOKE_DELAY_MS);
}
