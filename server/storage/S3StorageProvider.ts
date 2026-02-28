import crypto from "crypto";
import { Readable } from "stream";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
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

export class S3StorageProvider implements StorageProvider {
  private client: S3Client;
  private bucket: string;

  constructor() {
    const region = process.env.S3_REGION;
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const endpoint = process.env.S3_ENDPOINT;
    const forcePathStyle = process.env.S3_FORCE_PATH_STYLE === "true";

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new Error(
        "S3 storage requires S3_REGION, S3_ACCESS_KEY_ID, and S3_SECRET_ACCESS_KEY environment variables."
      );
    }

    const bucket = process.env.S3_BUCKET;
    if (!bucket) {
      throw new Error("S3 storage requires S3_BUCKET environment variable.");
    }
    this.bucket = bucket;

    this.client = new S3Client({
      region,
      credentials: { accessKeyId, secretAccessKey },
      ...(endpoint ? { endpoint } : {}),
      forcePathStyle,
    });
  }

  async saveFile({ clinicId, patientId, buffer, mimetype }: SaveFileOptions): Promise<string> {
    const uuid = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const filename = `${formatTimestamp()}-${uuid}.pdf`;
    const storageKey = `${clinicId}/${patientId}/${filename}`;

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
        Body: buffer,
        ContentType: mimetype,
      })
    );

    return storageKey;
  }

  async getReadStream(storageKey: string): Promise<Readable> {
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: storageKey,
      })
    );

    if (!response.Body) {
      throw new Error("S3 returned empty body for key: " + storageKey);
    }

    return response.Body as Readable;
  }
}
