const styles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  APPROVED: "bg-ok/10 text-ok",
  SALE_PENDING: "bg-blue-100 text-blue-900",
  REJECTED: "bg-danger/10 text-danger",
  SOLD: "bg-line text-muted",
};

// "Awaiting approval" is the admin's review. "Pending" is set by the seller when a sale is in progress.
const labels: Record<string, string> = {
  PENDING: "Awaiting approval",
  APPROVED: "Available",
  SALE_PENDING: "Pending",
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
