// src/pages/api/payments/create-intent.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createPaymentIntent } from "@/lib/stripe";
import { query } from "@/lib/db";
import { CreatePaymentIntentRequestSchema, type ApiResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Only POST allowed
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Validate request body
    const validationResult = CreatePaymentIntentRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({
        success: false,
        error: `Invalid request: ${validationResult.error.message}`,
        timestamp: new Date(),
      } as ApiResponse);
    }

    const { company_id, amount_cents, currency, customer_email } = validationResult.data;

    // 1. Get company from database
    const companies = await query(
      "SELECT stripe_account_id, platform_fee_percent FROM companies WHERE id = $1",
      [company_id]
    );

    if (companies.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Company not found",
        timestamp: new Date(),
      } as ApiResponse);
    }

    const company = companies[0] as any;

    // Check if Stripe account is ready
    if (!company.stripe_account_id) {
      return res.status(400).json({
        success: false,
        error: "Company has not completed Stripe onboarding",
        timestamp: new Date(),
      } as ApiResponse);
    }

    // 2. Calculate platform fee
    const platformFeeCents = Math.round(
      amount_cents * (company.platform_fee_percent / 100)
    );

    // 3. Create Payment Intent on company's connected account
    const { clientSecret, intentId } = await createPaymentIntent(
      company.stripe_account_id,
      amount_cents,
      currency,
      customer_email,
      platformFeeCents
    );

    // 4. Store transaction in database
    await query(
      `INSERT INTO transactions 
       (company_id, stripe_charge_id, amount_cents, currency, customer_email, status, platform_fee_cents)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        company_id,
        intentId,
        amount_cents,
        currency.toUpperCase(),
        customer_email,
        "pending",
        platformFeeCents,
      ]
    );

    // 5. Log to audit trail
    await query(
      `INSERT INTO audit_logs (company_id, action, details, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        company_id,
        "PAYMENT_INTENT_CREATED",
        JSON.stringify({ amount: amount_cents / 100, currency }),
        req.headers["x-forwarded-for"] as string || req.socket.remoteAddress,
        req.headers["user-agent"],
      ]
    );

    return res.status(200).json({
      success: true,
      data: {
        clientSecret,
        intentId,
        amount: amount_cents / 100,
        currency,
        platformFee: platformFeeCents / 100,
      },
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error creating payment intent:", error);
    return res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    } as ApiResponse);
  }
}
