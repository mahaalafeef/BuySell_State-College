"use client";

import { useActionState } from "react";
import { verifyAccess } from "@/app/actions";
import { SubmitButton } from "./SubmitButton";

export function AccessForm({ defaultId = "" }: { defaultId?: string }) {
  const [state, formAction] = useActionState(verifyAccess, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-3 text-danger">
          {state.error}
        </p>
      )}
      <div>
        <label htmlFor="id" className="mb-1 block font-semibold">
          Post number or listing ID
        </label>
        <input id="id" name="id" defaultValue={state?.values?.id ?? defaultId} className="input" />
        <p className="mt-1 text-sm text-muted">
          Your post number looks like BSC-0042 and is shown after you post. Leave it blank to see every listing tied to your phone number.
        </p>
      </div>
      <div>
        <label htmlFor="credential" className="mb-1 block font-semibold">
          Passcode or phone number
        </label>
        <input id="credential" name="credential" type="password" required autoComplete="off" className="input" />
      </div>
      <SubmitButton pendingText="Checking…">Continue</SubmitButton>
    </form>
  );
}
