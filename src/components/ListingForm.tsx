"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/actions";
import { CONDITIONS, HOUSING_CATEGORIES, RENTAL_CONDITION, SALE_CATEGORIES } from "@/lib/config";
import { PhotoUploader } from "./PhotoUploader";
import { SubmitButton } from "./SubmitButton";

type Props = {
  mode: "create" | "edit";
  action: (prev: FormState, fd: FormData) => Promise<FormState>;
  initial?: Record<string, string>;
  initialImages?: string[];
  kind?: "item" | "housing"; // edit mode works it out from the listing's category
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

export function ListingForm({ mode, action, initial = {}, initialImages = [], kind }: Props) {
  const [state, formAction] = useActionState(action, undefined);
  const [uploading, setUploading] = useState(false);
  const v = { ...initial, ...state?.values };
  const housing =
    (kind ?? ((HOUSING_CATEGORIES as readonly string[]).includes(v.category ?? "") ? "housing" : "item")) === "housing";
  const categories: readonly string[] = housing ? HOUSING_CATEGORIES : SALE_CATEGORIES;
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

      <Field
        label="Description"
        name="description"
        hint={
          housing ? "Include bedrooms, bathrooms, move-in date, lease length, and what utilities cost." : undefined
        }
        error={err("description")}
      >
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

      <div className={`grid gap-5 ${housing ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
        <Field label={housing ? "Rent per month" : "Price"} name="price" error={err("price")}>
          <input
            id="price"
            name="price"
            required
            inputMode="decimal"
            placeholder={housing ? "800" : "25.00"}
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
            {categories.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </Field>
        {housing ? (
          <input type="hidden" name="condition" value={RENTAL_CONDITION} />
        ) : (
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
        )}
      </div>

      <Field label={housing ? "Neighborhood or area" : "Location"} name="location" error={err("location")}>
        <input id="location" name="location" required defaultValue={v.location} className="input" {...a11y("location")} />
      </Field>

      <PhotoUploader initial={initialImages} onBusyChange={setUploading} error={err("images")} />

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

      <Field
        label="WhatsApp (optional)"
        name="whatsapp"
        hint="Adds a “Message on WhatsApp” button. Enter your number with country code (+1 555 123 4567) or your WhatsApp username. A username keeps your number private."
        error={err("whatsapp")}
      >
        <input
          id="whatsapp"
          name="whatsapp"
          placeholder="+1 555 123 4567 or @username"
          autoCapitalize="none"
          defaultValue={v.whatsapp}
          className="input"
          {...a11y("whatsapp")}
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

      <SubmitButton disabled={uploading} pendingText={mode === "create" ? "Posting…" : "Saving…"}>
        {mode === "create" ? "Post listing" : "Save changes"}
      </SubmitButton>
    </form>
  );
}
