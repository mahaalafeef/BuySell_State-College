"use client";

import { useEffect, useRef, useState } from "react";
import { suggestText, type SuggestResult } from "@/app/ai-suggest-actions";
import { findLocation } from "@/lib/localPlaces";

type FormField = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

function field(form: HTMLFormElement | null, name: string): FormField | null {
  const el = form?.elements.namedItem(name);
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement ? el : null;
}

function setValue(el: FormField, value: string) {
  el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}

/**
 * Sits inside the listing form. It fills in the location by itself when it finds a place in what the person typed,
 * and "Suggest improvements" offers title ideas, a clearer description and a location. Nothing changes until they tap "Use".
 */
export function WritingHelper({ titleIdeas = [] }: { titleIdeas?: string[] }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [ideas, setIdeas] = useState<string[]>(titleIdeas);
  const [autoPlace, setAutoPlace] = useState("");
  const [done, setDone] = useState("");

  // When the person leaves the title or description and the location is still empty, look for a place in their words
  useEffect(() => {
    const found = rootRef.current?.closest("form");
    if (!found) return;
    const form: HTMLFormElement = found;

    function onFocusOut(e: FocusEvent) {
      const target = e.target;
      if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
      if (target.name !== "title" && target.name !== "description") return;
      const loc = field(form, "location");
      if (!loc || loc.value.trim() !== "") return;
      const place = findLocation(`${field(form, "title")?.value ?? ""}. ${field(form, "description")?.value ?? ""}`);
      if (place) {
        setValue(loc, place);
        setAutoPlace(place);
      }
    }
    function onInput(e: Event) {
      if (e.target instanceof HTMLInputElement && e.target.name === "location") setAutoPlace(""); // they changed it themselves
    }

    form.addEventListener("focusout", onFocusOut);
    form.addEventListener("input", onInput);
    return () => {
      form.removeEventListener("focusout", onFocusOut);
      form.removeEventListener("input", onInput);
    };
  }, []);

  async function improve() {
    const form = rootRef.current?.closest("form") ?? null;
    const get = (name: string) => field(form, name)?.value ?? "";
    setBusy(true);
    setDone("");
    try {
      const r = await suggestText({ title: get("title"), description: get("description"), location: get("location"), category: get("category") });
      setResult(r);
      if (r.titles && r.titles.length > 0) setIdeas(r.titles);
    } catch {
      setResult({ error: "Couldn't get suggestions. Check your connection and try again." });
    } finally {
      setBusy(false);
    }
  }

  function apply(name: "title" | "description" | "location", value: string, message: string) {
    const el = field(rootRef.current?.closest("form") ?? null, name);
    if (!el) return;
    setValue(el, value);
    if (name === "location") setAutoPlace("");
    setDone(message);
  }

  return (
    <div ref={rootRef} className="rounded-lg border border-brand/30 bg-brand/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Writing helper</p>
        <button type="button" onClick={() => void improve()} disabled={busy} className="btn-ghost">
          {busy ? "Thinking…" : result ? "Suggest again" : "Suggest improvements"}
        </button>
      </div>
      <p className="mt-1 text-sm text-muted">
        Get title ideas, a clearer description and the location from your words. Nothing changes until you tap &ldquo;Use&rdquo;.
      </p>

      <div aria-live="polite">
        {autoPlace && (
          <p className="mt-3 rounded-md bg-white p-2.5 text-sm">
            We filled in the location from your text: <strong>{autoPlace}</strong>. Change it if that isn&rsquo;t right.
          </p>
        )}

        {result?.error && (
          <p role="alert" className="mt-3 rounded-md bg-danger/10 p-2.5 text-sm text-danger">
            {result.error}
          </p>
        )}

        {ideas.length > 0 && (
          <div className="mt-3">
            <p className="text-sm font-semibold">Title ideas</p>
            <ul className="mt-1 space-y-1">
              {ideas.map((t) => (
                <li key={t}>
                  <button
                    type="button"
                    onClick={() => apply("title", t, "Title updated.")}
                    className="w-full rounded-md border border-line bg-white px-3 py-2 text-left hover:bg-paper"
                  >
                    {t}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result?.description && (
          <div className="mt-3">
            <p className="text-sm font-semibold">A clearer description</p>
            <p className="mt-1 whitespace-pre-wrap rounded-md border border-line bg-white p-3 text-sm">{result.description}</p>
            <button type="button" onClick={() => apply("description", result.description ?? "", "Description updated.")} className="btn-ghost mt-2">
              Use this description
            </button>
          </div>
        )}

        {result?.location && (
          <p className="mt-3 text-sm">
            <span className="font-semibold">Location found:</span> {result.location}{" "}
            <button type="button" onClick={() => apply("location", result.location ?? "", "Location updated.")} className="ml-1 underline">
              Use it
            </button>
          </p>
        )}

        {result?.tips && result.tips.length > 0 && (
          <ul className="mt-3 list-disc space-y-0.5 pl-5 text-sm">
            {result.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}

        {result?.note && <p className="mt-3 text-sm text-muted">{result.note}</p>}
        {done && (
          <p role="status" className="mt-3 text-sm font-semibold">
            {done}
          </p>
        )}
      </div>
    </div>
  );
}
