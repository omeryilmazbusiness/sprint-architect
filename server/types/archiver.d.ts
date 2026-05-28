declare module "archiver" {
  import type { Transform } from "stream";
  import type { ZlibOptions } from "zlib";

  export interface ArchiverOptions {
    zlib?: ZlibOptions;
    highWaterMark?: number;
    statConcurrency?: number;
  }

  export class Archiver extends Transform {
    append(
      source: NodeJS.ReadableStream | Buffer | string,
      data?: { name?: string },
    ): this;
    finalize(): Promise<void>;
    pipe<T extends NodeJS.WritableStream>(destination: T): T;
  }

  export class ZipArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }

  export class TarArchive extends Archiver {
    constructor(options?: ArchiverOptions);
  }
}
