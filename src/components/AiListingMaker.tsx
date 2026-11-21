"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createListing } from "@/app/actions";
import { draftListing, type AiDraft } from "@/app/ai-listing-actions";
import { HOUSING_CATEGORIES } from "@/lib/config";
import { uploadPhoto } from "@/lib/clientPhotos";
import { ListingForm } from "./ListingForm";

const MAX_PHOTOS = 5;

type Photo = { id: string; file: File; preview: string; url?: string };
type Result = { draft: AiDraft; notes: string[]; titleIdeas: string[]; usedAi: boolean; images: string[]; key: number };

/**
 * Quick post: the member adds photos and a few words, AI writes a draft, and the member reviews it
 * in the normal listing form (every field can be changed) before anything is posted.
 */
export function AiListingMaker() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [note, setNote] = useState("");
  const [phase, setPhase] = useState<"input" | "working" | "review">("input");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);

  // Free the photo previews when leaving the page
  const photosRef = useRef<Photo[]>([]);
  photosRef.current = photos;
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.preview)), []);

  function addFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const room = MAX_PHOTOS - photos.length;
    const picked = Array.from(e.target.files ?? [])
      .filter((f) => f.type.startsWith("image/"))
      .slice(0, room);
    e.target.value = ""; // lets the same photo be picked again later
    if (picked.length === 0) return;
    setError("");
    setPhotos((prev) => [...prev, ...picked.map((file) => ({ id: crypto.randomUUID(), file, preview: URL.createObjectURL(file) }))]);
  }

  function removePhoto(id: string) {
    setPhotos((prev) => {
      const gone = prev.find((p) => p.id === id);
      if (gone) URL.revokeObjectURL(gone.preview);
      return prev.filter((p) => p.id !== id);
    });
  }

  async function create() {
    if (photos.length === 0 && note.trim().length < 10) {
      setError("Add a photo, or write a short description.");
      return;
    }
    setError("");
    setPhase("working");
    try {
      const urls: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        let url = photo.url;
        if (!url) {
          setStatus(`Uploading photo ${i + 1} of ${photos.length}…`);
          url = await uploadPhoto(photo.file);
          const uploaded = url;
          setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, url: uploaded } : p))); // no need to upload again if we retry
        }
        urls.push(url);
      }

      setStatus("Writing your listing…");
      const r = await draftListing({ imageUrls: urls, note });
      if (r.error || !r.draft) {
        setError(r.error ?? "Something went wrong. Please try again.");
        setPhase("input");
        return;
      }
      setResult({ draft: r.draft, notes: r.notes ?? [], titleIdeas: r.titleIdeas ?? [], usedAi: r.usedAi ?? false, images: urls, key: Date.now() });
      setPhase("review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setPhase("input");
    }
  }

  /* ---------- Step 3: review the draft in the normal form ---------- */
  if (phase === "review" && result) {
    const kind = (HOUSING_CATEGORIES as readonly string[]).includes(result.draft.category) ? "housing" : "item";
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-bold">Check your listing</h1>
          <button type="button" onClick={() => setPhase("input")} className="text-sm underline">
            &larr; Back to my photos and words
          </button>
        </div>

        <div role="status" className="rounded-lg border border-brand/30 bg-brand/5 p-4">
          <p className="font-semibold">
            {result.usedAi ? "Here is your draft, written by AI." : "AI wasn't used for this draft, so it only tidies your words."} Nothing is posted yet.
          </p>
          <p className="mt-1 text-sm">
            Please read it carefully and check the price, condition and details match what you are selling. You can change anything below before you post.
          </p>
          {result.notes.length > 0 && (
            <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm">
              {result.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          )}
        </div>

        <ListingForm
          key={result.key}
          mode="create"
          kind={kind}
          action={createListing}
          initial={{ ...result.draft }}
          initialImages={result.images}
          titleIdeas={result.titleIdeas}
        />
      </div>
    );
  }

  /* ---------- Steps 1 and 2: photos and a few words ---------- */
  const working = phase === "working";
  const full = photos.length >= MAX_PHOTOS;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Quick post with AI</h1>
        <p className="mt-2 text-muted">
          Add photos and write a few words. AI writes the listing for you, and you check it before it goes live.
        </p>
        <div className="mt-2 text-sm">
          <Link href="/sell" className="underline">
            Prefer to fill in the form yourself?
          </Link>
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {error}
        </p>
      )}

      <section aria-labelledby="ai-photos">
        <h2 id="ai-photos" className="mb-2 font-semibold">
          1. Add photos <span className="font-normal text-muted">(up to {MAX_PHOTOS})</span>
        </h2>

        {photos.length > 0 && (
          <ul className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {photos.map((p, i) => (
              <li key={p.id} className="relative aspect-square overflow-hidden rounded-md border border-line bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 rounded-sm bg-white/90 px-1.5 text-xs font-semibold">Cover</span>}
                {!working && (
                  <button
                    type="button"
                    aria-label={`Remove photo ${i + 1}`}
                    onClick={() => removePhoto(p.id)}
                    className="absolute right-1 top-1 grid h-8 w-8 place-items-center rounded-full bg-ink/80 text-lg leading-none text-white"
                  >
                    ×
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap gap-2">
          {/* On a phone this opens the camera; on a computer it opens the file picker */}
          <label
            className={`btn-primary cursor-pointer focus-within:ring-2 focus-within:ring-brand sm:hidden ${working || full ? "pointer-events-none opacity-60" : ""}`}
          >
            Take a photo
            <input type="file" accept="image/*" capture="environment" disabled={working || full} onChange={addFiles} className="sr-only" />
          </label>
          <label
            className={`btn-ghost cursor-pointer focus-within:ring-2 focus-within:ring-brand ${working || full ? "pointer-events-none opacity-60" : ""}`}
          >
            {photos.length ? "Add more photos" : "Choose photos"}
            <input type="file" accept="image/*" multiple disabled={working || full} onChange={addFiles} className="sr-only" />
          </label>
        </div>
        <p className="mt-1 text-sm text-muted">Good light and a plain background help. The first photo is the cover.</p>
      </section>

      <section aria-labelledby="ai-note">
        <h2 id="ai-note" className="mb-2 font-semibold">
          2. Say a few words about it
        </h2>
        <label htmlFor="ai-note-text" className="sr-only">
          A few words about what you are posting
        </label>
        <textarea
          id="ai-note-text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          disabled={working}
          maxLength={1000}
          rows={4}
          placeholder="Example: IKEA desk lamp, used for a year, works great. $15, pick up near campus."
          className="input"
        />
        <p className="mt-1 text-sm text-muted">
          Mention the price, the condition and where to pick it up. Don&rsquo;t worry about spelling, AI tidies the writing.
        </p>
      </section>

      <div>
        <button type="button" onClick={() => void create()} disabled={working} className="btn-primary w-full sm:w-auto">
          {working ? "Working…" : "Create my listing"}
        </button>
        <p role="status" aria-live="polite" className="mt-2 text-sm text-muted">
          {working ? status : ""}
        </p>
        <p className="mt-3 text-xs text-muted">
          Your photos and words are sent to an AI service to write the draft (see our{" "}
          <Link href="/privacy" target="_blank" className="underline">
            Privacy Policy
          </Link>
          ). Please don&rsquo;t include photos of people, IDs or documents.
        </p>
      </div>
    </div>
  );
}
