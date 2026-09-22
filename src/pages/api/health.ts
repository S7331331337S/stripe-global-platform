import type { NextApiRequest, NextApiResponse } from "next";
import { getLedger } from "@/ledger/memory";

export default function handler(
  _req: NextApiRequest,
  res: NextApiResponse
): void {
  const ledger = getLedger();
  const stripeConfigured = Boolean(process.env.STRIPE_SECRET_KEY);
  const typesafeConfigured = Boolean(process.env.TYPESAFE_API_KEY);

  res.status(200).json({
    status: stripeConfigured && typesafeConfigured ? "healthy" : "degraded",
    phase: 1,
    checks: {
      api: "ok",
      ledger: "ok",
      stripe: stripeConfigured ? "configured" : "missing_key",
      typesafe: typesafeConfigured ? "configured" : "missing_key",
    },
    ledger: {
      organizations: ledger.listOrganizations().length,
      journal: ledger.listJournal().length,
      inboxPending: ledger.listUnprocessedInbox().length,
    },
    timestamp: new Date().toISOString(),
  });
}
