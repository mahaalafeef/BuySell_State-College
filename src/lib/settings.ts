import { db } from "./db";

/** Auto-approve mode. The admin toggle (stored in the DB) wins over the env default. */
export async function getAutoApprove(): Promise<boolean> {
  const row = await db.setting.findUnique({ where: { key: "autoApprove" } });
  if (row) return row.value === "true";
  return process.env.AUTO_APPROVE_DEFAULT === "true";
}

export async function setAutoApprove(enabled: boolean) {
  await db.setting.upsert({
    where: { key: "autoApprove" },
    create: { key: "autoApprove", value: String(enabled) },
    update: { value: String(enabled) },
  });
}
