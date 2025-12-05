# AI Code Reviewer - Third-Party Service Setup Guide
## Step-by-Step Integration for Production

---

## 1. CLERK.COM SETUP (Authentication)

### Why Clerk?
- Pre-built UI (no custom auth forms needed)
- GitHub OAuth integration built-in
- 5,000 free MAU (monthly active users)
- Perfect developer experience

### Setup Steps

#### Step 1: Create Clerk Account
```
1. Visit https://clerk.com
2. Sign up with GitHub
3. Create organization "ai-code-reviewer"
4. Create new application
```

#### Step 2: Get Credentials
```
In Clerk dashboard:
- API Keys tab
- Copy:
  * NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY (public key)
  * CLERK_SECRET_KEY (secret, never expose)
  * CLERK_WEBHOOK_SECRET (for webhooks)
```

#### Step 3: Configure GitHub OAuth
```
In Clerk dashboard:
- Go to Social connections
- Click GitHub
- Enter GitHub OAuth App credentials (you'll create next)
- Toggle ON
```

#### Step 4: Add to Next.js Project
```bash
npm install @clerk/nextjs

# Create app/layout.tsx with Clerk provider
# Add middleware.ts for protected routes
# Update .env.local with keys
```

#### Step 5: Test Authentication
```
npm run dev
Visit http://localhost:3000
Should see Clerk sign-up form
Test sign-up → Should create user in Clerk dashboard
```

### Clerk Pricing
- Free: 0-5,000 MAU
- Growth: $25/month after 5,000 MAU + $0.02 per MAU
- Enterprise: Custom pricing

---

## 2. GITHUB APP SETUP

### Create GitHub App

#### Step 1: Navigate to GitHub Settings
```
1. Go to https://github.com/settings/apps/new
2. Fill in app details:
   - App name: ai-code-reviewer
   - Homepage URL: https://yourdomain.com
   - Authorization callback URL: https://yourdomain.com/auth/github/callback
   - Webhook URL: https://yourdomain.com/api/webhook
   - Webhook active: YES
```

#### Step 2: Set Permissions
```
Repository permissions:
- Contents: Read-only (to read code)
- Pull requests: Read and write (to post reviews)
- Metadata: Read-only

Organization permissions:
- Members: Read-only (optional)
```

#### Step 3: Subscribe to Events
```
Select which events trigger webhook:
✓ Pull request
✓ Push (optional, if re-analyzing on new commits)
```

#### Step 4: Get Credentials
```
After creation, you'll see:
- App ID (numeric, e.g., 123456)
- Client ID (alphanumeric)
- Client secret (click "Generate new client secret")
- Private key (click "Generate private key" - download .pem file)

Save all three in .env.local:
GITHUB_APP_ID=123456
GITHUB_CLIENT_ID=xxxxx
GITHUB_CLIENT_SECRET=xxxxx
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=xxxxx
```

#### Step 5: Install App on Test Repo
```
1. Go to your GitHub app → Install app
2. Select repository to install on
3. Grant permissions
4. You'll be redirected to your app
5. Should see installation confirmation
```

---

## 3. GOOGLE CLOUD SETUP (Gemini Pro 3)

### Create Google Cloud Project

#### Step 1: Create Project
```
1. Go to https://console.cloud.google.com
2. Create new project "ai-code-reviewer"
3. Wait for project to be created
4. Select the project
```

#### Step 2: Enable Vertex AI API
```
1. Go to APIs & Services → Library
2. Search "Vertex AI API"
3. Click Enable
4. Wait 30 seconds for enablement
```

#### Step 3: Create Service Account
```
1. Go to APIs & Services → Credentials
2. Click "Create Credentials" → "Service Account"
3. Fill in:
   - Service account name: ai-code-reviewer
   - Service account ID: ai-code-reviewer (auto-filled)
   - Click Create and Continue
4. Grant role: "Vertex AI User"
5. Click Continue → Create
```

#### Step 4: Generate Key
```
1. In Service Accounts, click the new account
2. Go to Keys tab
3. Click "Add Key" → "Create new key"
4. Select JSON format
5. Click Create
6. A JSON file downloads - save this as GCP_CREDENTIALS.json
```

#### Step 5: Add to Environment
```
# In .env.local
GOOGLE_CLOUD_PROJECT_ID=your-project-id (from cloud console)
GOOGLE_APPLICATION_CREDENTIALS='{...paste entire JSON file content...}'

# Or use file path in production:
# Point to mounted secrets file
```

#### Step 6: Test Gemini API
```typescript
// test-gemini.ts
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  location: 'us-central1'
});

const model = vertexAI.getGenerativeModel({
  model: 'gemini-1.5-pro'
});

const response = await model.generateContent({
  contents: [{
    role: 'user',
    parts: [{ text: 'Say hello' }]
  }]
});

console.log(response.response.candidates?.[0]?.content?.parts?.[0]?.text);
```

### Google Cloud Pricing
- First 2 months: Free $300 credit
- After: ~$0.0005 per 1K input tokens, $0.0015 per 1K output tokens
- Average PR: $0.002 per analysis

---

## 4. VERCEL POSTGRES SETUP (Database)

### Create Database

#### Step 1: Link Vercel Project
```
1. Push Next.js project to GitHub
2. Go to https://vercel.com/new
3. Select GitHub repository
4. Click Import
5. Vercel auto-detects Next.js
6. Click Deploy
```

#### Step 2: Create Database
```
1. In Vercel dashboard → Project Settings
2. Click Storage tab
3. Click "Create Database" → Postgres
4. Select region (closest to you)
5. Click Create
6. Wait 2-3 minutes
```

#### Step 3: Get Connection String
```
1. Storage tab → Click Postgres database
2. Copy connection string (starts with postgresql://)
3. Add to .env.local:
   DATABASE_URL=postgresql://...

4. Test connection:
   npx vercel env pull .env.local
   npm run db:test
```

#### Step 4: Create Tables
```bash
# Option 1: Using SQL client
# Copy all SQL from Part 3 (Database Schema)
# Paste into Vercel SQL editor
# Click Run

# Option 2: Using migration tool
npm install prisma
npx prisma init
# Update DATABASE_URL in .env.local
# Create schema.prisma
# npx prisma migrate dev
```

### Vercel Postgres Pricing
- Free: 30 days trial
- Production: $29/month (includes backups, replication)

---

## 5. UPSTASH REDIS SETUP (Cache & Queue)

### Create Redis Database

#### Step 1: Create Account
```
1. Go to https://upstash.com
2. Sign up
3. Go to Console
4. Click "Create Database"
```

#### Step 2: Configure Database
```
1. Choose:
   - Name: ai-code-reviewer-redis
   - Region: Nearest to you
   - Eviction: Allkeys-LRU (auto-delete old keys)
2. Click Create
3. Wait 30 seconds
```

#### Step 3: Get Connection Details
```
1. Click database → Details
2. Copy:
   - UPSTASH_REDIS_REST_URL
   - UPSTASH_REDIS_REST_TOKEN

3. For Bull queue, use regular Redis connection:
   - Host: ENDPOINT (from details)
   - Port: 6379
   - Password: PASSWORD (from details)

4. Add to .env.local:
REDIS_URL=redis://default:PASSWORD@ENDPOINT:6379
```

#### Step 4: Test Connection
```typescript
import redis from 'redis';

const client = redis.createClient({
  url: process.env.REDIS_URL!
});

await client.ping();  // Should print "PONG"
```

### Upstash Pricing
- Free: 10,000 commands/day, 256MB
- Growth: Pay-as-you-go ($0.20 per million commands)

---

## 6. STRIPE SETUP (Payments)

### Create Stripe Account

#### Step 1: Sign Up
```
1. Go to https://stripe.com
2. Sign up
3. Complete business verification
```

#### Step 2: Create Products & Prices
```
In Stripe Dashboard:
Products → Create product

Product 1: Free Tier
- Price: $0
- Billing period: Monthly
- Trial: None

Product 2: Team Tier
- Price: $30
- Billing period: Monthly
- Trial: 7 days (optional)

Product 3: Enterprise
- Price: Custom (contact sales)
```

#### Step 3: Get API Keys
```
Settings → API Keys
Copy:
- Publishable key (pk_live_...)
- Secret key (sk_live_...)

Add to .env.local:
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
```

#### Step 4: Create Webhook
```
1. Settings → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://yourdomain.com/api/webhooks/stripe
4. Select events:
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
5. Get webhook signing secret (whsec_...)
6. Add to .env.local:
   STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Step 5: Test Payment Flow
```
Use test card numbers:
- Success: 4242 4242 4242 4242
- Requires authentication: 4000 0025 0000 3155

Set expiry: Any future date
CVC: Any 3 digits
```

### Stripe Pricing
- Transactions: 2.9% + $0.30 per transaction
- Subscriptions: 0.5% monthly (billed on subscription)
- At $30/month × 500 customers: 500 × $0.15 = $75/month to Stripe

---

## 7. VERCEL FUNCTIONS SETUP (Serverless Backend)

### Deploy to Vercel

#### Step 1: Connect GitHub
```bash
# Already done if you created Vercel project
# Verify:
git remote -v | grep vercel
```

#### Step 2: Create Vercel Config
```typescript
// vercel.json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "env": {
    "CLERK_SECRET_KEY": "sk_live_...",
    "GITHUB_PRIVATE_KEY": "-----BEGIN...",
    "DATABASE_URL": "postgresql://..."
  },
  "functions": {
    "app/api/**": {
      "memory": 512,
      "maxDuration": 60
    }
  }
}
```

#### Step 3: Add Environment Variables
```
Vercel Dashboard → Project Settings → Environment Variables

Add all from .env.local:
- CLERK_SECRET_KEY
- GITHUB_PRIVATE_KEY
- GOOGLE_CLOUD_PROJECT_ID
- GOOGLE_APPLICATION_CREDENTIALS
- DATABASE_URL
- REDIS_URL
- STRIPE_SECRET_KEY
etc.
```

#### Step 4: Deploy
```bash
git push origin main
# Vercel auto-deploys
# Check deployment status in Vercel dashboard
```

#### Step 5: Test Webhook
```bash
# Get your Vercel deployment URL
# https://ai-code-reviewer.vercel.app

# Update GitHub App webhook URL:
# https://ai-code-reviewer.vercel.app/api/webhook

# Create test PR
# Should trigger webhook
# Check Vercel logs for success/errors
```

### Vercel Pricing
- Free: 1 million invocations/month
- Pro: $20/month + $0.50 per million extra invocations
- Enterprise: Custom

---

## 8. SENTRY ERROR TRACKING SETUP

### Create Sentry Project

#### Step 1: Sign Up
```
1. Go to https://sentry.io
2. Create account
3. Create new organization
```

#### Step 2: Create Project
```
1. Projects → Create project
2. Select platform: Node.js (or Next.js)
3. Create project
4. Get DSN (Sentry URL)
```

#### Step 3: Add to Next.js
```bash
npm install @sentry/nextjs

# Generates sentry.client.config.ts and sentry.server.config.ts
# Configure both with DSN
```

#### Step 4: Add Environment Variable
```
.env.local:
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxxx
```

### Sentry Pricing
- Free: 5,000 events/month
- Growth: $29/month + $0.02 per event

---

## 9. MIXPANEL ANALYTICS SETUP

### Create Mixpanel Project

#### Step 1: Sign Up
```
1. Go to https://mixpanel.com
2. Create account
3. Create new project "ai-code-reviewer"
```

#### Step 2: Get Token
```
Project Settings → Copy project token
Add to .env.local:
NEXT_PUBLIC_MIXPANEL_TOKEN=xxxxx
```

#### Step 3: Install Library
```bash
npm install mixpanel-browser

# In app/layout.tsx:
import mixpanel from 'mixpanel-browser';

mixpanel.init(process.env.NEXT_PUBLIC_MIXPANEL_TOKEN!);
```

### Mixpanel Pricing
- Free: 20M events/month
- Growth: $20/month + $0.00001 per event

---

## 10. COMPLETE ENVIRONMENT VARIABLES TEMPLATE

```bash
# .env.local (for local development)

# CLERK
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
CLERK_WEBHOOK_SECRET=whsec_test_xxxxx

# GITHUB
GITHUB_APP_ID=123456
GITHUB_CLIENT_ID=xxxx
GITHUB_CLIENT_SECRET=xxxx
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----"
GITHUB_WEBHOOK_SECRET=whsec_xxxxx

# GOOGLE CLOUD
GOOGLE_CLOUD_PROJECT_ID=my-project-id
GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account","project_id":"...","private_key":"...",}'

# DATABASE
DATABASE_URL=postgresql://user:pass@localhost:5432/db

# REDIS
REDIS_URL=redis://default:pass@host:6379

# STRIPE
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# SENTRY
NEXT_PUBLIC_SENTRY_DSN=https://xxxxx@xxxxx.ingest.sentry.io/xxxxxx

# MIXPANEL
NEXT_PUBLIC_MIXPANEL_TOKEN=xxxxx

# GENERAL
NODE_ENV=development
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 11. DEPLOYMENT CHECKLIST

### Pre-Launch Verification

- [ ] **GitHub App**
  - [ ] Webhook receives events successfully
  - [ ] Can fetch PR diffs
  - [ ] Can post comments back

- [ ] **Gemini Pro 3**
  - [ ] API credentials working
  - [ ] Can generate text
  - [ ] Cost tracking accurate

- [ ] **Clerk**
  - [ ] Sign-up works
  - [ ] GitHub OAuth works
  - [ ] User data saved to DB

- [ ] **Database**
  - [ ] Tables created
  - [ ] Can insert/read data
  - [ ] Backups configured

- [ ] **Redis**
  - [ ] Queue processing works
  - [ ] Cache returns data
  - [ ] No connection timeouts

- [ ] **Stripe**
  - [ ] Free tier works
  - [ ] Team tier payment succeeds
  - [ ] Webhooks trigger correctly

- [ ] **Monitoring**
  - [ ] Sentry receives errors
  - [ ] Analytics tracks events
  - [ ] Logs visible in Vercel

### Launch Steps

```bash
# 1. Final code push
git add .
git commit -m "Production ready"
git push origin main

# 2. Verify Vercel deployment
# Visit dashboard, should see green checkmark

# 3. Test end-to-end
# Create PR in test repo
# Should see AI review comment

# 4. Monitor for errors
# Check Sentry dashboard
# Check Vercel logs
# Check database for new entries

# 5. Update GitHub App webhook
# Point to production URL: https://yourdomain.com/api/webhook

# 6. Celebrate! 🚀
```

---

## END SERVICE SETUP GUIDE