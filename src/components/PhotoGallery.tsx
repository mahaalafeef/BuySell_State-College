"use client";

import { useRef, useState } from "react";
import { FramedImage } from "./FramedImage";

/** Swipeable photo viewer: swipe on phones, arrow buttons or keyboard arrows on computers, plus thumbnails. */
export function PhotoGallery({ photos, title }: { photos: string[]; title: string }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const count = photos.length;

  if (count === 0) {
    return (
      <div className="grid aspect-[4/3] min-w-0 place-items-center rounded-2xl bg-paper text-muted shadow-sm">
        No photo
      </div>
    );
  }

  function goTo(i: number) {
    const el = scroller.current;
    if (!el) return;
    const target = Math.max(0, Math.min(count - 1, i));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: target * el.clientWidth, behavior: reduce ? "auto" : "smooth" });
    setIndex(target);
  }

  function onScroll() {
    const el = scroller.current;
    if (!el || el.clientWidth === 0) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      goTo(index + 1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      goTo(index - 1);
    }
  }

  const arrow =
    "absolute top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-2xl leading-none text-ink shadow-md transition hover:bg-white";

  return (
    <div className="min-w-0 space-y-3">
      <div
        role="region"
        aria-roledescription="carousel"
        aria-label={`Photos of ${title}`}
        className="relative overflow-hidden rounded-2xl bg-paper shadow-md"
      >
        <div
          ref={scroller}
          onScroll={onScroll}
          onKeyDown={onKeyDown}
          tabIndex={0}
          className="flex snap-x snap-mandatory overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {photos.map((url, i) => (
            <div
              key={url}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
              className="aspect-[4/3] w-full shrink-0 snap-center"
            >
              <FramedImage src={url} alt={`${title}, photo ${i + 1}`} eager={i === 0} />
            </div>
          ))}
        </div>

        {count > 1 && (
          <>
            {index > 0 && (
              <button type="button" aria-label="Previous photo" onClick={() => goTo(index - 1)} className={`${arrow} left-3`}>
                ‹
              </button>
            )}
            {index < count - 1 && (
              <button type="button" aria-label="Next photo" onClick={() => goTo(index + 1)} className={`${arrow} right-3`}>
                ›
              </button>
            )}
            <p
              aria-live="polite"
              className="absolute bottom-3 right-3 rounded-full bg-ink/70 px-2.5 py-0.5 text-sm font-semibold text-white"
            >
              {index + 1} / {count}
            </p>
          </>
        )}
      </div>

      {count > 1 && (
        <ul className="grid grid-cols-5 gap-3">
          {photos.map((url, i) => (
            <li key={url}>
              <button
                type="button"
                onClick={() => goTo(i)}
                aria-label={`Show photo ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`block aspect-square w-full overflow-hidden rounded-lg transition ${
                  i === index ? "opacity-100" : "opacity-55 hover:opacity-100"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
              <span
                aria-hidden
                className={`mx-auto mt-1.5 block h-0.5 w-6 rounded-full ${i === index ? "bg-brand" : "bg-transparent"}`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
