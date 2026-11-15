import { db } from "@/lib/db";
import { isAdmin } from "@/lib/session";

export const dynamic = "force-dynamic";

// Only the signed-in admin can see a proof photo.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("Not allowed", { status: 403 });

  const { id } = await params;
  const row = await db.joinRequest.findUnique({ where: { id }, select: { proof: true } });
  if (!row?.proof) return new Response("No proof on file", { status: 404 });

  return new Response(new Uint8Array(row.proof), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
