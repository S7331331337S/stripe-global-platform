// src/lib/db.ts
import { Pool, PoolClient } from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not configured");
}

// Create connection pool
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Handle pool errors
pool.on("error", (error) => {
  console.error("Unexpected error on idle client", error);
});

/**
 * Execute a query
 */
export async function query<T = any>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  try {
    const result = await pool.query(text, params);
    return result.rows as T[];
  } catch (error) {
    console.error("Database query error:", error);
    throw error;
  }
}

/**
 * Get a single row
 */
export async function queryOne<T = any>(
  text: string,
  params?: (string | number | boolean | null)[]
): Promise<T | null> {
  const results = await query<T>(text, params);
  return results.length > 0 ? results[0] : null;
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");
    const result = await callback(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Initialize database schema
 */
export async function initializeDatabase() {
  const schema = `
    CREATE TABLE IF NOT EXISTS companies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name VARCHAR(255) NOT NULL,
      country_code VARCHAR(2) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      stripe_account_id VARCHAR(255) UNIQUE,
      bank_account_id VARCHAR(255),
      default_currency VARCHAR(3) DEFAULT 'USD',
      payout_schedule VARCHAR(20) DEFAULT 'weekly',
      platform_fee_percent DECIMAL(5, 2) DEFAULT 0.5,
      verification_status VARCHAR(50) DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      stripe_charge_id VARCHAR(255) UNIQUE NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL,
      customer_email VARCHAR(255),
      payment_method VARCHAR(50),
      status VARCHAR(50) NOT NULL,
      platform_fee_cents INTEGER,
      stripe_fee_cents INTEGER,
      net_amount_cents INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      settled_at TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID NOT NULL REFERENCES companies(id),
      stripe_payout_id VARCHAR(255) UNIQUE,
      amount_cents INTEGER NOT NULL,
      currency VARCHAR(3) NOT NULL,
      destination_bank_account VARCHAR(255),
      status VARCHAR(50) NOT NULL DEFAULT 'pending',
      scheduled_for TIMESTAMP,
      completed_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS disputes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      transaction_id UUID NOT NULL REFERENCES transactions(id),
      stripe_dispute_id VARCHAR(255) UNIQUE NOT NULL,
      reason VARCHAR(100),
      status VARCHAR(50),
      amount_cents INTEGER,
      evidence_due TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS webhook_events (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      stripe_event_id VARCHAR(255) UNIQUE NOT NULL,
      event_type VARCHAR(100),
      processed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      company_id UUID REFERENCES companies(id),
      action VARCHAR(255),
      details JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON transactions(company_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_payouts_company_id ON payouts(company_id);
    CREATE INDEX IF NOT EXISTS idx_disputes_transaction_id ON disputes(transaction_id);
    CREATE INDEX IF NOT EXISTS idx_webhook_events_stripe_id ON webhook_events(stripe_event_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_company_id ON audit_logs(company_id);
  `;

  try {
    await pool.query(schema);
    console.log("✅ Database schema initialized");
  } catch (error) {
    console.error("❌ Failed to initialize database:", error);
    throw error;
  }
}

// Close pool
export async function closePool() {
  await pool.end();
}
