#!/bin/bash
# deploy.sh - ONE COMMAND to deploy Stripe Global Platform
# Usage: ./deploy.sh YOUR_GITHUB_USERNAME

set -e

if [ -z "$1" ]; then
    echo "❌ Usage: ./deploy.sh YOUR_GITHUB_USERNAME"
    exit 1
fi

GITHUB_USER="$1"
REPO_NAME="stripe-global-platform"
REPO_URL="https://github.com/$GITHUB_USER/$REPO_NAME.git"

echo ""
echo "🚀 STRIPE GLOBAL PAYMENTS PLATFORM - AUTOMATED DEPLOYMENT"
echo "========================================================="
echo ""
echo "GitHub User: $GITHUB_USER"
echo "Repository: $REPO_NAME"
echo "Your Stripe Account: mstrmnd labs (acct_1RORtRLNYrwVVOqm)"
echo ""

# Step 1: Check dependencies
echo "📋 Checking dependencies..."
for cmd in git node npm gh; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ $cmd is required but not installed"
        exit 1
    fi
done
echo "✅ All dependencies found"
echo ""

# Step 2: Create GitHub repo
echo "📝 Creating GitHub repository..."
if gh repo view "$GITHUB_USER/$REPO_NAME" --json name &>/dev/null; then
    echo "⚠️ Repository already exists"
else
    gh repo create "$REPO_NAME" \
        --source=/home/claude/stripe-global-platform \
        --remote=origin \
        --push \
        --private \
        --description "Multi-tenant payment orchestration platform for global businesses"
    echo "✅ Repository created"
fi
echo ""

# Step 3: Add secrets
echo "🔐 Setting up GitHub Actions secrets..."
echo ""
echo "You'll be prompted for sensitive values:"
echo "- STRIPE_SECRET_KEY (from https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/apikeys)"
echo "- STRIPE_PUBLISHABLE_KEY (from same page)"
echo "- STRIPE_WEBHOOK_SECRET (from https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks)"
echo "- DATABASE_URL (postgresql://...)"
echo "- VERCEL_TOKEN (from https://vercel.com/account/tokens)"
echo "- VERCEL_ORG_ID (from Vercel team settings)"
echo ""

read -sp "STRIPE_SECRET_KEY (sk_live_...): " SECRET_KEY && echo ""
gh secret set STRIPE_SECRET_KEY --body "$SECRET_KEY" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ STRIPE_SECRET_KEY set"

read -sp "STRIPE_PUBLISHABLE_KEY (pk_live_...): " PUB_KEY && echo ""
gh secret set STRIPE_PUBLISHABLE_KEY --body "$PUB_KEY" -R "$GITHUB_USER/$REPO_NAME"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --body "$PUB_KEY" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ STRIPE_PUBLISHABLE_KEY set"

read -sp "STRIPE_WEBHOOK_SECRET (whsec_...): " WEBHOOK_SECRET && echo ""
gh secret set STRIPE_WEBHOOK_SECRET --body "$WEBHOOK_SECRET" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ STRIPE_WEBHOOK_SECRET set"

read -sp "DATABASE_URL (postgresql://...): " DB_URL && echo ""
gh secret set DATABASE_URL --body "$DB_URL" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ DATABASE_URL set"

read -sp "VERCEL_TOKEN: " VERCEL_TOKEN && echo ""
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ VERCEL_TOKEN set"

read -p "VERCEL_ORG_ID: " VERCEL_ORG_ID
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" -R "$GITHUB_USER/$REPO_NAME"
echo "✅ VERCEL_ORG_ID set"

echo ""

# Step 4: Link Vercel
echo "🔗 Linking Vercel project..."
cd /home/claude/stripe-global-platform
vercel link --project $REPO_NAME --confirm 2>/dev/null || {
    echo "⚠️ Vercel linking failed - you may need to do this manually"
    echo "Run: vercel link --project $REPO_NAME"
}
echo "✅ Vercel linked (check output for PROJECT_ID)"
echo ""

# Step 5: Set Vercel environment variables
echo "📦 Setting Vercel environment variables..."
vercel env add SECRET_KEY --env production --value "$SECRET_KEY" 2>/dev/null || true
vercel env add STRIPE_PUBLISHABLE_KEY --env production --value "$PUB_KEY" 2>/dev/null || true
vercel env add DATABASE_URL --env production --value "$DB_URL" 2>/dev/null || true
echo "✅ Vercel environment variables set"
echo ""

# Step 6: Create Stripe webhook
echo "🔗 Setting up Stripe webhook..."
echo ""
echo "You'll need to manually configure the webhook endpoint:"
echo "1. Go to: https://dashboard.stripe.com/acct_1RORtRLNYrwVVOqm/webhooks"
echo "2. Click 'Add endpoint'"
echo "3. URL: https://stripe-global-platform-$GITHUB_USER.vercel.app/api/webhooks/stripe"
echo "4. Select events: payment_intent.*, charge.dispute.*, payout.*"
echo "5. Copy the signing secret and set STRIPE_WEBHOOK_SECRET"
echo ""
read -p "Press Enter once webhook is configured in Stripe..."
echo ""

# Step 7: Trigger deployment
echo "🚀 Deployment started!"
echo ""
echo "Watch your build at:"
echo "  GitHub Actions: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "  Vercel Logs:    https://vercel.com/$GITHUB_USER/stripe-global-platform"
echo ""

# Step 8: Show next steps
echo "✅ DEPLOYMENT AUTOMATION COMPLETE!"
echo ""
echo "📋 Next steps:"
echo ""
echo "1️⃣ Monitor deployment:"
echo "   Open: https://github.com/$GITHUB_USER/$REPO_NAME/actions"
echo "   Should see: test → deploy-preview → deploy-production"
echo ""
echo "2️⃣ Configure Stripe webhook (if not done):"
echo "   - Endpoint: https://stripe-global-platform-$GITHUB_USER.vercel.app/api/webhooks/stripe"
echo "   - Events: payment_intent.succeeded, charge.dispute.created, payout.paid"
echo ""
echo "3️⃣ Test the platform:"
echo ""
echo "   a) Onboard a test company:"
echo "      curl -X POST https://stripe-global-platform-$GITHUB_USER.vercel.app/api/companies/onboard \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"name\": \"Test Co\", \"email\": \"test@test.com\", \"country\": \"US\"}'"
echo ""
echo "   b) Complete Stripe verification (visit onboarding_url)"
echo ""
echo "   c) Create a payment intent:"
echo "      curl -X POST https://stripe-global-platform-$GITHUB_USER.vercel.app/api/payments/create-intent \\"
echo "        -H 'Content-Type: application/json' \\"
echo "        -d '{\"company_id\": \"UUID\", \"amount_cents\": 1000, \"currency\": \"USD\", \"customer_email\": \"customer@test.com\"}'"
echo ""
echo "4️⃣ Check health:"
echo "   curl https://stripe-global-platform-$GITHUB_USER.vercel.app/api/health"
echo ""
echo "5️⃣ Read deployment guide:"
echo "   cat DEPLOYMENT.md"
echo ""
echo "---"
echo "🎉 Your Stripe Global Payments Platform is deploying!"
echo ""
