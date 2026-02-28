import type { StorageProvider } from "./StorageProvider";

let _provider: StorageProvider | null = null;

export function getStorageProvider(): StorageProvider {
  if (_provider) return _provider;

  const providerName = process.env.STORAGE_PROVIDER ?? "local";

  if (providerName === "s3") {
    const { S3StorageProvider } = require("./S3StorageProvider");
    _provider = new S3StorageProvider();
  } else {
    const { LocalDiskStorageProvider } = require("./LocalDiskStorageProvider");
    _provider = new LocalDiskStorageProvider();
  }

  return _provider!;
}
