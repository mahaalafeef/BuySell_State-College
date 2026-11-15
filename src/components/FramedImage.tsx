/**
 * Shows the whole photo (never cropped). Any empty space around it is filled
 * with a soft blurred copy of the same photo, so tall or wide pictures still look polished.
 */
export function FramedImage({ src, alt, eager = false }: { src: string; alt: string; eager?: boolean }) {
  const loading = eager ? "eager" : "lazy";
  return (
    <div className="relative h-full w-full overflow-hidden bg-paper">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden
        loading={loading}
        draggable={false}
        className="absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} loading={loading} draggable={false} className="relative h-full w-full object-contain" />
    </div>
  );
}
