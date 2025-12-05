# AI Code Reviewer - Complete Technical Documentation
## Production-Ready Architecture for Vibe Coding with Gemini Pro 3

---

## TABLE OF CONTENTS
1. System Architecture Overview
2. Tech Stack & Third-Party Services
3. Database Schema & Data Models
4. GitHub Integration Details
5. LLM Integration (Gemini Pro 3)
6. API Specifications
7. Authentication & Authorization
8. Deployment & Infrastructure
9. Monitoring & Analytics
10. Security Considerations

---

## PART 1: SYSTEM ARCHITECTURE OVERVIEW

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        GITHUB ECOSYSTEM                             │
│  ┌──────────────────┐         ┌──────────────────┐                 │
│  │  GitHub App      │         │  Repository      │                 │
│  │  Marketplace     │         │  Events          │                 │
│  └──────────────────┘         └──────────────────┘                 │
│            │                            │                          │
│            └────────────┬───────────────┘                          │
│                         │                                          │
└─────────────────────────┼──────────────────────────────────────────┘
                          │ Webhook Events (PR opened/updated)
                          ▼
        ┌──────────────────────────────────────────────┐
        │   API Gateway (Vercel Functions)            │
        │   - Route events                            │
        │   - Verify signatures                       │
        │   - Rate limiting                           │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ▼                     ▼              ▼
    ┌────────────┐     ┌────────────┐  ┌─────────────┐
    │ Auth Flow  │     │ Webhook    │  │ Background  │
    │ (Clerk)    │     │ Processor  │  │ Job Queue   │
    │            │     │            │  │ (Bull/Bee)  │
    └────────────┘     └────────────┘  └─────────────┘
        │                   │                  │
        └───────────────────┼──────────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │   Processing Service (Node.js + Typebox)    │
        │   - Fetch PR diffs                          │
        │   - Validate code                           │
        │   - Call Gemini Pro 3                       │
        │   - Format responses                        │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ▼                     ▼              ▼
    ┌────────────┐     ┌────────────┐  ┌─────────────┐
    │ Gemini Pro │     │ PostgreSQL │  │  Redis Cache│
    │ 3 API      │     │ (Vercel PG)│  │  (Upstash)  │
    │            │     │            │  │             │
    └────────────┘     └────────────┘  └─────────────┘
                            ▼
        ┌──────────────────────────────────────────────┐
        │   Response Handler                          │
        │   - Generate PR comments                    │
        │   - Track issue feedback                    │
        │   - Update user dashboard                  │
        └──────────┬───────────────────────────────────┘
                   │
        ┌──────────┴──────────┬──────────────┐
        ▼                     ▼              ▼
    ┌────────────┐     ┌────────────┐  ┌─────────────┐
    │ GitHub PR  │     │ Dashboard  │  │  Analytics  │
    │ Comments   │     │ (Next.js)  │  │  (Mixpanel) │
    │            │     │            │  │             │
    └────────────┘     └────────────┘  └─────────────┘
```

### Request Flow (Detailed)

```
1. GITHUB EVENT TRIGGERS
   PR opened on repository → GitHub sends webhook to your endpoint
   
2. WEBHOOK VERIFICATION
   - Verify X-Hub-Signature-256 with GITHUB_WEBHOOK_SECRET
   - Validate payload structure
   - Rate limit check (implement locally)
   - Duplicate event check (use Redis idempotency key)
   
3. REQUEST QUEUING
   - Add to Bull queue with priority (critical > high > medium > low)
   - Estimated wait time < 30 seconds (depends on queue depth)
   
4. DATA FETCHING
   - Call GitHub API to fetch:
     * PR metadata (title, description, commits)
     * Changed files list with diffs
     * User who opened PR (for personalization)
     * Repository language & framework
   
5. CODE ANALYSIS (Gemini Pro 3)
   - Send code chunks to Gemini Pro 3 (4K limit per request)
   - Get analysis results back
   - Stream responses if > 1000 tokens
   
6. RESPONSE GENERATION
   - Filter results through rule engine
   - Deduplicate similar issues
   - Prioritize by severity
   
7. GITHUB INTEGRATION
   - Create review comment on PR
   - Add inline suggestions (specific lines)
   - Update review status (APPROVE / REQUEST_CHANGES / COMMENT)
   
8. TRACKING & ANALYTICS
   - Store in PostgreSQL:
     * Issue flagged (for feedback loop)
     * Timestamp
     * User action (ignored/fixed/disputed)
   - Send to analytics (track user behavior)
```

---

## PART 2: TECH STACK & THIRD-PARTY SERVICES

### Complete Service Architecture (For Vibe Coding)

#### **Frontend Stack**
```
Framework: Next.js 14+ (App Router)
- Why: Fast, full-stack, serverless functions, optimal for SaaS dashboards
- Key packages:
  * next-auth (via Clerk provider)
  * tanstack/react-query (data fetching)
  * zustand (state management - lightweight)
  * shadcn/ui (pre-built components)
  * tailwindcss (styling)

Hosting: Vercel (auto-deploys from GitHub)
- Zero-config Node.js deployment
- Edge middleware for authentication
- Serverless functions for API routes
- CDN included globally
```

#### **Backend Stack**
```
Runtime: Node.js 20+ (TypeScript recommended)
Framework: None needed (use Vercel Functions + Bull)
- Why: Vercel handles HTTP routing, focus on business logic

Key Libraries:
- octokit/rest (GitHub API client)
  * 5,000 req/hour rate limit per installation
  * Handles authentication automatically
  
- @google-cloud/vertexai (Gemini Pro 3)
  * Streaming support for long outputs
  * Cost: ~$0.0005/1K input tokens, $0.0015/1K output tokens
  * Model: gemini-1.5-pro (32K context window)
  
- bull (Job queue - background processing)
  * Better than just promises for reliability
  * Prevents webhook timeouts
  * Automatic retries + dead-letter queue
  
- zod (Type validation - for TypeScript)
  * Runtime validation of webhook payloads
  * Smaller than joi (~17KB vs ~60KB)
```

#### **Database Stack**
```
Primary: PostgreSQL (Vercel Postgres)
- Connections via pooler (Vercel includes)
- Automatic backups, failover
- Pricing: $29/month for production tier
- Tables needed (see schema section)

Cache Layer: Redis (Upstash)
- WebSocket-ready for real-time features
- Usage:
  * PR processing cache (1 hour expiry)
  * Rate limit tracking
  * Session cache
  * Idempotency keys for webhook deduplication
- Pricing: Free tier up to 10K commands/day
- When to upgrade: > 1K concurrent users → growth plan

Search: Elasticsearch (optional)
- For full-text search of reviews
- Later optimization (Month 2-3)
```

#### **Authentication Stack**
```
Service: Clerk.com
- Why Clerk over Auth0:
  * 40% faster integration (pre-built UI)
  * Developer-friendly API
  * Pay-as-you-go ($0.02 per MAU after free tier)
  * Better GitHub OAuth integration
  * Included email verification

Implementation:
- Clerk handles: Sign up, login, profile, multi-factor
- Your app handles: Permission checking, role assignment

Cost breakdown:
- Free tier: 5,000 MAU (monthly active users)
- Paid tier: $0.02 per MAU
- At 10K users: $100/month (manageable)

GitHub OAuth via Clerk:
- User authenticates via Clerk
- Clerk calls GitHub OAuth
- Get GitHub token from Clerk
- Use token to call GitHub API
```

#### **File Storage (Optional)**
```
Service: R2 by Cloudflare or AWS S3
- Store PR diffs (JSON backups)
- Store analysis results (for auditing)
- Cost: R2 $15/TB/month (cheaper than S3)
- When needed: > 100 PRs/day backups

Alternative: Upload to GitHub Gists
- Store review history as gists
- Free, but limited
- GitHub-native approach
```

#### **Email Stack**
```
Service: Resend.com or SendGrid
- Send: New review notifications
- Send: Weekly summary emails
- Cost: Resend $20/month (100K emails), SendGrid free tier good enough early

Templates: React Email library
- Built with Resend's React Email
- Type-safe email components
```

#### **Payment Processing**
```
Service: Stripe
- Handle subscriptions (free/team/enterprise)
- Webhook for: subscription created, upgraded, downgraded, cancelled

Pricing tables: Stripe's new pricing table component
- Embed directly in website
- Handles billing automatically

Cost: Stripe takes 2.9% + $0.30 per transaction
- $30 subscription = Stripe takes $1.17
```

#### **Monitoring & Analytics**
```
Error Tracking: Sentry.io
- Catch runtime errors
- Track performance issues
- Cost: Free tier enough initially, $29/month for prod

Analytics: Mixpanel or PostHog
- Track: User signups, feature usage, conversion
- Track: API performance metrics
- Cost: Free tier, $900+/month for scale

Logging: Vercel Logs + Datadog
- Vercel logs: All function calls (included)
- Datadog: Deep monitoring ($15/month minimum)
```

---

## PART 3: DATABASE SCHEMA

### Core Tables

#### **users**
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_id VARCHAR(255) UNIQUE NOT NULL,  -- From Clerk
  email VARCHAR(255) UNIQUE NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  github_handle VARCHAR(100) UNIQUE,      -- From GitHub OAuth
  github_user_id INTEGER,                 -- Numeric GitHub ID
  github_token_encrypted VARCHAR(1000),   -- Encrypted OAuth token (use pgcrypto)
  avatar_url VARCHAR(1000),
  subscription_tier VARCHAR(50) DEFAULT 'free',  -- free, team, enterprise
  stripe_customer_id VARCHAR(255),        -- Link to Stripe
  reviews_used_this_month INTEGER DEFAULT 0,  -- For free tier limits
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **installations**
```sql
CREATE TABLE github_app_installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id INTEGER UNIQUE NOT NULL,  -- From GitHub webhook
  user_id UUID NOT NULL REFERENCES users(id),
  repository_name VARCHAR(255),              -- e.g., "owner/repo"
  repository_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  permissions JSONB,  -- What the app can do in this repo
  review_settings JSONB,  -- Custom rules, severity levels per repo
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **pull_requests**
```sql
CREATE TABLE pull_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_number INTEGER NOT NULL,
  repository_name VARCHAR(255) NOT NULL,     -- "owner/repo"
  pr_title VARCHAR(500),
  pr_description TEXT,
  author_handle VARCHAR(100),
  author_id UUID REFERENCES users(id),       -- If author is a user
  pr_status VARCHAR(50),                     -- open, closed, merged
  pr_url VARCHAR(1000),
  head_sha VARCHAR(100),                     -- Commit SHA for deduplication
  base_branch VARCHAR(100) DEFAULT 'main',
  created_at TIMESTAMP DEFAULT NOW(),
  reviewed_at TIMESTAMP,
  
  -- For analytics
  review_time_seconds INTEGER,
  total_files_changed INTEGER,
  total_lines_added INTEGER,
  total_lines_deleted INTEGER
);
```

#### **reviews**
```sql
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pr_id UUID NOT NULL REFERENCES pull_requests(id),
  issue_type VARCHAR(100),  -- security, performance, best_practice, etc
  severity VARCHAR(50),     -- critical, high, medium, low, info
  issue_description TEXT,
  suggested_fix TEXT,
  file_path VARCHAR(500),   -- Path to file with issue
  line_number INTEGER,      -- Line number in diff
  ai_confidence FLOAT,      -- 0.0-1.0 (how sure is the AI)
  github_comment_id INTEGER, -- Track if it was posted to GitHub
  was_addressed BOOLEAN DEFAULT FALSE,  -- Did developer fix it?
  was_ignored BOOLEAN DEFAULT FALSE,    -- Developer dismissed it
  created_at TIMESTAMP DEFAULT NOW()
);
```

#### **usage_logs**
```sql
CREATE TABLE usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  action VARCHAR(100),  -- pr_reviewed, api_call, dashboard_view
  pr_id UUID REFERENCES pull_requests(id),
  gemini_tokens_used INTEGER,    -- For cost tracking
  cost_estimate_usd FLOAT,
  api_latency_ms INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_usage_logs_created_at ON usage_logs(created_at DESC);
```

---

## PART 4: GITHUB INTEGRATION DETAILS

### GitHub App Setup

#### **1. Create GitHub App**
```
Visit: https://github.com/settings/apps/new

Required fields:
- App name: ai-code-reviewer
- Homepage URL: https://your-domain.com
- Webhook URL: https://your-domain.com/api/webhook
- Webhook events: Pull request (checked)
- Permissions:
  ├─ Contents: Read-only (read code)
  ├─ Pull requests: Read & write (post reviews)
  └─ Metadata: Read-only

Save your:
- App ID (numeric, e.g., 123456)
- Client ID (alphanumeric)
- Client Secret (save securely in .env)
- Private key (download PEM file)
```

#### **2. Webhook Event Handling**

```javascript
// Route: /api/webhook
// Receives GitHub events

POST /api/webhook

Headers from GitHub:
- X-GitHub-Event: pull_request
- X-Hub-Signature-256: sha256=hmac_digest
- X-GitHub-Hook-ID: webhook_delivery_id

Body structure for pull_request event:
{
  "action": "opened",  // opened, synchronize, reopened
  "pull_request": {
    "id": 123456,
    "number": 42,
    "title": "Add new feature",
    "description": "...",
    "head": { "sha": "abc123def..." },
    "base": { "ref": "main" },
    "user": { "login": "username" },
    "repository": {
      "id": 789,
      "name": "repo-name",
      "full_name": "owner/repo-name"
    }
  },
  "installation": {
    "id": 987654  // Use this to get installation token
  }
}

Important events:
- "opened" → Initial analysis
- "synchronize" → New commits pushed → Re-analyze
- "reopened" → Closed PR reopened → Analyze again
```

#### **3. GitHub API Rate Limits**

```
Authenticated requests (per installation):
- Base: 5,000 requests/hour
- With 20+ repos: +50 req/hr per repo
- Max: 12,500 requests/hour (GitHub App)

Our usage per PR analysis:
1. Fetch PR metadata: 1 request
2. List changed files: 1 request
3. Get file content (per file): 1-5 requests (depends on files)
4. Post review comment: 1 request
5. Add inline suggestions: varies

Worst case: 50 files = ~60 requests/PR

Strategy:
- Cache recently analyzed PRs in Redis (1 hour TTL)
- Batch file fetches when possible
- Don't re-analyze if nothing changed
```

#### **4. Getting Installation Token**

```typescript
// You need this token to make API calls for a specific repo

import jwt from 'jsonwebtoken';

function getInstallationToken(installationId: number) {
  // Step 1: Create JWT
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: parseInt(process.env.GITHUB_APP_ID!),  // App ID
    iat: now,
    exp: now + 600  // 10 minute expiry
  };
  
  const privateKey = process.env.GITHUB_PRIVATE_KEY!;
  const token = jwt.sign(payload, privateKey, { algorithm: 'RS256' });
  
  // Step 2: Exchange JWT for installation token
  const response = await fetch(
    `https://api.github.com/app/installations/${installationId}/access_tokens`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }
    }
  );
  
  const data = await response.json();
  return data.token;  // Valid for 1 hour
}
```

#### **5. Fetching PR Diff**

```typescript
import { Octokit } from '@octokit/rest';

async function getPRDiff(
  owner: string,
  repo: string,
  prNumber: number,
  installationToken: string
) {
  const octokit = new Octokit({
    auth: installationToken
  });
  
  // Get list of files changed
  const { data: files } = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: prNumber
  });
  
  // For each file, get the patch (diff)
  const filesWithPatch = files.map(file => ({
    filename: file.filename,
    status: file.status,  // added, removed, modified
    additions: file.additions,
    deletions: file.deletions,
    patch: file.patch,  // The actual diff in unified format
    previousFilename: file.previous_filename  // If renamed
  }));
  
  return filesWithPatch;
}
```

---

## PART 5: GEMINI PRO 3 INTEGRATION (THE HEART OF YOUR SYSTEM)

### Why Gemini Pro 3?
```
✓ 32K context window (vs Claude's 100K, but good for PRs)
✓ Cheaper: $0.0005 per 1K input tokens vs Claude $0.003
✓ Fast: ~1-2 second latency (very responsive)
✓ Streaming: Stream long outputs token-by-token
✓ Great for code: Trained heavily on open-source code

Cost estimate:
- Average PR: 3000 input tokens + 500 output tokens
- Cost per PR: ~$0.0015-0.002
- 100 PRs/day: $0.15-0.20/day = $5/month per user
```

### Integration Code

```typescript
import { VertexAI } from '@google-cloud/vertexai';

const vertexAI = new VertexAI({
  project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
  location: 'us-central1'  // Must be us-central1 for Gemini
});

async function analyzeCodeWithGemini(
  codePatch: string,
  fileName: string,
  fileLanguage: string
) {
  const model = vertexAI.getGenerativeModel({
    model: 'gemini-1.5-pro'
  });
  
  const prompt = `
You are a senior code reviewer. Analyze this code change and identify issues.

FILE: ${fileName}
LANGUAGE: ${fileLanguage}

CODE DIFF:
\`\`\`diff
${codePatch}
\`\`\`

Format your response as JSON array:
[
  {
    "issue": "Brief description",
    "severity": "critical|high|medium|low",
    "file": "${fileName}",
    "line_number": <estimated>,
    "suggestion": "How to fix",
    "confidence": <0.0-1.0>
  }
]

Be precise. Only flag important issues.
`;

  const stream = await model.generateContentStream({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: {
      maxOutputTokens: 2048,
      temperature: 0.1  // Lower temp = more deterministic
    },
    safetySettings: []  // Code review, no content filtering needed
  });
  
  let fullResponse = '';
  
  for await (const chunk of stream.stream) {
    if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
      fullResponse += chunk.candidates[0].content.parts[0].text;
      // Process chunks as they arrive (useful for UI updates)
    }
  }
  
  try {
    const issues = JSON.parse(fullResponse);
    return issues;
  } catch {
    console.error('Failed to parse Gemini response');
    return [];
  }
}
```

### Prompt Engineering for Better Results

```javascript
// DON'T do this:
const badPrompt = "Review this code";

// DO this:
const goodPrompt = `
You are a senior code reviewer with 10+ years experience.

TASK: Review this pull request code diff and identify issues.

FOCUS AREAS (in order of importance):
1. Security vulnerabilities (hardcoded secrets, injection risks, auth issues)
2. Performance problems (N+1 queries, inefficient algorithms)
3. Best practices (error handling, logging, documentation)
4. Code style (naming, complexity, readability)

FILE: ${fileName}
LANGUAGE: ${fileLanguage}
CONTEXT: This is adding a new feature to a banking application

CODE DIFF:
[code here]

CONSTRAINTS:
- Only flag issues that will make it to PR review comments
- Avoid nitpicking style issues
- Be specific about the problem and solution
- Include approximate line numbers

FORMAT: JSON array with fields: issue, severity, suggestion, line_number, confidence

Analyze deeply.`;
```

### Handling Large Files

```typescript
// If a file is > 4K tokens, split it:

function splitCodeIntoDiff(code: string, maxTokens: number = 3000) {
  const lines = code.split('\n');
  const chunks: string[] = [];
  let currentChunk = '';
  
  for (const line of lines) {
    const estimatedTokens = currentChunk.split(' ').length / 4;  // Rough estimate
    
    if (estimatedTokens > maxTokens && currentChunk) {
      chunks.push(currentChunk);
      currentChunk = line + '\n';
    } else {
      currentChunk += line + '\n';
    }
  }
  
  if (currentChunk) chunks.push(currentChunk);
  return chunks;
}

// Then analyze each chunk separately
```

---

## PART 6: API SPECIFICATIONS

### User Endpoints

#### **1. GET /api/user**
```
Get current authenticated user profile

Response:
{
  "id": "user_uuid",
  "email": "user@example.com",
  "github_handle": "username",
  "avatar_url": "https://...",
  "subscription_tier": "free|team|enterprise",
  "reviews_used_this_month": 5,
  "reviews_limit": 3 (free tier) | unlimited (team),
  "created_at": "2025-01-15T..."
}
```

#### **2. GET /api/reviews**
```
Get user's review history

Query params:
- page: integer (1, 2, 3...)
- limit: integer (10, 25, 50)
- status: open|closed|merged
- sort: created_at|severity|repository

Response:
{
  "data": [
    {
      "id": "review_uuid",
      "pr_number": 42,
      "repository": "owner/repo",
      "title": "Add new feature",
      "severity": "high",
      "issues_count": 3,
      "created_at": "2025-01-15T10:00:00Z",
      "review_status": "pending|completed"
    }
  ],
  "pagination": {
    "total": 145,
    "page": 1,
    "limit": 10
  }
}
```

#### **3. GET /api/reviews/:reviewId**
```
Get detailed review results

Response:
{
  "id": "review_uuid",
  "pr_number": 42,
  "repository": "owner/repo",
  "pr_url": "https://github.com/...",
  "analysis_time_ms": 2500,
  "total_issues": 5,
  "issues": [
    {
      "id": "issue_uuid",
      "file": "src/auth.ts",
      "line": 42,
      "severity": "critical",
      "issue": "Hardcoded API key exposed",
      "suggestion": "Use environment variables",
      "confidence": 0.95,
      "status": "addressed|ignored|pending"
    }
  ],
  "cost_estimate_usd": 0.0015
}
```

### Admin Endpoints (Team Tier)

#### **4. POST /api/installations/settings**
```
Update review settings for a repo

Body:
{
  "installation_id": 12345,
  "enable_security_scan": true,
  "enable_performance_scan": true,
  "enable_style_review": false,
  "min_severity": "medium",  // Don't flag "low" issues
  "custom_rules": [
    {
      "name": "no_console_logs",
      "pattern": "console\\.(log|warn|error)",
      "message": "Remove console statements in production"
    }
  ],
  "slack_webhook": "https://hooks.slack.com/..."  // For notifications
}

Response:
{
  "status": "success",
  "settings_updated": true
}
```

### Webhook Endpoints

#### **5. POST /api/webhook**
```
GitHub webhook receiver

Headers to validate:
- X-Hub-Signature-256: sha256=<hmac_digest>
- X-GitHub-Event: pull_request
- X-GitHub-Delivery: UUID for idempotency

Body: GitHub pull_request webhook payload

Steps:
1. Verify signature
2. Check idempotency (Redis cache)
3. Queue to Bull
4. Return 202 (Accepted) immediately

Function should NOT wait for analysis.
Analysis happens in background job.
```

### Internal Endpoints (For Monitoring)

#### **6. GET /api/health**
```
Health check for uptime monitoring

Response:
{
  "status": "ok",
  "database": "connected",
  "redis": "connected",
  "gemini_api": "ok",
  "uptime_seconds": 345600,
  "queue_depth": 12
}
```

#### **7. GET /api/metrics**
```
Current system metrics

Response:
{
  "prs_analyzed_today": 1234,
  "prs_analyzing_now": 3,
  "avg_analysis_time_ms": 2100,
  "error_rate_percent": 0.5,
  "cost_today_usd": 2.45,
  "gemini_tokens_used": 1203000
}
```

---

## PART 7: AUTHENTICATION & AUTHORIZATION FLOW

### Complete Auth Flow with Clerk

```
1. USER VISITS APP
   ↓ (Not authenticated)
   → Redirect to Clerk sign-in page
   → User signs up with email or GitHub OAuth
   → Clerk creates user account
   
2. CLERK CREATES USER
   → Sends user data to your app via webhook (optional)
   → You create record in PostgreSQL users table
   → Store clerk_id in users table
   
3. USER LOGS IN
   → Clerk provides session JWT
   → Store JWT in HTTP-only cookie
   → Send JWT in Authorization header for API calls
   
4. YOUR APP HANDLES GITHUB OAUTH
   → NOT via Clerk's GitHub OAuth
   → Instead: Direct GitHub OAuth in your app
   → User clicks "Connect GitHub"
   → GitHub OAuth flow → Get GitHub access token
   → Store encrypted in PostgreSQL
   
5. AUTHORIZATION CHECK
   → On each request, verify:
     a) Valid Clerk JWT?
     b) User subscription tier?
     c) Review limit reached?
     d) GitHub token still valid?
```

### Implementation

```typescript
// middleware.ts - Runs on every request
import { clerkMiddleware } from '@clerk/nextjs/server';

export const middleware = clerkMiddleware({
  publicRoutes: [
    '/',           // Home page
    '/pricing',    // Pricing page
    '/api/webhook' // GitHub webhooks (verify differently)
  ]
});

export const config = {
  matcher: ['/((?!_next|.*\\.png).*)']
};

// app/api/reviews/route.ts - Protected endpoint
import { auth } from '@clerk/nextjs/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  
  if (!userId) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get user from DB
  const user = await db.users.findUnique({
    where: { clerk_id: userId }
  });
  
  // Check subscription
  if (user.reviews_used_this_month >= user.reviews_limit) {
    return Response.json(
      { error: 'Review limit reached' },
      { status: 429 }
    );
  }
  
  // Proceed with request...
}
```

---

## PART 8: DEPLOYMENT & INFRASTRUCTURE

### Vercel Deployment (Recommended)

```bash
# Step 1: Push code to GitHub
git push origin main

# Step 2: Connect to Vercel
# Visit https://vercel.com/new
# Select GitHub repo
# Connect

# Step 3: Environment variables
CLERK_SECRET_KEY=***
GITHUB_APP_ID=***
GITHUB_PRIVATE_KEY=***
GITHUB_WEBHOOK_SECRET=***
DATABASE_URL=postgresql://...  # From Vercel Postgres
REDIS_URL=redis://...          # From Upstash
GOOGLE_CLOUD_PROJECT_ID=***
GOOGLE_APPLICATION_CREDENTIALS={...}
STRIPE_SECRET_KEY=***
STRIPE_WEBHOOK_SECRET=***

# Step 4: Deploy
# Vercel auto-deploys on push
```

### Environment Variables Setup

```bash
# .env.local (development)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_***
CLERK_SECRET_KEY=sk_test_***
CLERK_WEBHOOK_SECRET=whsec_test_***

GITHUB_APP_ID=123456
GITHUB_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n..."
GITHUB_WEBHOOK_SECRET=whsec_***

DATABASE_URL=postgresql://user:pass@localhost:5432/db
REDIS_URL=redis://localhost:6379

GOOGLE_CLOUD_PROJECT_ID=my-project
GOOGLE_APPLICATION_CREDENTIALS='{"type":"service_account",...}'

STRIPE_SECRET_KEY=sk_test_***
STRIPE_PUBLISHABLE_KEY=pk_test_***

NODE_ENV=development
```

### Database Initialization (One-time)

```bash
# Using Vercel Postgres CLI
vercel postgres connect

# Run SQL from Part 3 (Database Schema)
# CREATE TABLE users;
# CREATE TABLE github_app_installations;
# CREATE TABLE pull_requests;
# CREATE TABLE reviews;
# CREATE TABLE usage_logs;

# Add indexes for performance
CREATE INDEX idx_users_clerk_id ON users(clerk_id);
CREATE INDEX idx_pull_requests_pr_sha ON pull_requests(head_sha);
CREATE INDEX idx_reviews_pr_id ON reviews(pr_id);
```

### Background Jobs Setup (Bull + Redis)

```typescript
// lib/queue.ts
import Queue from 'bull';
import Redis from 'ioredis';

const redis = new Redis(process.env.REDIS_URL!);

export const prReviewQueue = new Queue('pr-reviews', {
  redis: {
    host: process.env.REDIS_HOST,
    port: parseInt(process.env.REDIS_PORT!),
    password: process.env.REDIS_PASSWORD
  },
  defaultJobOptions: {
    attempts: 3,           // Retry 3 times on failure
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: true  // Auto-remove successful jobs
  }
});

// Process queue (runs as separate service on Vercel)
prReviewQueue.process(5, async (job) => {
  const { owner, repo, prNumber, installationId } = job.data;
  
  // Actual analysis happens here
  return await analyzePR(owner, repo, prNumber, installationId);
});

prReviewQueue.on('failed', (job, error) => {
  console.error(`Job ${job.id} failed:`, error);
  // Track failed reviews in DB
});
```

---

## PART 9: MONITORING & ANALYTICS

### Key Metrics to Track

```typescript
// events.ts
import { track } from '@/lib/analytics';

// When user signs up
track('user_signup', {
  user_id: userId,
  subscription_tier: 'free',
  signup_date: new Date(),
  source: 'product_hunt' | 'github' | 'twitter'
});

// When PR is analyzed
track('pr_analyzed', {
  user_id: userId,
  pr_id: prId,
  repository: 'owner/repo',
  files_changed: 5,
  issues_found: 3,
  analysis_time_ms: 2100,
  gemini_tokens: 2500
});

// When user upgrades
track('subscription_upgraded', {
  user_id: userId,
  from_tier: 'free',
  to_tier: 'team',
  revenue: 30
});

// When review is fixed
track('review_addressed', {
  user_id: userId,
  issue_id: issueId,
  time_to_fix_hours: 2.5,
  severity: 'high'
});
```

### Sentry Error Tracking

```typescript
// instrumentation.ts
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,  // 10% of requests
  beforeSend(event) {
    // Don't send error if it's a known issue
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.value?.includes('Rate limited')) {
        return null;  // Filter out rate limit errors
      }
    }
    return event;
  }
});

// Automatic breadcrumb tracking
// Sentry tracks: API calls, console logs, network requests
```

### Custom Dashboards

```typescript
// GET /api/dashboard/stats
// Returns data for admin dashboard

{
  "today": {
    "prs_analyzed": 1234,
    "issues_found": 4521,
    "users_active": 234,
    "revenue": 1250,
    "cost_gemini": 2.45,
    "profit": 1247.55
  },
  "week": { ... },
  "month": { ... },
  "key_metrics": {
    "pr_success_rate": 98.5,
    "avg_analysis_time_ms": 2100,
    "gemini_cost_per_pr": 0.002,
    "customer_retention": 92
  }
}
```

---

## PART 10: SECURITY CONSIDERATIONS

### Secret Management

```bash
# .env.local is in .gitignore (NEVER commit secrets)
.env.local
.env.*.local
*.pem

# Use Vercel's Secrets tab for production
CLERK_SECRET_KEY (never in code)
GITHUB_PRIVATE_KEY (never in code)
STRIPE_SECRET_KEY (never in code)

# Encrypt sensitive data in DB
// Before storing: encrypt(github_token, encryption_key)
// After fetching: decrypt(encrypted_token, encryption_key)

import crypto from 'crypto';

function encryptToken(token: string, key: string): string {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted;
}

function decryptToken(encrypted: string, key: string): string {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}
```

### API Security

```typescript
// 1. GitHub Webhook Signature Verification
import crypto from 'crypto';

function verifyGitHubSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const computed = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(computed),
    Buffer.from(signature)
  );
}

// 2. Rate Limiting (prevent abuse)
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window
  keyGenerator: (req) => req.user?.id || req.ip,
  skip: (req) => req.user?.subscription_tier === 'enterprise'  // Don't limit enterprise
});

// 3. CORS Configuration
const corsOptions = {
  origin: [
    'https://yourdomain.com',
    'https://app.yourdomain.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// 4. Request Validation with Zod
import { z } from 'zod';

const webhookSchema = z.object({
  action: z.enum(['opened', 'synchronize', 'reopened']),
  pull_request: z.object({
    number: z.number(),
    title: z.string(),
    repository: z.object({
      name: z.string(),
      full_name: z.string()
    })
  }),
  installation: z.object({
    id: z.number()
  })
});

// Validate before processing
const validated = webhookSchema.parse(payload);
```

### Data Privacy

```typescript
// 1. Only store minimum necessary data
// Don't store: Full source code (only diffs)
// Don't store: User API keys (use GitHub token)

// 2. Auto-delete old data
const DELETE_REVIEWS_AFTER_DAYS = 90;

async function cleanupOldReviews() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - DELETE_REVIEWS_AFTER_DAYS);
  
  await db.reviews.deleteMany({
    where: {
      created_at: { lt: cutoffDate }
    }
  });
}

// Run daily
setInterval(cleanupOldReviews, 24 * 60 * 60 * 1000);

// 3. Respect GDPR right to deletion
export async function deleteUserData(userId: string) {
  // Delete all user's data
  await db.users.delete({ where: { id: userId } });
  await db.pull_requests.deleteMany({ where: { author_id: userId } });
  await db.reviews.deleteMany({
    where: {
      pull_requests: { author_id: userId }
    }
  });
}
```

---

## PART 11: CONFIGURATION CHECKLIST FOR GEMINI VIBE CODING

### Pre-Build Checklist

- [ ] **Clerk Account Created**
  - [ ] Clerk app created
  - [ ] Get CLERK_SECRET_KEY & CLERK_PUBLISHABLE_KEY
  - [ ] Enable GitHub OAuth
  
- [ ] **GitHub App Created**
  - [ ] Get GITHUB_APP_ID, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET
  - [ ] Download Private Key (.pem)
  - [ ] Set Webhook URL to your Vercel domain
  
- [ ] **Google Cloud Setup**
  - [ ] Create Google Cloud project
  - [ ] Enable Vertex AI API
  - [ ] Create service account with Vertex AI permissions
  - [ ] Download service account JSON key
  
- [ ] **Stripe Setup**
  - [ ] Create Stripe account
  - [ ] Create 3 price tiers (free/team/enterprise)
  - [ ] Get STRIPE_SECRET_KEY
  - [ ] Create webhook for subscriptions
  
- [ ] **Database Setup**
  - [ ] Vercel Postgres created
  - [ ] DATABASE_URL obtained
  - [ ] Tables created (from schema above)
  
- [ ] **Redis Setup**
  - [ ] Upstash Redis created
  - [ ] REDIS_URL obtained
  - [ ] Bull queue configured

---

## PART 12: QUICK START WITH GEMINI PRO 3

### Minimal Viable Vibe Code

```typescript
// app/api/webhook/route.ts - The core
import { NextRequest } from 'next/server';
import { Octokit } from '@octokit/rest';
import { VertexAI } from '@google-cloud/vertexai';

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  if (body.action !== 'opened') return Response.json({ ok: true });
  
  const { pull_request, installation } = body;
  const { owner, repo } = pull_request.head.repo;
  
  try {
    // Get GitHub token
    const token = await getInstallationToken(installation.id);
    const octokit = new Octokit({ auth: token });
    
    // Get files
    const { data: files } = await octokit.pulls.listFiles({
      owner: owner.login,
      repo: repo.name,
      pull_number: pull_request.number
    });
    
    // Analyze with Gemini
    const vertexAI = new VertexAI({
      project: process.env.GOOGLE_CLOUD_PROJECT_ID!,
      location: 'us-central1'
    });
    
    const model = vertexAI.getGenerativeModel({
      model: 'gemini-1.5-pro'
    });
    
    // Analyze first 5 files
    let allIssues = [];
    for (const file of files.slice(0, 5)) {
      if (!file.patch) continue;
      
      const response = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [{
            text: `Review this code:\n\`\`\`\n${file.patch}\n\`\`\`\n\nReturn JSON with issues.`
          }]
        }],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.1
        }
      });
      
      const text = response.response.candidates?.[0]?.content?.parts?.[0]?.text || '';
      try {
        allIssues = [...allIssues, ...JSON.parse(text)];
      } catch {}
    }
    
    // Post to GitHub
    if (allIssues.length > 0) {
      await octokit.pulls.createReview({
        owner: owner.login,
        repo: repo.name,
        pull_number: pull_request.number,
        event: 'COMMENT',
        body: `## 🤖 AI Review Found ${allIssues.length} issues`
      });
    }
    
    return Response.json({ ok: true });
  } catch (error) {
    console.error(error);
    return Response.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
```

---

## END OF TECHNICAL DOCUMENTATION

This document contains everything needed for production.
Use this as your reference while vibe coding with Gemini Pro 3.

**Key Takeaway**: This is not just code - it's a complete production system.
Every service choice is deliberate. Every detail matters for scale.