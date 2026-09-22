import type { NextApiRequest, NextApiResponse } from "next";
import { getLedger } from "@/ledger/memory";
import { getStripe } from "@/stripe/client";
import { projectStripeEvent, type StripeLikeEvent } from "@/stripe/webhooks";

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req: NextApiRequest): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
): Promise<void> {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const signature = req.headers["stripe-signature"];
  if (typeof signature !== "string") {
    res.status(400).json({ error: "Missing stripe-signature header" });
    return;
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "STRIPE_WEBHOOK_SECRET is not configured" });
    return;
  }

  try {
    const rawBody = await readRawBody(req);
    const event = getStripe().webhooks.constructEvent(rawBody, signature, secret);
    const result = projectStripeEvent(event as unknown as StripeLikeEvent, getLedger());
    res.status(200).json({ received: true, inserted: result.inserted });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "Webhook verification failed",
    });
  }
}
