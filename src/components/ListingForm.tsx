"use client";

import { useActionState } from "react";
import type { FormState } from "@/app/actions";
import { CATEGORIES, CONDITIONS } from "@/lib/config";
import { SubmitButton } from "./SubmitButton";

type Props = {
  mode: "create" | "edit";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Record<string, string>;
};

function Field({
  label,
  name,
  hint,
  error,
  children,
}: {
  label: string;
  name: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1 block font-semibold">
        {label}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-sm text-muted">{hint}</p>}
      {error && (
        <p id={`${name}-error`} role="alert" className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function ListingForm({ mode, action, initial = {} }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const v = { ...initial, ...state?.values };
  const err = (name: string) => state?.fieldErrors?.[name]?.[0];
  const a11y = (name: string) => ({
    "aria-invalid": err(name) ? true : undefined,
    "aria-describedby": err(name) ? `${name}-error` : undefined,
  });

  return (
    <form action={formAction} className="space-y-5">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}

      <Field label="Title" name="title" error={err("title")}>
        <input id="title" name="title" required defaultValue={v.title} className="input" {...a11y("title")} />
      </Field>

      <Field label="Description" name="description" error={err("description")}>
        <textarea
          id="description"
          name="description"
          required
          rows={6}
          defaultValue={v.description}
          className="input"
          {...a11y("description")}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Price" name="price" error={err("price")}>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            placeholder="25.00"
            defaultValue={v.price}
            className="input"
            {...a11y("price")}
          />
        </Field>
        <Field label="Category" name="category" error={err("category")}>
          <select id="category" name="category" required defaultValue={v.category ?? ""} className="input">
            <option value="" disabled>
              Choose one
            </option>
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        <Field label="Condition" name="condition" error={err("condition")}>
          <select id="condition" name="condition" required defaultValue={v.condition ?? ""} className="input">
            <option value="" disabled>
              Choose one
            </option>
            {CONDITIONS.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Location" name="location" error={err("location")}>
        <input id="location" name="location" required defaultValue={v.location} className="input" {...a11y("location")} />
      </Field>

      <Field
        label="Photo link (optional)"
        name="imageUrl"
        hint="Paste a link to a photo. Photo uploads can be added later."
        error={err("imageUrl")}
      >
        <input
          id="imageUrl"
          name="imageUrl"
          type="url"
          placeholder="https://"
          defaultValue={v.imageUrl}
          className="input"
          {...a11y("imageUrl")}
        />
      </Field>

      <Field
        label="How buyers can reach you"
        name="contact"
        hint="This is shown on your listing."
        error={err("contact")}
      >
        <input
          id="contact"
          name="contact"
          required
          placeholder="Text 555-0100, or email me@example.com"
          defaultValue={v.contact}
          className="input"
          {...a11y("contact")}
        />
      </Field>

      <fieldset className="space-y-5 rounded-lg border border-line bg-white p-4">
        <legend className="px-1 font-display text-lg font-semibold">Edit access (private)</legend>
        <p className="text-sm text-muted">
          Only you see this. Later, you can edit this listing with your phone number or your passcode.
        </p>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Your phone number" name="phone" error={err("phone")}>
            <input
              id="phone"
              name="phone"
              type="tel"
              required
              autoComplete="tel"
              defaultValue={v.phone}
              className="input"
              {...a11y("phone")}
            />
          </Field>
          <Field
            label={mode === "create" ? "Passcode" : "New passcode (optional)"}
            name="passcode"
            hint={mode === "create" ? "At least 6 characters." : "Leave blank to keep your current passcode."}
            error={err("passcode")}
          >
            <input
              id="passcode"
              name="passcode"
              type="password"
              required={mode === "create"}
              autoComplete="new-password"
              className="input"
              {...a11y("passcode")}
            />
          </Field>
        </div>
      </fieldset>

      {/* Spam trap: hidden from people, bots fill it in */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website
          <input name="website" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <SubmitButton pendingText={mode === "create" ? "Posting…" : "Saving…"}>
        {mode === "create" ? "Post listing" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
