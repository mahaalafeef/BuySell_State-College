"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Tells the site a page was viewed (for the admin's visitor numbers). Shows nothing. */
export function VisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (pathname.startsWith("/admin")) return;
    const body = JSON.stringify({ path: pathname });
    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/visit", new Blob([body], { type: "application/json" }));
    } else {
      fetch("/api/visit", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }
  }, [pathname]);

  return null;
}
