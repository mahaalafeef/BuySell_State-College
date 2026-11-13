const styles: Record<string, string> = {
  PENDING: "bg-tag/30 text-ink",
  APPROVED: "bg-ok/10 text-ok",
  REJECTED: "bg-danger/10 text-danger",
  SOLD: "bg-line text-muted",
};

const labels: Record<string, string> = {
  PENDING: "Waiting for approval",
  APPROVED: "Live",
  REJECTED: "Not approved",
  SOLD: "Sold",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-sm font-semibold ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
