export function Stars({ value, className = "" }: { value: number; className?: string }) {
  const filled = Math.round(value);
  return (
    <span role="img" aria-label={`${value.toFixed(1)} out of 5 stars`} className={`inline-flex text-amber-500 ${className}`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} aria-hidden className={n <= filled ? "" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}
