import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/auth";
import { saveUploadedImage } from "@/lib/upload";

export async function POST(req: Request) {
  const { user } = await getCurrentSession();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }
  const result = await saveUploadedImage(file);
  if (!result.ok) {
    const msg =
      result.error === "too_large"
        ? "File too large (max 5 Mo)"
        : "Unsupported file type (jpg/png/webp only)";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  return NextResponse.json({ path: result.publicPath });
}
