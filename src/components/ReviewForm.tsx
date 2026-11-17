"use client";

import { useActionState, useState } from "react";
import { saveReview } from "@/app/account-actions";
import { SubmitButton } from "./SubmitButton";

export function ReviewForm({
  sellerId,
  existing,
}: {
  sellerId: string;
  existing?: { rating: number; comment: string };
}) {
  const [state, action] = useActionState(saveReview.bind(null, sellerId), undefined);
  const [rating, setRating] = useState(existing?.rating ?? 0);

  return (
    <form action={action} className="space-y-3 rounded-xl border border-line bg-white p-4">
      <h3 className="text-lg font-bold">{existing ? "Your review" : "Leave a review"}</h3>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className={`cursor-pointer rounded-md px-0.5 text-3xl leading-none focus-within:ring-2 focus-within:ring-brand ${
                n <= rating ? "text-amber-500" : "text-line"
              }`}
            >
              <input
                type="radio"
                name="rating"
                value={n}
                checked={rating === n}
                onChange={() => setRating(n)}
                required
                className="sr-only"
              />
              <span aria-hidden>★</span>
              <span className="sr-only">
                {n} {n === 1 ? "star" : "stars"}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="review-comment" className="mb-1 block text-sm font-semibold">
          Comment (optional)
        </label>
        <textarea
          id="review-comment"
          name="comment"
          rows={3}
          maxLength={600}
          defaultValue={existing?.comment}
          placeholder="How was dealing with this seller?"
          className="input"
        />
      </div>

      {state?.error && (
        <p role="alert" className="rounded-md bg-danger/10 p-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}
      {state?.ok && (
        <p role="status" className="rounded-md bg-ok/10 p-2.5 text-sm text-ok">
          Thanks, your review was saved.
        </p>
      )}
      <SubmitButton pendingText="Saving…">{existing ? "Update review" : "Post review"}</SubmitButton>
    </form>
  );
}
