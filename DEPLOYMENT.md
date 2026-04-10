# DEPLOYMENT GUIDE: Stripe Global Payments Platform
## Your Stripe Account: mstrmnd labs (acct_1RORtRLNYrwVVOqm)

---

## STEP 1: Get Your Stripe API Keys ✅

Your Stripe account is already identified: **mstrmnd labs** (`acct_1RORtRLNYrwVVOqm`)

### Get API Keys

1. Go to: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/apikeys
2. Copy **Secret Key** (starts with `sk_live_`)
3. Copy **Publishable Key** (starts with `pk_live_`)

### Get Webhook Secret

1. Go to: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks
2. Click **Add endpoint**
3. URL: `https://your-app.vercel.app/api/webhooks/stripe` (fill in later)
4. Events: Select these:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.dispute.created`
   - `payout.paid`
   - `payout.failed`
5. Click **Add endpoint**
6. Copy **Signing secret** (starts with `whsec_`)

---

## STEP 2: Create GitHub Repository 🔗

### Option A: Using GitHub CLI

```bash
# Install GitHub CLI if needed
# https://cli.github.com

# Create repo
gh repo create stripe-global-platform \
  --source=/home/claude/stripe-global-platform \
  --remote=origin \
  --push \
  --private

# Output:
# ✅ Created repository S7331331337S/stripe-global-platform
```

### Option B: Manual

1. Go to https://github.com/new
2. Repository name: `stripe-global-platform`
3. Description: `Multi-tenant payment orchestration platform for global businesses`
4. Make it **Private**
5. Click **Create repository**

Then push locally:
```bash
cd /home/claude/stripe-global-platform
git remote add origin https://github.com/YOUR_USERNAME/stripe-global-platform.git
git branch -M main
git push -u origin main
```

---

## STEP 3: Configure GitHub Actions Secrets 🔐

### Using Script (Easiest)

```bash
cd /home/claude/stripe-global-platform
chmod +x setup-github-secrets.sh
./setup-github-secrets.sh
```

The script will prompt for:
- **STRIPE_SECRET_KEY** (sk_live_...)
- **STRIPE_PUBLISHABLE_KEY** (pk_live_...)
- **STRIPE_WEBHOOK_SECRET** (whsec_...)
- **DATABASE_URL** (postgresql://...)
- **VERCEL_TOKEN** (from https://vercel.com/account/tokens)
- **VERCEL_ORG_ID** (from Vercel team settings)
- **VERCEL_PROJECT_ID** (created after first link)

### Manual Setup

1. Go to: `https://github.com/YOUR_USERNAME/stripe-global-platform/settings/secrets/actions`
2. Click **New repository secret**
3. Add each secret:

```
Name: STRIPE_SECRET_KEY
Value: sk_live_...

Name: STRIPE_PUBLISHABLE_KEY
Value: pk_live_...

Name: STRIPE_WEBHOOK_SECRET
Value: whsec_...

Name: DATABASE_URL
Value: postgresql://user:pass@host:port/dbname

Name: VERCEL_TOKEN
Value: (from https://vercel.com/account/tokens)

Name: VERCEL_ORG_ID
Value: (from Vercel team)

Name: VERCEL_PROJECT_ID
Value: (will be created)
```

---

## STEP 4: Create Vercel Project 🚀

### Option A: CLI

```bash
npm i -g vercel
vercel login
vercel link --project stripe-global-platform
```

This will:
- Ask for project name → `stripe-global-platform`
- Ask for directory → `.`
- Create Vercel project
- Output: `VERCEL_PROJECT_ID`

### Option B: Web Console

1. Go to https://vercel.com/new
2. Import GitHub repo: `stripe-global-platform`
3. Framework: **Next.js**
4. Root directory: `.`
5. Build command: `npm run build`
6. Environment: (skip for now, we'll set in GitHub Actions)

---

## STEP 5: Database Setup 🗄️

### Using Supabase (Easiest - you already have account)

Your Supabase account: `supabase-lightBlue-dog` (ID: `bpuwiwaibuwlkdjhdxnn`)

1. Go to: https://app.supabase.com/
2. Create new project or use existing:
   - Name: `stripe-platform`
   - Region: `US East 1` (for lowest latency to Vercel)
   - Password: Generate strong password
3. Copy connection string (Pooler):
   ```
   postgresql://postgres.XXXXX:PASSWORD@aws-0-us-east-1.pooler.supabase.com:6543/postgres
   ```
4. Set as `DATABASE_URL` secret in GitHub

### Running Migrations on Deploy

Database schema auto-initializes on first Vercel deployment:

```
→ Vercel deploys
→ Next.js builds
→ API route `/src/pages/api/health.ts` runs on first request
→ Database initialization happens automatically
```

---

## STEP 6: Deploy! 🎯

### Push to GitHub

```bash
cd /home/claude/stripe-global-platform
git add .
git commit -m "Initial commit: Stripe Global Payments Platform"
git push -u origin main
```

### Watch Deployment

1. Go to: `https://github.com/YOUR_USERNAME/stripe-global-platform/actions`
2. Watch workflow run:
   - ✅ Test & Lint
   - ✅ Build
   - ✅ Deploy to Vercel
   - ✅ Health Check

3. Vercel URL: https://stripe-global-platform-YOUR_USERNAME.vercel.app/

---

## STEP 7: Configure Stripe Webhooks 🔗

After Vercel deployment, update webhook endpoint:

1. Go to: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks
2. Edit the endpoint you created
3. URL: `https://stripe-global-platform-YOUR_USERNAME.vercel.app/api/webhooks/stripe`
4. Save

Test webhook:
```bash
curl -X POST https://your-vercel-url.vercel.app/api/health
# Should return: { "status": "healthy", "checks": {...} }
```

---

## STEP 8: Test End-to-End 🧪

### Create a Test Company

```bash
curl -X POST https://your-vercel-url.vercel.app/api/companies/onboard \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Company A",
    "email": "test@company-a.com",
    "country": "GB"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "company_id": "uuid",
#     "stripe_account_id": "acct_...",
#     "onboarding_url": "https://connect.stripe.com/...",
#     "message": "Send onboarding_url to company admin..."
#   }
# }
```

### Complete Stripe Onboarding

1. Visit the `onboarding_url`
2. Fill out Stripe verification (60-90 seconds)
3. Return to your app

### Process a Test Payment

```bash
curl -X POST https://your-vercel-url.vercel.app/api/payments/create-intent \
  -H "Content-Type: application/json" \
  -d '{
    "company_id": "YOUR_COMPANY_UUID",
    "amount_cents": 1000,
    "currency": "GBP",
    "customer_email": "customer@example.com"
  }'

# Response:
# {
#   "success": true,
#   "data": {
#     "clientSecret": "pi_...",
#     "intentId": "pi_...",
#     "amount": 10,
#     "currency": "GBP",
#     "platformFee": 0.05
#   }
# }
```

---

## ✅ Verification Checklist

After deployment:

- [ ] GitHub repo created and tests passing
- [ ] Vercel deployment successful
- [ ] Database connected and schema initialized
- [ ] Stripe webhook endpoint configured and listening
- [ ] Test company onboarded to Stripe
- [ ] Test payment intent created successfully
- [ ] Webhook received and processed (check database logs)
- [ ] Health check returns "healthy": `GET /api/health`

---

## 📊 Monitoring

### GitHub Actions Logs

https://github.com/YOUR_USERNAME/stripe-global-platform/actions

### Vercel Logs

https://vercel.com/YOUR_USERNAME/stripe-global-platform/monitoring

### Stripe Dashboard

- Payments: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/payments
- Connected Accounts: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/connected-accounts
- Webhooks: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks

### Database Logs

```sql
-- Check transactions
SELECT * FROM transactions ORDER BY created_at DESC LIMIT 10;

-- Check payouts
SELECT * FROM payouts ORDER BY created_at DESC LIMIT 10;

-- Check webhooks processed
SELECT * FROM webhook_events ORDER BY processed_at DESC LIMIT 10;

-- Check audit trail
SELECT * FROM audit_logs WHERE action = 'PAYMENT_INTENT_CREATED' ORDER BY created_at DESC;
```

---

## 🔄 Automated Workflows

Once deployed, these run automatically:

### On Every Push to Main
- ✅ Run tests
- ✅ Deploy to Vercel
- ✅ Verify health

### Daily at Midnight UTC
- ✅ Check for open Stripe disputes
- ✅ Verify webhook endpoint reachable
- ✅ Generate reconciliation report

### On Database Changes
- ✅ Run migrations
- ✅ Verify schema
- ✅ Alert on failures

---

## 🆘 Troubleshooting

### Webhooks Not Firing?

1. Check webhook endpoint is reachable:
   ```bash
   curl https://your-vercel-url.vercel.app/api/webhooks/stripe
   # Should return 404 (needs POST with Stripe signature)
   ```

2. Check Stripe dashboard for webhook delivery history:
   https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks

3. Verify STRIPE_WEBHOOK_SECRET is correct:
   ```bash
   echo $STRIPE_WEBHOOK_SECRET  # Should match Stripe dashboard
   ```

### Database Connection Failed?

1. Verify DATABASE_URL is correct format:
   ```
   postgresql://user:password@host:port/database
   ```

2. Test connection locally:
   ```bash
   psql "$DATABASE_URL"
   ```

3. Check Vercel secrets are set:
   https://vercel.com/YOUR_USERNAME/stripe-global-platform/settings/environment-variables

### Payments Not Processing?

1. Verify company has completed Stripe onboarding:
   ```bash
   SELECT stripe_account_id, verification_status FROM companies WHERE id = 'YOUR_ID';
   ```

2. Check company's Stripe account is charges_enabled:
   https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/connected-accounts

3. Verify STRIPE_SECRET_KEY is live (not test):
   - Live keys start with `sk_live_`
   - Test keys start with `sk_test_`

---

## 🎓 Next Steps After Deployment

1. **Build Dashboard** — Add React UI for company analytics
2. **Add Authentication** — Protect API endpoints with JWT
3. **Implement Payouts** — Add automated daily/weekly payout scheduler
4. **Multi-Currency** — Add currency conversion & settlement
5. **Dispute Management** — Build evidence submission workflow
6. **Scaling** — Add caching, load testing, multi-region

---

## 📞 Support

- **Stripe Support**: https://support.stripe.com/
- **Vercel Support**: https://vercel.com/support
- **Next.js Docs**: https://nextjs.org/docs
- **PostgreSQL Docs**: https://www.postgresql.org/docs/

---

**You're ready to deploy! Let's go! 🚀**
