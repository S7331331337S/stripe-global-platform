#!/bin/bash
# setup-github-secrets.sh
# This script configures GitHub Actions secrets for Stripe Global Platform deployment

set -e

echo "🚀 Stripe Global Payments Platform - GitHub Secrets Setup"
echo "========================================================="
echo ""
echo "Your Stripe Account: mstrmnd labs (acct_1RORtRLNYrwVVOqm)"
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI not found. Install it first: https://cli.github.com"
    exit 1
fi

# Get repository info
read -p "Enter GitHub repo (owner/repo): " REPO
read -p "Enter GitHub token (ghp_...): " GH_TOKEN
export GH_TOKEN

echo ""
echo "📋 Setting up GitHub Secrets..."
echo ""

# Stripe Secrets (REQUIRED - You must provide these from Stripe dashboard)
read -sp "Enter STRIPE_SECRET_KEY (sk_live_...): " STRIPE_SECRET_KEY
echo ""
gh secret set STRIPE_SECRET_KEY --body "$STRIPE_SECRET_KEY" -R "$REPO"
echo "✅ STRIPE_SECRET_KEY set"

read -sp "Enter STRIPE_PUBLISHABLE_KEY (pk_live_...): " STRIPE_PUBLISHABLE_KEY
echo ""
gh secret set STRIPE_PUBLISHABLE_KEY --body "$STRIPE_PUBLISHABLE_KEY" -R "$REPO"
gh secret set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY --body "$STRIPE_PUBLISHABLE_KEY" -R "$REPO"
echo "✅ STRIPE_PUBLISHABLE_KEY set"

read -sp "Enter STRIPE_WEBHOOK_SECRET (whsec_...): " STRIPE_WEBHOOK_SECRET
echo ""
gh secret set STRIPE_WEBHOOK_SECRET --body "$STRIPE_WEBHOOK_SECRET" -R "$REPO"
echo "✅ STRIPE_WEBHOOK_SECRET set"

# Database Secrets (REQUIRED)
read -sp "Enter DATABASE_URL (postgresql://...): " DATABASE_URL
echo ""
gh secret set DATABASE_URL --body "$DATABASE_URL" -R "$REPO"
echo "✅ DATABASE_URL set"

# Vercel Secrets (REQUIRED for auto-deployment)
read -sp "Enter VERCEL_TOKEN: " VERCEL_TOKEN
echo ""
gh secret set VERCEL_TOKEN --body "$VERCEL_TOKEN" -R "$REPO"
echo "✅ VERCEL_TOKEN set"

read -p "Enter VERCEL_ORG_ID: " VERCEL_ORG_ID
gh secret set VERCEL_ORG_ID --body "$VERCEL_ORG_ID" -R "$REPO"
echo "✅ VERCEL_ORG_ID set"

read -p "Enter VERCEL_PROJECT_ID: " VERCEL_PROJECT_ID
gh secret set VERCEL_PROJECT_ID --body "$VERCEL_PROJECT_ID" -R "$REPO"
echo "✅ VERCEL_PROJECT_ID set"

# Optional: Redis
read -sp "Enter REDIS_URL (optional, press Enter to skip): " REDIS_URL
if [ ! -z "$REDIS_URL" ]; then
    gh secret set REDIS_URL --body "$REDIS_URL" -R "$REPO"
    echo "✅ REDIS_URL set"
else
    echo "⏭️ REDIS_URL skipped (optional)"
fi

# Optional: Sentry
read -sp "Enter SENTRY_DSN (optional, press Enter to skip): " SENTRY_DSN
if [ ! -z "$SENTRY_DSN" ]; then
    gh secret set SENTRY_DSN --body "$SENTRY_DSN" -R "$REPO"
    echo "✅ SENTRY_DSN set"
else
    echo "⏭️ SENTRY_DSN skipped (optional)"
fi

echo ""
echo "✅ All secrets configured!"
echo ""
echo "Next steps:"
echo "1. Push the repo: git push -u origin main"
echo "2. GitHub Actions will automatically test and deploy"
echo "3. Check: https://github.com/$REPO/actions"
echo ""
