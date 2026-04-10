// src/pages/api/companies/onboard.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { createExpressAccount, generateOnboardingLink } from "@/lib/stripe";
import { query } from "@/lib/db";
import type { ApiResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, country, website_url } = req.body;

    // Validate input
    if (!name || !email || !country) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields: name, email, country",
        timestamp: new Date(),
      } as ApiResponse);
    }

    if (!/^[A-Z]{2}$/.test(country)) {
      return res.status(400).json({
        success: false,
        error: "Country must be a 2-letter ISO code (e.g., GB, US, SG)",
        timestamp: new Date(),
      } as ApiResponse);
    }

    // 1. Create Stripe Express account
    const stripeAccountId = await createExpressAccount({
      name,
      email,
      country,
      websiteUrl: website_url,
    });

    // 2. Save company to database
    const companies = await query(
      `INSERT INTO companies (name, email, country_code, stripe_account_id, verification_status)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [name, email, country.toUpperCase(), stripeAccountId, "pending_verification"]
    );

    const company = companies[0] as any;

    // 3. Generate onboarding link
    const onboardingUrl = await generateOnboardingLink(stripeAccountId);

    // 4. Log to audit trail
    await query(
      `INSERT INTO audit_logs (company_id, action, details)
       VALUES ($1, $2, $3)`,
      [
        company.id,
        "ONBOARDING_INITIATED",
        JSON.stringify({ email, country, stripe_account_id: stripeAccountId }),
      ]
    );

    return res.status(201).json({
      success: true,
      data: {
        company_id: company.id,
        stripe_account_id: stripeAccountId,
        onboarding_url: onboardingUrl,
        message:
          "Company registered. Send onboarding_url to company admin to complete KYC verification.",
      },
      timestamp: new Date(),
    } as ApiResponse);
  } catch (error) {
    console.error("Error onboarding company:", error);

    // Check if it's a duplicate email
    if (String(error).includes("duplicate key") || String(error).includes("already exists")) {
      return res.status(409).json({
        success: false,
        error: "Email already registered",
        timestamp: new Date(),
      } as ApiResponse);
    }

    return res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    } as ApiResponse);
  }
}
