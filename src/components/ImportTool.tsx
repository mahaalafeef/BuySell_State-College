"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createImportedListing, parsePost, type Draft } from "@/app/import-actions";
import { CATEGORIES, CONDITIONS, RENTAL_CONDITION } from "@/lib/config";
import { PhotoUploader } from "./PhotoUploader";
import { SubmitButton } from "./SubmitButton";

export function ImportTool() {
  const [text, setText] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [round, setRound] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  async function read() {
    setBusy(true);
    setError(undefined);
    const res = await parsePost(text);
    setBusy(false);
    if (!res.draft) {
      setError(res.error ?? "Couldn't read that post.");
      return;
    }
    setDraft(res.draft);
    setRound((r) => r + 1);
  }

  function reset() {
    setText("");
    setDraft(null);
    setError(undefined);
  }

  return (
    <div className="space-y-6">
      <section className="space-y-3 rounded-xl border border-line bg-white p-4">
        <label htmlFor="post" className="block font-semibold">
          1. Paste the WhatsApp post
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
          {busy ? "Reading…" : "Read this post"}
        </button>
      </section>

      {draft && <DraftForm key={round} draft={draft} onDone={reset} />}
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

function DraftForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
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
      <p className="font-semibold">2. Check the details, add photos, and save</p>
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

      <PhotoUploader onBusyChange={setUploading} error={err("images")} />

      <label className="flex items-center gap-2">
        <input type="checkbox" name="publish" defaultChecked className="h-5 w-5" />
        <span>Publish right away (untick to send it to the review list)</span>
      </label>

      <SubmitButton disabled={uploading} pendingText="Saving…">
        Create listing
      </SubmitButton>
    </form>
  );
}
