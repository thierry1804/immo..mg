"use client";

import { useState } from "react";

type Props = {
  paths: string[];
  onChange: (paths: string[]) => void;
};

export default function PhotoUploader({ paths, onChange }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error ?? "Upload failed");
          break;
        }
        const data = (await res.json()) as { path: string };
        uploaded.push(data.path);
      }
      if (uploaded.length > 0) onChange([...paths, ...uploaded]);
    } finally {
      setUploading(false);
    }
  }

  function remove(path: string) {
    onChange(paths.filter((p) => p !== path));
  }

  return (
    <div>
      <label className="block text-sm font-medium">Photos</label>
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={uploading}
        onChange={(e) => handleFiles(e.target.files)}
        className="mt-2 block text-sm"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      {paths.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2">
          {paths.map((p) => (
            <li key={p} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p}
                alt=""
                className="aspect-square w-full rounded object-cover"
              />
              <button
                type="button"
                onClick={() => remove(p)}
                className="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-xs text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
