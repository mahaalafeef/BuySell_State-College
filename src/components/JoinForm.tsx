"use client";

import Link from "next/link";
import { useState } from "react";
import { submitJoin, type JoinState } from "@/app/join-actions";
import { JOIN_ROLES } from "@/lib/join";

const TARGET_BYTES = 800 * 1024; // keep uploads small so they send quickly on mobile data

/** Shrinks a photo to a JPEG under about 800 KB. */
async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("Couldn't read that photo. Try a JPEG or PNG.");
  }
  let side = 1600;
  let quality = 0.82;
  for (let i = 0; i < 8; i++) {
    const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((r) => canvas.toBlob(r, "image/jpeg", quality));
    if (blob && blob.size <= TARGET_BYTES) {
      bitmap.close();
      return blob;
    }
    quality = Math.max(0.5, quality - 0.1);
    if (quality <= 0.5) side = Math.round(side * 0.8);
  }
  bitmap.close();
  throw new Error("That photo is too large. Try a smaller one.");
}

function Field({ label, name, error, hint, children }: { label: string; name: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={`join-${name}`} className="mb-1 block font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {error && (
        <p role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Sent({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}${path}`;
  return (
    <div role="status" className="space-y-4 rounded-xl bg-ok/10 p-5">
      <p className="text-lg font-semibold text-ok">Thanks! Your request was sent.</p>
      <p>
        <strong>Save your personal link.</strong> Use it to check your request. Once you&rsquo;re approved, the same link
        lets you choose your password and log in. Please don&rsquo;t share it.
      </p>
      <p className="break-all rounded-md bg-white p-3 text-sm">{link}</p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-primary"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(link);
              setCopied(true);
            } catch {
              /* the link is shown above, so it can be copied by hand */
            }
          }}
        >
          {copied ? "Copied!" : "Copy link"}
        </button>
        <Link href={path} className="btn-ghost">
          Check my request
        </Link>
      </div>
      <p className="text-sm text-muted">Tip: bookmark this page or send the link to yourself on WhatsApp.</p>
    </div>
  );
}

export function JoinForm() {
  const [proof, setProof] = useState<{ blob: Blob; url: string } | null>(null);
  const [proofError, setProofError] = useState<string>();
  const [working, setWorking] = useState(false);
  const [sending, setSending] = useState(false);
  const [state, setState] = useState<JoinState>();

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setProofError(undefined);
    setWorking(true);
    try {
      const blob = await shrink(file);
      if (proof) URL.revokeObjectURL(proof.url);
      setProof({ blob, url: URL.createObjectURL(blob) });
    } catch (err) {
      setProofError(err instanceof Error ? err.message : "Couldn't use that photo.");
    } finally {
      setWorking(false);
    }
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    fd.delete("proof");
    if (proof) fd.set("proof", new File([proof.blob], "proof.jpg", { type: "image/jpeg" }));
    setSending(true);
    try {
      setState(await submitJoin(fd));
    } catch {
      setState({ error: "Something went wrong. Please try again." });
    } finally {
      setSending(false);
    }
  }

  if (state?.ok) {
    return state.path ? (
      <Sent path={state.path} />
    ) : (
      <p role="status" className="rounded-xl bg-ok/10 p-5 text-lg text-ok">
        We already have a request from you. Open the personal link you saved to check on it.
      </p>
    );
  }

  const fe = state?.fieldErrors ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}

      <Field label="Your name" name="name" error={fe.name}>
        <input id="join-name" name="name" required autoComplete="name" className="input" />
      </Field>

      <Field
        label="Your WhatsApp number or username"
        name="whatsapp"
        error={fe.whatsapp}
        hint="Include the country code, like +1 555 123 4567. We'll use it to send your invite."
      >
        <input id="join-whatsapp" name="whatsapp" required autoComplete="tel" className="input" />
      </Field>

      <Field label="Which describes you best?" name="role" error={fe.role}>
        <select id="join-role" name="role" required defaultValue="" className="input">
          <option value="" disabled>
            Choose one
          </option>
          {JOIN_ROLES.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
      </Field>

      <div>
        <p className="mb-1 font-semibold">Proof of your connection</p>
        <p className="mb-3 text-sm text-muted">
          Add a photo or screenshot of ONE of these: your Penn State ID or student account page, a Penn State email or
          portal page showing your name, or a current lease or utility bill showing a State College address. Cover
          anything we don&rsquo;t need, like ID numbers, birth date, and account numbers.
        </p>

        {proof && (
          <div className="mb-3 flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={proof.url} alt="Your proof photo preview" className="h-28 w-28 rounded-lg object-cover shadow" />
            <button
              type="button"
              onClick={() => {
                URL.revokeObjectURL(proof.url);
                setProof(null);
              }}
              className="btn-ghost"
            >
              Remove
            </button>
          </div>
        )}

        <label className={`btn-ghost cursor-pointer focus-within:ring-2 focus-within:ring-brand ${working ? "pointer-events-none opacity-60" : ""}`}>
          {working ? "Preparing…" : proof ? "Choose a different photo" : "Add a photo"}
          <input type="file" accept="image/*" onChange={onPick} className="sr-only" />
        </label>
        {(proofError || fe.proof) && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {proofError || fe.proof}
          </p>
        )}
      </div>

      <Field label="Anything else we should know? (optional)" name="note">
        <textarea id="join-note" name="note" rows={3} maxLength={500} className="input" />
      </Field>

      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div>
        <label className="flex items-start gap-3">
          <input type="checkbox" name="consent" className="mt-1 h-5 w-5 shrink-0" />
          <span>
            I am 18 or older and I agree to the{" "}
            <Link href="/terms" target="_blank" className="underline">
              Terms of Use
            </Link>{" "}
            and{" "}
            <Link href="/privacy" target="_blank" className="underline">
              Privacy Policy
            </Link>
            . I understand the site is only a place to connect and is not part of any sale or rental. I agree that the
            site admin may look at my photo to confirm my connection. It is private, only the admin can see it, and it
            is deleted as soon as my request is reviewed.
          </span>
        </label>
        {fe.consent && (
          <p role="alert" className="mt-1 text-sm text-danger">
            {fe.consent}
          </p>
        )}
      </div>

      <button type="submit" disabled={sending || working} className="btn-primary">
        {sending ? "Sending…" : "Send join request"}
      </button>
    </form>
  );
}
