import { writeFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type UploadError = "too_large" | "bad_type";

export async function saveUploadedImage(
  file: File,
): Promise<{ ok: true; publicPath: string } | { ok: false; error: UploadError }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "too_large" };
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: "bad_type" };

  const ext = EXT_BY_MIME[file.type];
  const name = `${crypto.randomUUID()}.${ext}`;
  const dest = path.join(UPLOAD_DIR, name);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(dest, buf);
  return { ok: true, publicPath: `/uploads/${name}` };
}
