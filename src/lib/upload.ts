import { access } from "node:fs/promises";
import path from "node:path";
import { getStorageDriver } from "@/lib/storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);
const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const UPLOAD_PATH_RE = /^\/uploads\/[a-f0-9-]+\.(jpg|png|webp)$/;

export type UploadError = "too_large" | "bad_type";

function detectImageType(buf: Buffer): keyof typeof EXT_BY_MIME | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff)
    return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47
  )
    return "image/png";
  if (
    buf.length >= 12 &&
    buf.toString("ascii", 0, 4) === "RIFF" &&
    buf.toString("ascii", 8, 12) === "WEBP"
  )
    return "image/webp";
  return null;
}

export async function saveUploadedImage(
  file: File,
): Promise<{ ok: true; publicPath: string } | { ok: false; error: UploadError }> {
  if (file.size > MAX_BYTES) return { ok: false, error: "too_large" };
  const buf = Buffer.from(await file.arrayBuffer());
  const detected = detectImageType(buf);
  if (!detected || !ALLOWED_MIME.has(detected))
    return { ok: false, error: "bad_type" };
  if (!ALLOWED_MIME.has(file.type)) return { ok: false, error: "bad_type" };

  const ext = EXT_BY_MIME[detected];
  const stored = await getStorageDriver().saveImage(buf, ext);
  if ("error" in stored) return { ok: false, error: "bad_type" };
  return { ok: true, publicPath: stored.publicPath };
}

/** Ensure listing photo paths exist under public/uploads. */
export async function validatePhotoPaths(
  paths: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  for (const p of paths) {
    if (!UPLOAD_PATH_RE.test(p)) {
      return { ok: false, error: "Invalid photo path" };
    }
    const disk = path.join(process.cwd(), "public", p);
    if (!disk.startsWith(UPLOAD_DIR)) {
      return { ok: false, error: "Invalid photo path" };
    }
    try {
      await access(disk);
    } catch {
      return { ok: false, error: "Photo file not found" };
    }
  }
  return { ok: true };
}
