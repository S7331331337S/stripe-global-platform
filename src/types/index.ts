// src/types/index.ts
import { z } from "zod";

// Company/Account Types
export const CompanySchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  country_code: z.string().length(2).toUpperCase(),
  stripe_account_id: z.string().optional(),
  bank_account_id: z.string().optional(),
  default_currency: z.string().length(3).toUpperCase().default("USD"),
  payout_schedule: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  platform_fee_percent: z.number().min(0).max(5).default(0.5),
  verification_status: z.enum(["pending", "verified", "rejected"]).default("pending"),
  created_at: z.date(),
  updated_at: z.date(),
});

export type Company = z.infer<typeof CompanySchema>;

// Transaction Types
export const TransactionSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  stripe_charge_id: z.string(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase(),
  customer_email: z.string().email().optional(),
  payment_method: z.string().optional(),
  status: z.enum(["pending", "succeeded", "failed", "canceled"]),
  platform_fee_cents: z.number().int().nonnegative(),
  stripe_fee_cents: z.number().int().nonnegative(),
  net_amount_cents: z.number().int(),
  created_at: z.date(),
  settled_at: z.date().optional(),
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Payment Intent Request/Response
export const CreatePaymentIntentRequestSchema = z.object({
  company_id: z.string().uuid(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase(),
  customer_email: z.string().email(),
  metadata: z.record(z.string()).optional(),
});

export type CreatePaymentIntentRequest = z.infer<typeof CreatePaymentIntentRequestSchema>;

export const CreatePaymentIntentResponseSchema = z.object({
  success: z.boolean(),
  client_secret: z.string(),
  intent_id: z.string(),
  amount: z.number(),
  currency: z.string(),
  platform_fee: z.number(),
});

export type CreatePaymentIntentResponse = z.infer<typeof CreatePaymentIntentResponseSchema>;

// Payout Types
export const PayoutSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid(),
  stripe_payout_id: z.string().optional(),
  amount_cents: z.number().int().positive(),
  currency: z.string().length(3).toUpperCase(),
  destination_bank_account: z.string().optional(),
  status: z.enum(["pending", "processing", "paid", "failed", "canceled"]),
  scheduled_for: z.date(),
  completed_at: z.date().optional(),
  created_at: z.date(),
});

export type Payout = z.infer<typeof PayoutSchema>;

// Dispute Types
export const DisputeSchema = z.object({
  id: z.string().uuid(),
  transaction_id: z.string().uuid(),
  stripe_dispute_id: z.string(),
  reason: z.string(),
  status: z.enum(["warning_under_review", "under_review", "won", "lost"]),
  amount_cents: z.number().int(),
  evidence_due: z.date(),
  created_at: z.date(),
});

export type Dispute = z.infer<typeof DisputeSchema>;

// Audit Log Types
export const AuditLogSchema = z.object({
  id: z.string().uuid(),
  company_id: z.string().uuid().optional(),
  action: z.string(),
  details: z.record(z.any()).optional(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  created_at: z.date(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

// Dashboard Metrics
export const DashboardMetricsSchema = z.object({
  total_volume: z.number(),
  total_fees: z.number(),
  transaction_count: z.number(),
  success_rate: z.number(),
  average_transaction_size: z.number(),
  pending_payouts: z.number(),
  chargeback_rate: z.number(),
});

export type DashboardMetrics = z.infer<typeof DashboardMetricsSchema>;

// API Response Wrapper
export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.record(z.any()).optional(),
  error: z.string().optional(),
  timestamp: z.date(),
});

export type ApiResponse<T = any> = {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
};
