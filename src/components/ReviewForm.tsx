"use client";

import { useActionState } from "react";
import type { ReviewState } from "@/app/review-actions";
import { SubmitButton } from "./SubmitButton";

export function ReviewForm({
  action,
  initialRating,
  initialComment,
}: {
  action: (prev: ReviewState, fd: FormData) => Promise<ReviewState>;
  initialRating?: number;
  initialComment?: string;
}) {
  const [state, formAction] = useActionState(action, undefined);

  return (
    <form action={formAction} className="space-y-3 rounded-lg border border-line bg-white p-4">
      <fieldset>
        <legend className="font-semibold">{initialRating ? "Your review" : "Rate this seller"}</legend>
        <div className="mt-2 flex flex-wrap gap-4">
          {[5, 4, 3, 2, 1].map((n) => (
            <label key={n} className="flex items-center gap-1.5">
              <input
                type="radio"
                name="rating"
                value={n}
                defaultChecked={initialRating === n}
                required
                className="h-5 w-5"
              />
              <span>
                {n} {n === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-comment" className="block font-semibold">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={3}
          maxLength={500}
          defaultValue={initialComment ?? ""}
          className="input"
          placeholder="How was it dealing with this seller? Please don't include phone numbers or other private details."
        />
      </div>

      {state?.error && (
        <p role="alert" className="text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="text-ok">
          Thanks! Your review is saved.
        </p>
      )}
      <SubmitButton pendingText="Saving…">{initialRating ? "Update review" : "Post review"}</SubmitButton>
    </form>
  );
}
