// src/pages/api/webhooks/stripe.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { verifyWebhookSignature } from "@/lib/stripe";
import { query } from "@/lib/db";
import type Stripe from "stripe";

// Disable body parsing for webhook endpoint (need raw body for signature)
export const config = {
  api: {
    bodyParser: false,
  },
};

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  try {
    const intentId = paymentIntent.id;

    // Check if already processed (idempotency)
    const existing = await query(
      "SELECT id FROM webhook_events WHERE stripe_event_id = $1",
      [intentId]
    );

    if (existing.length > 0) {
      console.log(`⚠️ Already processed event: ${intentId}`);
      return;
    }

    // Update transaction status
    await query(
      `UPDATE transactions 
       SET status = $1, settled_at = NOW()
       WHERE stripe_charge_id = $2`,
      ["succeeded", intentId]
    );

    // Mark webhook as processed
    await query(
      `INSERT INTO webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)`,
      [intentId, "payment_intent.succeeded"]
    );

    console.log(`✅ Payment succeeded: ${intentId}`);
  } catch (error) {
    console.error("❌ Failed to handle payment succeeded:", error);
    throw error;
  }
}

async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent) {
  try {
    const intentId = paymentIntent.id;

    // Check idempotency
    const existing = await query(
      "SELECT id FROM webhook_events WHERE stripe_event_id = $1",
      [intentId]
    );

    if (existing.length > 0) {
      return;
    }

    // Update transaction status
    await query(
      `UPDATE transactions 
       SET status = $1
       WHERE stripe_charge_id = $2`,
      ["failed", intentId]
    );

    // Mark as processed
    await query(
      `INSERT INTO webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)`,
      [intentId, "payment_intent.payment_failed"]
    );

    console.log(`❌ Payment failed: ${intentId}`);
  } catch (error) {
    console.error("❌ Failed to handle payment failed:", error);
    throw error;
  }
}

async function handleDisputeCreated(charge: Stripe.Charge) {
  try {
    const chargeId = charge.id;
    const disputeId = charge.dispute as string;

    // Check idempotency
    const existing = await query(
      "SELECT id FROM webhook_events WHERE stripe_event_id = $1",
      [disputeId]
    );

    if (existing.length > 0) {
      return;
    }

    // Find the transaction and insert dispute
    const txn = await query(
      "SELECT id, company_id FROM transactions WHERE stripe_charge_id = $1",
      [chargeId]
    );

    if (txn.length > 0) {
      await query(
        `INSERT INTO disputes (transaction_id, stripe_dispute_id, reason, status)
         VALUES ($1, $2, $3, $4)`,
        [txn[0].id, disputeId, charge.payment_method || "unknown", "under_review"]
      );
    }

    // Mark as processed
    await query(
      `INSERT INTO webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)`,
      [disputeId, "charge.dispute.created"]
    );

    console.log(`⚠️ Dispute created: ${disputeId}`);
  } catch (error) {
    console.error("❌ Failed to handle dispute created:", error);
    throw error;
  }
}

async function handlePayoutPaid(payout: Stripe.Payout) {
  try {
    const payoutId = payout.id;

    // Check idempotency
    const existing = await query(
      "SELECT id FROM webhook_events WHERE stripe_event_id = $1",
      [payoutId]
    );

    if (existing.length > 0) {
      return;
    }

    // Update payout status
    await query(
      `UPDATE payouts 
       SET status = $1, completed_at = NOW()
       WHERE stripe_payout_id = $2`,
      ["paid", payoutId]
    );

    // Mark as processed
    await query(
      `INSERT INTO webhook_events (stripe_event_id, event_type)
       VALUES ($1, $2)`,
      [payoutId, "payout.paid"]
    );

    console.log(`✅ Payout completed: ${payoutId}`);
  } catch (error) {
    console.error("❌ Failed to handle payout paid:", error);
    throw error;
  }
}

async function getRawBody(req: NextApiRequest): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
    });
    req.on("end", () => {
      resolve(data);
    });
    req.on("error", reject);
  });
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Get raw body
    const rawBody = await getRawBody(req);
    const sig = req.headers["stripe-signature"] as string;

    if (!sig) {
      return res.status(400).json({ error: "Missing stripe-signature header" });
    }

    // Verify signature
    const event = verifyWebhookSignature(rawBody, sig);

    // Route to handler
    switch (event.type) {
      case "payment_intent.succeeded":
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case "payment_intent.payment_failed":
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      case "charge.dispute.created":
        await handleDisputeCreated(event.data.object as Stripe.Charge);
        break;

      case "payout.paid":
        await handlePayoutPaid(event.data.object as Stripe.Payout);
        break;

      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("❌ Webhook error:", error);
    res.status(400).json({ error: String(error) });
  }
}
