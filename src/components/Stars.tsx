/** A row of five stars, filled to the nearest whole star. */
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span role="img" aria-label={`${rating.toFixed(1)} out of 5 stars`} className={`whitespace-nowrap ${className}`}>
      <span className="text-amber-500">{"★".repeat(full)}</span>
      <span className="text-line">{"★".repeat(5 - full)}</span>
    </span>
  );
}
