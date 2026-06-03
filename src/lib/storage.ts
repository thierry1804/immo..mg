import { writeFile } from "node:fs/promises";
import path from "node:path";

export type StoredFile = { publicPath: string };

export interface StorageDriver {
  saveImage(
    buf: Buffer,
    ext: string,
  ): Promise<StoredFile | { error: "write_failed" }>;
}

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

export class LocalStorageDriver implements StorageDriver {
  async saveImage(buf: Buffer, ext: string) {
    const name = `${crypto.randomUUID()}.${ext}`;
    const dest = path.join(UPLOAD_DIR, name);
    try {
      await writeFile(dest, buf);
      return { publicPath: `/uploads/${name}` };
    } catch {
      return { error: "write_failed" as const };
    }
  }
}

/** S3-compatible driver stub — wire when credentials are available. */
export class S3StorageDriver implements StorageDriver {
  async saveImage(): Promise<{ error: "write_failed" }> {
    return { error: "write_failed" };
  }
}

export function getStorageDriver(): StorageDriver {
  if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY) {
    return new S3StorageDriver();
  }
  return new LocalStorageDriver();
}
