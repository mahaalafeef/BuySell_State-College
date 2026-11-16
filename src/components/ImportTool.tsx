"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createImportedListing, parsePost, type Draft } from "@/app/import-actions";
import { CATEGORIES, CONDITIONS, RENTAL_CONDITION } from "@/lib/config";
import { PhotoUploader } from "./PhotoUploader";
import { ScreenshotReader } from "./ScreenshotReader";
import { SubmitButton } from "./SubmitButton";

/** Saves a cropped photo with the same upload route the photo button uses (admins are allowed). */
async function uploadPhoto(blob: Blob): Promise<string> {
  const body = new FormData();
  body.append("file", new File([blob], "photo.jpg", { type: "image/jpeg" }));
  const res = await fetch("/api/upload", { method: "POST", body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "upload failed");
  return data.url as string;
}

export function ImportTool() {
  const [text, setText] = useState("");
  const [fromScreenshot, setFromScreenshot] = useState(false);
  const [photoBlob, setPhotoBlob] = useState<Blob | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [shotKey, setShotKey] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [note, setNote] = useState<string>();

  async function read() {
    setBusy(true);
    setError(undefined);
    const res = await parsePost(text);
    if (!res.draft) {
      setBusy(false);
      setError(res.error ?? "Couldn't read that post.");
      return;
    }
    let urls: string[] = [];
    let photoNote: string | undefined;
    if (photoBlob) {
      try {
        urls = [await uploadPhoto(photoBlob)];
      } catch (err) {
        photoNote = `The cropped photo couldn't be saved (${err instanceof Error ? err.message : "upload failed"}). Add it with the photo button below.`;
      }
    }
    setBusy(false);
    setNote([res.note, photoNote].filter(Boolean).join(" ") || undefined);
    setPhotos(urls);
    setDraft(res.draft);
    setRound((r) => r + 1);
  }

  function reset() {
    setText("");
    setFromScreenshot(false);
    setPhotoBlob(null);
    setPhotos([]);
    setShotKey((k) => k + 1);
    setDraft(null);
    setError(undefined);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <p className="font-semibold">Option A: Start from a screenshot</p>
        <p className="text-sm text-muted">
          Free and automatic. The text is read on this device, and the product photo is cropped out for you. Use a
          screenshot of one post.
        </p>
        <ScreenshotReader
          key={shotKey}
          onText={(t) => {
            setText(t);
            setFromScreenshot(true);
          }}
          onPhoto={setPhotoBlob}
        />
      </section>

      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <label htmlFor="post" className="block font-semibold">
          {fromScreenshot ? "The text read from the screenshot (fix any mistakes)" : "Option B: Paste the post text"}
        </label>
        <textarea
          id="post"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          maxLength={4000}
          placeholder="Long-press the message in WhatsApp, tap Copy, then paste it here."
          className="input"
        />
        {error && (
          <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
            {error}
          </p>
        )}
        <button type="button" onClick={read} disabled={busy || text.trim().length < 10} className="btn-primary">
          {busy ? "Reading…" : "Fill in the listing"}
        </button>
      </section>

      {draft && note && <p className="rounded-md bg-amber-100 p-3 text-sm text-amber-900">{note}</p>}
      {draft && <DraftForm key={round} draft={draft} photos={photos} reviewFirst={fromScreenshot} onDone={reset} />}
    </div>
  );
}

function Field({
  label,
  name,
  error,
  children,
}: {
  label: string;
  name: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={`imp-${name}`} className="mb-1 block text-sm font-semibold">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function DraftForm({
  draft,
  photos,
  reviewFirst,
  onDone,
}: {
  draft: Draft;
  photos: string[];
  reviewFirst: boolean;
  onDone: () => void;
}) {
  const [state, action] = useActionState(createImportedListing, undefined);
  const [uploading, setUploading] = useState(false);
  const err = (n: string) => state?.fieldErrors?.[n]?.[0];

  if (state?.ok) {
    return (
      <section className="space-y-3 rounded-xl border border-line bg-white p-4" role="status">
        <p className="rounded-md bg-ok/10 p-3 text-ok">The listing was created.</p>
        <div className="flex flex-wrap gap-2">
          <Link href={`/listings/${state.id}`} className="btn-primary">
            View listing
          </Link>
          <button type="button" onClick={onDone} className="btn-ghost">
            Import another post
          </button>
        </div>
      </section>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-xl border border-line bg-white p-4">
      <p className="font-semibold">Check the details, add photos, and save</p>
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <Field label="Title" name="title" error={err("title")}>
        <input id="imp-title" name="title" required defaultValue={draft.title} className="input" />
      </Field>
      <Field label="Description" name="description" error={err("description")}>
        <textarea id="imp-description" name="description" required rows={6} defaultValue={draft.description} className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price (rent per month for housing)" name="price" error={err("price")}>
          <input id="imp-price" name="price" required inputMode="decimal" defaultValue={draft.price} className="input" />
        </Field>
        <Field label="Category" name="category" error={err("category")}>
          <select id="imp-category" name="category" required defaultValue={draft.category} className="input">
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Condition" name="condition" error={err("condition")}>
          <select id="imp-condition" name="condition" required defaultValue={draft.condition} className="input">
            <option value="" disabled>
              Choose one
            </option>
            {[...CONDITIONS, RENTAL_CONDITION].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Location" name="location" error={err("location")}>
        <input id="imp-location" name="location" required defaultValue={draft.location} className="input" />
      </Field>
      <Field label="How buyers can reach the poster (shown publicly)" name="contact" error={err("contact")}>
        <input id="imp-contact" name="contact" required defaultValue={draft.contact} className="input" />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp number or username (optional, shows a button)" name="whatsapp" error={err("whatsapp")}>
          <input id="imp-whatsapp" name="whatsapp" defaultValue={draft.whatsapp} className="input" />
        </Field>
        <Field label="Poster's private phone (optional, lets them edit later)" name="phone" error={err("phone")}>
          <input id="imp-phone" name="phone" type="tel" defaultValue={draft.phone} className="input" />
        </Field>
      </div>

      <PhotoUploader initial={photos} onBusyChange={setUploading} error={err("images")} />

      <label className="flex items-center gap-2">
        <input type="checkbox" name="publish" defaultChecked={!reviewFirst} className="h-5 w-5" />
        <span>
          Publish right away (untick to send it to the review list
          {reviewFirst ? ", which is the default for screenshots because the text reader can make mistakes" : ""})
        </span>
      </label>

      <SubmitButton disabled={uploading} pendingText="Saving…">
        Create listing
      </SubmitButton>
    </form>
  );
}
