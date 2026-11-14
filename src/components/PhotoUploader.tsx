"use client";

import { useState } from "react";

const MAX_PHOTOS = 5;
const MAX_SIDE = 1600; // pixels; phone photos are shrunk before upload

/** Shrink a photo to a ~200-500 KB JPEG so uploads are quick on mobile data. */
async function compress(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that photo. Try a JPEG or PNG.");
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't process that photo."))),
      "image/jpeg",
      0.82,
    ),
  );
}

export function PhotoUploader({
  initial = [],
  onBusyChange,
  error,
}: {
  initial?: string[];
  onBusyChange?: (busy: boolean) => void;
  error?: string;
}) {
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string>();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []).slice(0, MAX_PHOTOS - urls.length);
    e.target.value = ""; // lets the same photo be picked again later
    if (files.length === 0) return;

    setMessage(undefined);
    setBusy(true);
    onBusyChange?.(true);
    try {
      for (const file of files) {
        const blob = await compress(file);
        const body = new FormData();
        body.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
        const res = await fetch("/api/upload", { method: "POST", body });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.url) throw new Error(data.error || "Upload failed. Try again.");
        setUrls((prev) => [...prev, data.url]);
      }
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Upload failed. Try again.");
    } finally {
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const full = urls.length >= MAX_PHOTOS;

  return (
    <div>
      <p className="mb-1 font-semibold">Photos (optional)</p>

      {urls.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {urls.map((url, i) => (
            <li key={url} className="relative aspect-square overflow-hidden rounded-md border border-line bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-1 left-1 rounded-sm bg-white/90 px-1.5 text-xs font-semibold">
                  Cover
                </span>
              )}
              <button
                type="button"
                aria-label={`Remove photo ${i + 1}`}
                onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-lg leading-none text-white"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      {urls.map((url) => (
        <input key={url} type="hidden" name="images" value={url} />
      ))}

      <label
        className={`btn-ghost cursor-pointer focus-within:ring-2 focus-within:ring-brand ${
          busy || full ? "pointer-events-none opacity-60" : ""
        }`}
      >
        {busy ? "Uploading…" : urls.length ? "Add more photos" : "Add photos"}
        <input
          type="file"
          accept="image/*"
          multiple
          disabled={busy || full}
          onChange={onPick}
          className="sr-only"
        />
      </label>

      <p className="mt-1 text-sm text-muted">
        Up to {MAX_PHOTOS}. The first one is the cover. On a phone you can take a photo or choose from your library.
      </p>
      {(message || error) && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {message || error}
        </p>
      )}
    </div>
  );
}
