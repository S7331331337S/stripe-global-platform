# Stripe Global Payments Platform

**Multi-tenant payment orchestration infrastructure for multinational businesses**

A production-ready platform that processes global payments and payouts for companies with multiple subsidiaries across 195+ countries.

## Features

✅ **Global Payment Acceptance** — 135+ currencies, 195+ countries, 50+ local payment methods  
✅ **Multi-Subsidiary Support** — Each company gets isolated Stripe Connect account  
✅ **Automated Payouts** — Daily/weekly settlements to 40+ countries  
✅ **Real-time Reconciliation** — Auto-sync transactions, disputes, payouts  
✅ **Compliance Built-in** — KYC, AML, audit logs, dispute management  
✅ **Production-Ready** — Next.js, PostgreSQL, Stripe API, Vercel deployment  

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js 20+
- **Database**: PostgreSQL 16+
- **Queue**: Bull (Redis) for async jobs
- **Payments**: Stripe (Connect + Payouts API)
- **Deployment**: Vercel
- **Monitoring**: Sentry, Datadog
- **CI/CD**: GitHub Actions

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/S7331331337S/stripe-global-platform.git
cd stripe-global-platform
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env.local` and update:

```bash
cp .env.example .env.local
```

**Required secrets** (from your Stripe dashboard):
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
```

### 3. Initialize Database

```bash
npm run db:setup
```

This creates all tables:
- `companies` — Multitenantsubsidies
- `transactions` — Payment records
- `payouts` — Settlement history
- `disputes` — Chargebacks & disputes
- `webhook_events` — Stripe event log
- `audit_logs` — Compliance trail

### 4. Run Locally

```bash
npm run dev
```

Navigate to `http://localhost:3000`

### 5. Test Stripe Webhook Locally

```bash
npm run stripe:listen
# In another terminal:
npm run stripe:trigger payment_intent.succeeded
```

## API Endpoints

### Companies

**POST /api/companies/onboard**
```bash
{
  "name": "Company A",
  "email": "admin@company-a.com",
  "country": "GB",
  "website_url": "https://company-a.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "company_id": "uuid",
    "stripe_account_id": "acct_...",
    "onboarding_url": "https://connect.stripe.com/...",
    "message": "Send onboarding_url to company admin..."
  }
}
```

### Payments

**POST /api/payments/create-intent**
```bash
{
  "company_id": "uuid",
  "amount_cents": 10000,
  "currency": "GBP",
  "customer_email": "customer@example.com"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "clientSecret": "pi_...secret...",
    "intentId": "pi_...",
    "amount": 100,
    "currency": "GBP",
    "platformFee": 0.50
  }
}
```

### Health Check

**GET /api/health**

Response:
```json
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok",
    "stripe": "ok"
  },
  "timestamp": "2025-04-10T..."
}
```

## Deployment to Vercel

### 1. Push to GitHub

```bash
git add .
git commit -m "Initial commit"
git branch -M main
git push -u origin main
```

### 2. Connect to Vercel

```bash
npm i -g vercel
vercel link --project stripe-global-platform
```

### 3. Add Secrets to Vercel

```bash
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_PUBLISHABLE_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add DATABASE_URL
vercel env add REDIS_URL
```

### 4. Deploy

```bash
vercel --prod
```

GitHub Actions will automatically:
- Run tests on every PR
- Deploy preview on PR creation
- Deploy production on main push
- Verify health after deploy

## Webhooks

Stripe automatically sends events to `/api/webhooks/stripe`. Configured events:

- `payment_intent.succeeded` — Payment completed
- `payment_intent.payment_failed` — Payment failed
- `charge.dispute.created` — Chargeback initiated
- `payout.paid` — Settlement completed
- `payout.failed` — Settlement failed

All webhooks are:
- ✅ Signature-verified (Stripe webhook secret)
- ✅ Idempotent (no duplicate processing)
- ✅ Logged to database for audit trail
- ✅ Async-processed (won't block HTTP response)

## File Structure

```
stripe-global-platform/
├── src/
│   ├── pages/
│   │   ├── api/
│   │   │   ├── payments/          # Payment endpoints
│   │   │   ├── companies/         # Company onboarding
│   │   │   ├── webhooks/          # Stripe webhooks
│   │   │   └── health.ts          # Health check
│   │   └── index.tsx              # Dashboard (optional)
│   ├── lib/
│   │   ├── stripe.ts              # Stripe utilities
│   │   ├── db.ts                  # Database client
│   │   └── auth.ts                # Auth (optional)
│   ├── components/                # React components
│   └── types/                     # TypeScript types
├── .github/
│   └── workflows/                 # GitHub Actions
│       ├── deploy.yml             # Deploy to Vercel
│       ├── db-migrate.yml         # DB migrations
│       └── stripe-config.yml      # Stripe checks
├── migrations/                    # Database migrations
├── .env.example                   # Env template
├── next.config.js                 # Next.js config
├── tsconfig.json                  # TypeScript config
├── vercel.json                    # Vercel config
└── package.json                   # Dependencies
```

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `STRIPE_SECRET_KEY` | ✅ | Live Stripe Secret (sk_live_...) |
| `STRIPE_PUBLISHABLE_KEY` | ✅ | Live Stripe Public (pk_live_...) |
| `STRIPE_WEBHOOK_SECRET` | ✅ | Webhook signing secret (whsec_...) |
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `REDIS_URL` | ✅ | Redis connection for job queue |
| `APP_URL` | ✅ | Your app URL (http://localhost:3000 or production) |
| `NODE_ENV` | ✅ | development/production |
| `SENTRY_DSN` | ❌ | Error tracking (optional) |
| `ADMIN_EMAIL` | ❌ | Admin user email |
| `JWT_SECRET` | ❌ | Session signing secret |

## Stripe Connection Details

### Connected Accounts (Stripe Connect)

Each company gets a Stripe **Express Connected Account**:
- Auto-onboarded (60-90 seconds KYC)
- Isolated payment processing
- Separate payout schedule
- Company can see their own dashboard

### Payment Flow

```
Customer Payment
    ↓
Create Payment Intent (via API)
    ↓
Route to Company's Stripe Account
    ↓
Charge Card (Stripe handles 100+ payment methods)
    ↓
Platform Takes Fee (configurable 0.5-1%)
    ↓
Company Receives Net Amount
    ↓
Webhook: payment_intent.succeeded
    ↓
Settlement T+1 to T+3 days
```

### Payout Flow

```
Company Balance Accumulated
    ↓
Daily/Weekly Payout Job Runs
    ↓
Stripe Transfers Funds
    ↓
Bank Settlement (varies by region)
    ↓
Webhook: payout.paid
    ↓
Settlement Complete
```

## Development

### Running Tests

```bash
npm test                    # Run all tests
npm run test:watch        # Watch mode
```

### Type Checking

```bash
npm run type-check
```

### Linting

```bash
npm run lint
```

### Local Stripe CLI

```bash
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

## Monitoring & Logging

### Health Checks

Automated health checks run every:
- 🔵 Every deployment (Vercel)
- 🟡 Every hour (via cron job)
- 🔴 On-demand (GET /api/health)

### Error Tracking

Errors are automatically sent to Sentry if configured.

### Database Logs

All transactions, payouts, disputes logged to PostgreSQL for:
- Compliance audits
- Dispute investigation
- Settlement reconciliation
- Chargeback analysis

## Scaling Considerations

### Single Tenant
- 1-5 companies: Single Vercel instance
- ~$500K/month volume: 2-3GB database

### Multi-Tenant (10+ companies)
- Separate database read replicas
- Redis cluster for job queue
- Sentry for monitoring
- DataDog for metrics

### Global Scale (50+ companies, $10M+/month)
- Multi-region deployment (Vercel Edge)
- Database sharding by company_id
- Dedicated Stripe account manager
- Custom webhook processing

## Support & Resources

- **Stripe Docs**: https://stripe.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs
- **Vercel Docs**: https://vercel.com/docs

## Common Issues

### Webhooks Not Firing

1. Check webhook secret is correct:
   ```bash
   echo $STRIPE_WEBHOOK_SECRET
   ```

2. Verify endpoint is reachable:
   ```bash
   curl https://your-app.com/api/health
   ```

3. Check Stripe Dashboard → Webhooks for delivery history

### Payment Intent Fails

1. Verify company has completed Stripe onboarding
2. Check stripe_account_id is saved to database
3. Verify STRIPE_SECRET_KEY is live (not test key)

### Database Migrations Fail

1. Verify DATABASE_URL is correct
2. Check PostgreSQL version >=12
3. Run `npm run db:setup` manually

## Contributing

1. Create a feature branch: `git checkout -b feature/my-feature`
2. Commit changes: `git commit -am 'Add feature'`
3. Push to branch: `git push origin feature/my-feature`
4. Open a Pull Request

GitHub Actions will automatically test your changes.

## License

Proprietary — MSTRMND Labs

## Author

Steele Malone Burnside  
[steele@mstrmnd.ai](mailto:steele@mstrmnd.ai)  
GitHub: [@S7331331337S](https://github.com/S7331331337S)
