// src/pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from "next";
import { pool } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import type { ApiResponse } from "@/types";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const health = {
      status: "healthy",
      checks: {
        api: "ok",
        database: "unknown",
        stripe: "unknown",
      },
      timestamp: new Date(),
    };

    // Check database connection
    try {
      const result = await pool.query("SELECT NOW()");
      health.checks.database = result.rows.length > 0 ? "ok" : "error";
    } catch (error) {
      health.checks.database = "error";
      console.error("Database health check failed:", error);
    }

    // Check Stripe connection
    try {
      await stripe.balance.retrieve({ limit: 1 });
      health.checks.stripe = "ok";
    } catch (error) {
      health.checks.stripe = "error";
      console.error("Stripe health check failed:", error);
    }

    // Determine overall status
    if (Object.values(health.checks).includes("error")) {
      health.status = "degraded";
    }

    const statusCode = health.status === "healthy" ? 200 : 503;
    return res.status(statusCode).json(health as ApiResponse);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: String(error),
      timestamp: new Date(),
    } as ApiResponse);
  }
}
