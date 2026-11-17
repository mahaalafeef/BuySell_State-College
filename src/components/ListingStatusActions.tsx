import { setListingStatus } from "@/app/actions";

/** Buttons that let a seller move a listing between Available, Pending (sale in progress) and Sold. */
export function ListingStatusActions({ id, status }: { id: string; status: string }) {
  const to = (next: "APPROVED" | "SALE_PENDING" | "SOLD") => setListingStatus.bind(null, id, next);
  return (
    <>
      {status === "APPROVED" && (
        <>
          <form action={to("SALE_PENDING")}>
            <button className="btn-ghost">Mark as pending</button>
          </form>
          <form action={to("SOLD")}>
            <button className="btn-ghost">Mark as sold</button>
          </form>
        </>
      )}
      {status === "SALE_PENDING" && (
        <>
          <form action={to("APPROVED")}>
            <button className="btn-ghost">Make available again</button>
          </form>
          <form action={to("SOLD")}>
            <button className="btn-ghost">Mark as sold</button>
          </form>
        </>
      )}
      {status === "SOLD" && (
        <form action={to("APPROVED")}>
          <button className="btn-ghost">Relist</button>
        </form>
      )}
    </>
  );
}
