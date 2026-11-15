"use client";

import { useRef, useState } from "react";
import { SALE_CATEGORIES, CONDITIONS } from "@/lib/config";

export type ScreenshotDraft = {
  title: string; description: string; price: string; category: string;
  condition: string; location: string; photoUrl?: string;
};

function parseScreenshot(text: string): ScreenshotDraft {
  const lines = text.split(/\n/).map(s => s.trim()).filter(Boolean);
  const clean = lines.filter(s => !/^(today|yesterday|message|typing|online|search|whatsapp|forwarded|unread|pm|am)$/i.test(s));
  const combined = clean.join(" ");
  const priceMatch = combined.match(/(?:\$|USD\s*)([\d,]+(?:\.\d{1,2})?)\b/i) ||
    combined.match(/\b(?:asking|price|for)\s*[:\-]?\s*\$?([\d,]+(?:\.\d{1,2})?)\b/i);
  const price = priceMatch ? priceMatch[1].replace(/,/g, "") : "";
  const condition = /brand new|unopened|never used/i.test(combined) ? "New" :
    /like new|excellent|barely used/i.test(combined) ? "Like new" :
    /good condition|works great|gently used/i.test(combined) ? "Good" :
    /fair condition|worn/i.test(combined) ? "Fair" :
    /for parts|broken|not working/i.test(combined) ? "For parts" : "";
  const categories: [RegExp, string][] = [
    [/desk|chair|sofa|couch|table|dresser|bed|mattress|shelf|furniture/i, "Furniture"],
    [/phone|iphone|ipad|laptop|computer|tv|monitor|camera|headphones|electronics/i, "Electronics"],
    [/car|vehicle|bike|motorcycle|truck/i, "Vehicles"],
    [/shirt|dress|shoes|jacket|clothes|clothing/i, "Clothing"],
    [/book|textbook|novel|dvd/i, "Books & media"],
    [/toy|game|stroller|baby/i, "Toys & games"],
    [/garden|kitchen|lamp|appliance|vacuum/i, "Home & garden"],
    [/gym|sport|ski|tennis|fitness/i, "Sports & outdoors"],
  ];
  const category = categories.find(([re]) => re.test(combined))?.[1] || "Other";
  const locationMatch = combined.match(/(?:pickup|pick up|located|location|meet)\s*(?:in|at|near|:)?\s*(State College|Bellefonte|Boalsburg|Penn State|University Park|[A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/i);
  const location = locationMatch?.[1] || "";
  const titleLine = clean.find(s => /sell|selling|available|\$|desk|table|chair|phone|laptop|sofa/i.test(s)) || clean[0] || "";
  const title = titleLine.replace(/^(selling|for sale|available)\s*[:\-]?\s*/i, "")
    .replace(/\$[\d,.]+/g, "").replace(/\b(?:for|asking)\s+\d+(?:\.\d+)?\b/gi, "").trim().slice(0, 100);
  return {
    title: title.length >= 3 ? title : "",
    description: clean.join("\n").slice(0, 4000),
    price, category: (SALE_CATEGORIES as readonly string[]).includes(category) ? category : "Other",
    condition: (CONDITIONS as readonly string[]).includes(condition) ? condition : "",
    location,
  };
}

export function ScreenshotImporter({ onImport, onBusyChange }: {
  onImport: (draft: ScreenshotDraft) => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [text, setText] = useState("");
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState({ x: 0.05, y: 0.27, w: 0.9, h: 0.52 });
  const [draft, setDraft] = useState<ScreenshotDraft | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function pick(file?: File) {
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12 * 1024 * 1024) {
      setError("Choose a PNG, JPEG or WebP screenshot smaller than 12 MB."); return;
    }
    setBusy(true); onBusyChange?.(true); setError(""); setDraft(null);
    try {
      const bitmap = await createImageBitmap(file);
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 2200 / Math.max(bitmap.width, bitmap.height));
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      bitmap.close();
      const preview = new Image(); preview.src = canvas.toDataURL("image/jpeg", 0.85);
      await preview.decode(); setImage(preview);
      // OCR runs locally in the browser. No image is sent to an AI provider.
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      try {
        const result = await worker.recognize(canvas);
        setText(result.data.text);
        setDraft(parseScreenshot(result.data.text));
      } finally { await worker.terminate(); }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read screenshot.");
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  async function apply() {
    if (!draft || !image) return;
    setBusy(true); onBusyChange?.(true); setError("");
    try {
      const c = document.createElement("canvas");
      const sx = Math.round(crop.x * image.naturalWidth), sy = Math.round(crop.y * image.naturalHeight);
      const sw = Math.max(1, Math.round(crop.w * image.naturalWidth));
      const sh = Math.max(1, Math.round(crop.h * image.naturalHeight));
      const scale = Math.min(1, 1600 / Math.max(sw, sh));
      c.width = Math.round(sw * scale); c.height = Math.round(sh * scale);
      c.getContext("2d")!.drawImage(image, sx, sy, sw, sh, 0, 0, c.width, c.height);
      const blob = await new Promise<Blob>((resolve, reject) => c.toBlob(b => b ? resolve(b) : reject(new Error("Crop failed")), "image/jpeg", 0.82));
      const form = new FormData(); form.append("file", new File([blob], "cropped-product.jpg", { type: "image/jpeg" }));
      const response = await fetch("/api/upload", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok || !data.url) throw new Error(data.error || "Photo upload failed");
      onImport({ ...draft, photoUrl: data.url });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not upload cropped photo");
    } finally { setBusy(false); onBusyChange?.(false); }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 space-y-3">
      <h2 className="text-xl font-bold">Create from a screenshot (free)</h2>
      <p className="text-sm text-muted">Upload a WhatsApp sale screenshot. Text recognition runs on your device. Check every field before posting. Only repost your own items or posts you have permission to share.</p>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ""; }} disabled={busy} className="block w-full text-sm" />
      {busy && <p role="status">Reading screenshot or uploading cropped photo…</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {draft && image && (
        <div className="space-y-3">
          <p className="text-sm">Suggested crop: lower-middle part of the screenshot. Adjust the four sliders so the selection contains only the product photo (not names, phone numbers, or messages).</p>
          <div className="relative mx-auto max-w-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt="Uploaded screenshot" className="w-full" />
            <div className="absolute border-4 border-amber-400 bg-amber-300/20 pointer-events-none" style={{ left: `${crop.x*100}%`, top: `${crop.y*100}%`, width: `${crop.w*100}%`, height: `${crop.h*100}%` }} />
          </div>
          {(["x", "y", "w", "h"] as const).map(k => (
            <label key={k} className="block text-sm">{({ x: "Left edge", y: "Top edge", w: "Width", h: "Height" })[k]}
              <input type="range" min={0} max={100} value={Math.round(crop[k]*100)} onChange={e => {
                const val = Number(e.target.value)/100;
                setCrop(prev => {
                  const next = { ...prev, [k]: val };
                  next.w = Math.max(0.05, Math.min(next.w, 1-next.x));
                  next.h = Math.max(0.05, Math.min(next.h, 1-next.y));
                  return next;
                });
              }} className="w-full" />
            </label>
          ))}
          <details><summary className="cursor-pointer text-sm">Recognized text (review)</summary><pre className="whitespace-pre-wrap text-xs">{text}</pre></details>
          <p className="text-sm">Suggested: {draft.title || "Title not found"} · {draft.price ? `$${draft.price}` : "Price not found"} · {draft.category}</p>
          <button type="button" disabled={busy} onClick={() => void apply()} className="btn-primary">Use details and cropped photo</button>
        </div>
      )}
    </section>
  );
}
