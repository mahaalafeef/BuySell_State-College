// Browser-only helpers: shrink a phone photo and upload it to the site's photo storage.

const MAX_SIDE = 1600; // pixels; phone photos are shrunk before upload

/** Shrinks a photo to a ~200-500 KB JPEG so uploads are quick on mobile data. */
export async function compressPhoto(file: File): Promise<Blob> {
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
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't process that photo."))), "image/jpeg", 0.82),
  );
}

/** Compresses a photo, uploads it, and returns its public https link. */
export async function uploadPhoto(file: File): Promise<string> {
  const blob = await compressPhoto(file);
  const body = new FormData();
  body.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "Upload failed. Try again.");
  return data.url as string;
}
