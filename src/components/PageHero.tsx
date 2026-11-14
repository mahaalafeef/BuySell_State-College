export function PageHero({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-dark via-brand to-[#5A8DB8] px-5 py-8 text-white sm:px-10 sm:py-12">
      <div aria-hidden className="pointer-events-none absolute -right-16 -top-20 h-72 w-72 rounded-full bg-white/10" />
      <div aria-hidden className="pointer-events-none absolute -bottom-28 right-28 h-60 w-60 rounded-full bg-white/10" />
      <div className="relative max-w-2xl">
        <h1 className="text-4xl font-extrabold sm:text-5xl">{title}</h1>
        {subtitle && <p className="mt-3 text-lg text-white/85">{subtitle}</p>}
        {children && <div className="mt-6">{children}</div>}
      </div>
    </section>
  );
}
