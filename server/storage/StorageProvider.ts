export interface SaveFileOptions {
  clinicId: string;
  patientId: string;
  buffer: Buffer;
  originalName: string;
  mimetype: string;
}

export interface StorageProvider {
  saveFile(opts: SaveFileOptions): Promise<string>;
  getFilePath(fileUrl: string): string;
}
