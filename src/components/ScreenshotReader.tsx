"use client";

import { useEffect, useRef, useState } from "react";
import { loadTesseract } from "@/lib/ocr";
import { cleanOcrText } from "@/lib/ocrClean";
import { findPhotoRegion } from "@/lib/photoCrop";

const DETECT_WIDTH = 480; // the photo finder works on a small copy of the screenshot
const MAX_OUT = 1600; // the saved photo is at most this many pixels on its longest side

type Edges = { left: number; top: number; right: number; bottom: number }; // percent of the screenshot, 0 to 100
const FULL: Edges = { left: 0, top: 0, right: 100, bottom: 100 };
const MIN_GAP = 5;

function detectPhoto(bitmap: ImageBitmap): Edges | null {
  const scale = Math.min(1, DETECT_WIDTH / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, w, h);
  const region = findPhotoRegion(ctx.getImageData(0, 0, w, h).data, w, h);
  if (!region) return null;
  const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)));
  return {
    left: clamp(region.x * 100),
    top: clamp(region.y * 100),
    right: clamp((region.x + region.w) * 100),
    bottom: clamp((region.y + region.h) * 100),
  };
}

function cropGeometry(bitmap: ImageBitmap, e: Edges) {
  const sx = Math.round((bitmap.width * e.left) / 100);
  const sy = Math.round((bitmap.height * e.top) / 100);
  const sw = Math.max(1, Math.round((bitmap.width * (e.right - e.left)) / 100));
  const sh = Math.max(1, Math.round((bitmap.height * (e.bottom - e.top)) / 100));
  const scale = Math.min(1, MAX_OUT / Math.max(sw, sh));
  return { sx, sy, sw, sh, w: Math.max(1, Math.round(sw * scale)), h: Math.max(1, Math.round(sh * scale)) };
}

function cropToBlob(bitmap: ImageBitmap, e: Edges): Promise<Blob | null> {
  const g = cropGeometry(bitmap, e);
  const canvas = document.createElement("canvas");
  canvas.width = g.w;
  canvas.height = g.h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(null);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, g.sx, g.sy, g.sw, g.sh, 0, 0, g.w, g.h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b), "image/jpeg", 0.85));
}

/**
 * Admin only (it lives on the admin import page). Reads a screenshot in the browser:
 * free text recognition for the post, plus an automatic crop of the product photo.
 */
export function ScreenshotReader({
  onText,
  onPhoto,
}: {
  onText: (text: string) => void;
  onPhoto: (photo: Blob | null) => void;
}) {
  const [working, setWorking] = useState(false);
  const [step, setStep] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string>();
  const [src, setSrc] = useState<string>();
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [edges, setEdges] = useState<Edges>(FULL);
  const [foundAuto, setFoundAuto] = useState(false);
  const [useCrop, setUseCrop] = useState(false);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const urlRef = useRef<string | undefined>(undefined);

  useEffect(
    () => () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // Show the cropped result, and hand the (debounced) photo to the import tool
  useEffect(() => {
    if (!bitmap) return;
    const canvas = previewRef.current;
    if (canvas) {
      const g = cropGeometry(bitmap, edges);
      const scale = Math.min(1, 480 / Math.max(g.sw, g.sh));
      canvas.width = Math.max(1, Math.round(g.sw * scale));
      canvas.height = Math.max(1, Math.round(g.sh * scale));
      canvas.getContext("2d")?.drawImage(bitmap, g.sx, g.sy, g.sw, g.sh, 0, 0, canvas.width, canvas.height);
    }
    if (!useCrop) {
      onPhoto(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const blob = await cropToBlob(bitmap, edges);
      if (!cancelled) onPhoto(blob);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [bitmap, edges, useCrop, onPhoto]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setError(undefined);
    setWorking(true);
    setProgress(null);
    setBitmap(null);
    onPhoto(null);
    try {
      setStep("Opening the screenshot…");
      let bmp: ImageBitmap;
      try {
        bmp = await createImageBitmap(file);
      } catch {
        throw new Error("Couldn't open that image. Use a PNG or JPEG screenshot.");
      }
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = URL.createObjectURL(file);
      setSrc(urlRef.current);

      setStep("Looking for the product photo…");
      const auto = detectPhoto(bmp);
      setFoundAuto(auto !== null);
      setEdges(auto ?? FULL);
      setUseCrop(auto !== null);
      setBitmap(bmp);

      setStep("Reading the text. The first time, a small free text reader is downloaded, so this can take a minute.");
      const tesseract = await loadTesseract();
      const result = await tesseract.recognize(file, "eng", {
        logger: (m) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const text = cleanOcrText(result.data.text);
      if (text.length < 10) {
        setError("I couldn't find much text in that screenshot. You can type or paste the post below instead.");
      } else {
        onText(text);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't read that screenshot.");
    } finally {
      setWorking(false);
      setStep("");
      setProgress(null);
    }
  }

  function setEdge(key: keyof Edges, value: number) {
    setEdges((prev) => {
      const next = { ...prev, [key]: value };
      if (next.left > next.right - MIN_GAP) {
        if (key === "left") next.left = next.right - MIN_GAP;
        else next.right = next.left + MIN_GAP;
      }
      if (next.top > next.bottom - MIN_GAP) {
        if (key === "top") next.top = next.bottom - MIN_GAP;
        else next.bottom = next.top + MIN_GAP;
      }
      return next;
    });
    setUseCrop(true);
  }

  const sliders: { key: keyof Edges; label: string }[] = [
    { key: "left", label: "Left edge" },
    { key: "right", label: "Right edge" },
    { key: "top", label: "Top edge" },
    { key: "bottom", label: "Bottom edge" },
  ];

  return (
    <div className="space-y-4">
      <div>
        <label
          className={`btn-primary cursor-pointer focus-within:ring-2 focus-within:ring-brand ${
            working ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {working ? "Working…" : src ? "Choose a different screenshot" : "Choose a screenshot"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            disabled={working}
            onChange={onPick}
            className="sr-only"
          />
        </label>
      </div>

      {working && (
        <p role="status" className="rounded-md bg-paper p-3 text-sm">
          {step}
          {progress !== null && <strong> {progress}%</strong>}
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {error}
        </p>
      )}

      {src && bitmap && (
        <div className="space-y-3">
          <p className="text-sm font-semibold">
            {foundAuto
              ? "I found the product photo automatically. Check the box below and adjust it if needed."
              : "I couldn't find the photo automatically. Move the sliders to frame it, or leave it out."}
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="relative inline-block max-w-full self-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="Your screenshot" className="block max-h-96 w-auto max-w-full rounded border border-line" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute border-2 border-brand bg-brand/10"
                style={{
                  left: `${edges.left}%`,
                  top: `${edges.top}%`,
                  width: `${edges.right - edges.left}%`,
                  height: `${edges.bottom - edges.top}%`,
                }}
              />
            </div>

            <div className="space-y-3">
              <p className="text-sm text-muted">The photo that will be added:</p>
              <canvas
                ref={previewRef}
                aria-label="Preview of the cropped photo"
                className="max-h-48 w-auto max-w-full rounded border border-line bg-white"
              />
              {sliders.map((s) => (
                <div key={s.key}>
                  <label htmlFor={`crop-${s.key}`} className="block text-sm font-semibold">
                    {s.label}
                  </label>
                  <input
                    id={`crop-${s.key}`}
                    type="range"
                    min={0}
                    max={100}
                    value={edges[s.key]}
                    onChange={(ev) => setEdge(s.key, Number(ev.target.value))}
                    className="w-full"
                  />
                </div>
              ))}
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={useCrop}
                  onChange={(ev) => setUseCrop(ev.target.checked)}
                  className="h-5 w-5"
                />
                <span>Add this photo to the listing</span>
              </label>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
