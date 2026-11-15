import Link from "next/link";
import { LEGAL_UPDATED } from "@/lib/config";

export type LegalSection = { title: string; paragraphs?: string[]; bullets?: string[] };

export function LegalPage({
  title,
  intro,
  sections,
}: {
  title: string;
  intro: string;
  sections: LegalSection[];
}) {
  return (
    <article className="mx-auto max-w-3xl space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-muted">Last updated: {LEGAL_UPDATED}</p>
        <p>{intro}</p>
      </header>

      {sections.map((sec, i) => (
        <section key={sec.title} className="space-y-3">
          <h2 className="text-xl font-bold">
            {i + 1}. {sec.title}
          </h2>
          {sec.paragraphs?.map((t) => (
            <p key={t} className="whitespace-pre-wrap">
              {t}
            </p>
          ))}
          {sec.bullets && (
            <ul className="list-disc space-y-1.5 pl-6">
              {sec.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <nav className="flex flex-wrap gap-4 border-t border-line pt-4 text-sm">
        <Link href="/terms" className="underline">
          Terms of Use
        </Link>
        <Link href="/privacy" className="underline">
          Privacy Policy
        </Link>
        <Link href="/" className="underline">
          Back to the site
        </Link>
      </nav>
    </article>
  );
}
