import fs from "fs";
import path from "path";
import crypto from "crypto";
import type { Readable } from "stream";
import type { StorageProvider, SaveFileOptions } from "./StorageProvider";

function formatTimestamp(): string {
  const now = new Date();
  const YYYY = now.getUTCFullYear();
  const MM = String(now.getUTCMonth() + 1).padStart(2, "0");
  const DD = String(now.getUTCDate()).padStart(2, "0");
  const HH = String(now.getUTCHours()).padStart(2, "0");
  const mm = String(now.getUTCMinutes()).padStart(2, "0");
  const ss = String(now.getUTCSeconds()).padStart(2, "0");
  return `${YYYY}${MM}${DD}-${HH}${mm}${ss}`;
}

export class LocalDiskStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveFile({ clinicId, patientId, buffer }: SaveFileOptions): Promise<string> {
    const dir = path.join(this.uploadsDir, clinicId, patientId);
    fs.mkdirSync(dir, { recursive: true });

    const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const filename = `${formatTimestamp()}-${uuid}.pdf`;
    const storageKey = `${clinicId}/${patientId}/${filename}`;

    await fs.promises.writeFile(path.join(this.uploadsDir, storageKey), buffer);
    return storageKey;
  }

  async getReadStream(storageKey: string): Promise<Readable> {
    const absolutePath = this.getFilePath(storageKey);
    if (!fs.existsSync(absolutePath)) {
      throw new Error("File not found: " + storageKey);
    }
    return fs.createReadStream(absolutePath);
  }

  getFilePath(storageKey: string): string {
    return this.resolveKey(storageKey);
  }

  private resolveKey(storageKey: string): string {
    if (storageKey.startsWith("/v1/documents/files/")) {
      const parts = storageKey.replace("/v1/documents/files/", "").split("/");
      if (parts.length >= 3) {
        return path.join(this.uploadsDir, ...parts);
      }
    }
    return path.join(this.uploadsDir, storageKey);
  }
}
