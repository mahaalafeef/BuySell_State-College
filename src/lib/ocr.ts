// Free text reading (OCR) that runs inside the admin's own browser using Tesseract.js (open source).
// No account, no API key, no cost. The reader script is downloaded the first time it is used.
// The version is pinned on purpose so it can't change underneath you.
const SCRIPT_URL = "https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js";

export type Tesseract = {
  recognize: (
    image: File | Blob,
    lang: string,
    options?: { logger?: (m: { status: string; progress: number }) => void },
  ) => Promise<{ data: { text: string } }>;
};

declare global {
  interface Window {
    Tesseract?: Tesseract;
  }
}

let loading: Promise<Tesseract> | null = null;

export function loadTesseract(): Promise<Tesseract> {
  if (typeof window === "undefined") return Promise.reject(new Error("Text reading only works in the browser."));
  if (window.Tesseract) return Promise.resolve(window.Tesseract);
  if (loading) return loading;

  loading = new Promise<Tesseract>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => {
      if (window.Tesseract) resolve(window.Tesseract);
      else {
        loading = null;
        reject(new Error("The text reader didn't start. Please try again."));
      }
    };
    script.onerror = () => {
      loading = null;
      reject(new Error("Couldn't download the free text reader. Check your internet connection and try again."));
    };
    document.head.appendChild(script);
  });
  return loading;
}
