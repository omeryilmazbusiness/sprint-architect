import { ZipArchive } from "archiver";
import { PassThrough } from "stream";
import { getStorageProvider } from "../../../storage/getStorageProvider";
import { logger } from "../../../shared/logger";

export async function buildGuestFilesZip(
  files: { storageKey: string; fileName: string }[]
): Promise<Buffer> {
  if (files.length === 0) {
    return Buffer.alloc(0);
  }

  return new Promise((resolve, reject) => {
    const archive = new ZipArchive({ zlib: { level: 6 } });
    const passthrough = new PassThrough();
    const chunks: Buffer[] = [];

    passthrough.on("data", (chunk: Buffer) => chunks.push(chunk));
    passthrough.on("end", () => resolve(Buffer.concat(chunks)));
    passthrough.on("error", reject);
    archive.on("error", reject);
    archive.pipe(passthrough);

    const storage = getStorageProvider();
    void (async () => {
      for (const file of files) {
        try {
          const stream = await storage.getReadStream(file.storageKey);
          const safeName = file.fileName.replace(/[/\\]/g, "_") || "document.pdf";
          archive.append(stream, { name: safeName });
        } catch (err: unknown) {
          logger.warn("[guest-retention] Skipped file in ZIP (not found or unreadable)", {
            storageKey: file.storageKey,
            error: err instanceof Error ? err.message.slice(0, 120) : "unknown",
          });
        }
      }
      await archive.finalize();
    })().catch(reject);
  });
}
