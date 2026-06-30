import { afterEach, describe, expect, test, vi } from "vitest";
import { openDownloadedFile } from "./file-open";
import type { VaultFileDownload } from "./document-storage";

const download: VaultFileDownload = {
  blob: new Blob(["pdf bytes"], { type: "application/pdf" }),
  fileName: "passport.pdf",
  mimeType: "application/pdf",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("file-open", () => {
  test("opens a decrypted file in the reserved browser window", () => {
    const fileWindow = {
      closed: false,
      location: { href: "about:blank" },
    } as unknown as Window;
    const appendSpy = vi.spyOn(document.body, "append");
    const url = {
      createObjectURL: vi.fn(() => "blob:lifemap-file"),
      revokeObjectURL: vi.fn(),
    };
    const setTimeout = vi.fn((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 1;
    });

    openDownloadedFile(download, fileWindow, {
      document,
      url,
      setTimeout: setTimeout as unknown as Window["setTimeout"],
    });

    expect(fileWindow.location.href).toBe("blob:lifemap-file");
    expect(appendSpy).not.toHaveBeenCalled();
    expect(url.createObjectURL).toHaveBeenCalledWith(download.blob);
    expect(url.revokeObjectURL).toHaveBeenCalledWith("blob:lifemap-file");
  });

  test("falls back to a download link when a file window is unavailable", () => {
    const link = document.createElement("a");
    const clickSpy = vi.spyOn(link, "click").mockImplementation(() => {});
    const removeSpy = vi.spyOn(link, "remove").mockImplementation(() => {});
    vi.spyOn(document, "createElement").mockReturnValue(link);
    const appendSpy = vi.spyOn(document.body, "append");
    const url = {
      createObjectURL: vi.fn(() => "blob:lifemap-file"),
      revokeObjectURL: vi.fn(),
    };
    const setTimeout = vi.fn((callback: TimerHandler) => {
      if (typeof callback === "function") {
        callback();
      }
      return 1;
    });

    openDownloadedFile(download, null, {
      document,
      url,
      setTimeout: setTimeout as unknown as Window["setTimeout"],
    });

    expect(link.href).toBe("blob:lifemap-file");
    expect(link.download).toBe("passport.pdf");
    expect(link.target).toBe("_blank");
    expect(link.rel).toBe("noopener noreferrer");
    expect(appendSpy).toHaveBeenCalledWith(link);
    expect(clickSpy).toHaveBeenCalled();
    expect(removeSpy).toHaveBeenCalled();
    expect(url.revokeObjectURL).toHaveBeenCalledWith("blob:lifemap-file");
  });
});
