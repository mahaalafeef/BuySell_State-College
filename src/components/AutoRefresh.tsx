"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Quietly reloads the page's data every few seconds while it is visible, so new messages appear by themselves. */
export function AutoRefresh({ seconds = 15 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, seconds * 1000);
    return () => clearInterval(timer);
  }, [router, seconds]);
  return null;
}
