import fs from "fs";
import path from "path";
import crypto from "crypto";
import { StorageProvider, SaveFileOptions } from "./StorageProvider";

export class LocalDiskStorageProvider implements StorageProvider {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), "uploads");
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  async saveFile({ clinicId, patientId, buffer, originalName, mimetype }: SaveFileOptions): Promise<string> {
    const dir = path.join(this.uploadsDir, clinicId, patientId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const ext = path.extname(originalName) || ".pdf";
    const safeName = `${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
    const filePath = path.join(dir, safeName);

    await fs.promises.writeFile(filePath, buffer);

    // Return the relative URL that will be used by the download endpoint
    return `/v1/documents/files/${clinicId}/${patientId}/${safeName}`;
  }

  getFilePath(fileUrl: string): string {
    // fileUrl is like /v1/documents/files/{clinicId}/{patientId}/{filename}
    const parts = fileUrl.split("/");
    const filename = parts.pop();
    const patientId = parts.pop();
    const clinicId = parts.pop();

    if (!clinicId || !patientId || !filename) {
      throw new Error("Invalid file URL");
    }

    return path.join(this.uploadsDir, clinicId, patientId, filename);
  }
}

export const storageProvider = new LocalDiskStorageProvider();
