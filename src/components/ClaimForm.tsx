"use client";

import { useActionState } from "react";
import { claimListing } from "@/app/account-actions";
import { SubmitButton } from "./SubmitButton";

export function ClaimForm() {
  const [state, action] = useActionState(claimListing, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok/10 p-2.5 text-sm text-ok">
          Done! That listing is now in your account.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="claim-id" className="mb-1 block text-sm font-semibold">
            Listing ID
          </label>
          <input id="claim-id" name="id" required autoComplete="off" className="input" />
        </div>
        <div>
          <label htmlFor="claim-credential" className="mb-1 block text-sm font-semibold">
            Its passcode or phone number
          </label>
          <input id="claim-credential" name="credential" type="password" required autoComplete="off" className="input" />
        </div>
      </div>
      <SubmitButton pendingText="Checking…">Add to my account</SubmitButton>
    </form>
  );
}
