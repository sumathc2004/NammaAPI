import "server-only";
import { aepsRequest, AEPS_UNEXPECTED_ERROR } from "@/lib/server/aepsClient";
import { accountLabel, type ApiLevelBalance } from "@/lib/admin/apiBalance";
import type { SessionCredentials } from "@/lib/server/session";

export type ApiBalanceResult = { ok: true; balance: ApiLevelBalance } | { ok: false; error: string };

const toNumber = (value: unknown): number | null => {
  const n = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(/,/g, "")) : NaN;
  return Number.isFinite(n) ? n : null;
};

/**
 * Admin-only: `POST getapiLevelbalance?UserName=&Password=` (POST, parameters in the query string).
 * Response: { Status: true, Message: "Success", Data: { wallet, bul_0080, …, diff } }.
 */
export async function fetchApiLevelBalance(credentials: SessionCredentials): Promise<ApiBalanceResult> {
  const result = await aepsRequest(
    "getapiLevelbalance",
    { UserName: credentials.userName, Password: credentials.password },
    { method: "POST", prefer: "json" },
  );
  if (!result.ok) return result;

  const body = (result.body ?? {}) as { Status?: unknown; Message?: unknown; Data?: unknown };
  const message = typeof body.Message === "string" ? body.Message.trim() : "";
  if (body.Status !== true && !/^success/i.test(message)) {
    return { ok: false, error: message || AEPS_UNEXPECTED_ERROR };
  }

  const data = body.Data && typeof body.Data === "object" ? (body.Data as Record<string, unknown>) : null;
  const wallet = toNumber(data?.wallet);
  if (!data || wallet === null) {
    console.error("AEPS getapiLevelbalance returned no usable wallet balance.");
    return { ok: false, error: AEPS_UNEXPECTED_ERROR };
  }

  const accounts = Object.entries(data)
    .filter(([key]) => key !== "wallet" && key !== "diff")
    .flatMap(([key, value]) => {
      const amount = toNumber(value);
      return amount === null ? [] : [{ key, label: accountLabel(key), amount }];
    });

  return { ok: true, balance: { wallet, accounts, diff: toNumber(data.diff) } };
}
