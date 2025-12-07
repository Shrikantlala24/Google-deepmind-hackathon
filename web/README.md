## AI Code Reviewer – Next.js Shell

This `web/` workspace is the executable surface for the Gemini Pro 3–powered pull request reviewer described throughout the research docs in this repository. It ships with:

- Next.js 14 (App Router) running on Vercel Functions
- Clerk authentication middleware
- GitHub webhook endpoint that verifies signatures and queues PR jobs
- BullMQ queue + Redis client placeholder
- Vertex AI (Gemini Pro 3) helper for diff analysis
- Health endpoint + onboarding dashboard that mirrors the technical documentation

## Local Development

1. Copy environment variables:

	```bash
	cd web
	cp .env.example .env.local
	```

2. Populate `.env.local` with the secrets generated while following `Research Documentation/service_setup_guide.md`.

3. Install dependencies (already done in this commit, but run again if needed):

	```bash
	npm install
	```

4. Start the dev server:

	```bash
	npm run dev
	```

The dashboard at [http://localhost:3000](http://localhost:3000) highlights which services are configured and links back to the extensive technical specs.

## Key Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Next.js dev server with Clerk + webhook routes |
| `npm run build` | Production build (will fail if required env vars are missing) |
| `npm run start` | Start the production server locally |

Queue workers and background processors will live in `/workers` (to be scaffolded next); they will reuse the helpers under `lib/`.

## Architecture Snapshot

- `app/api/webhooks/github/route.ts` – verifies GitHub signatures and enqueues PR analysis jobs
- `lib/queue.ts` – BullMQ queue factory + helper for the pull request pipeline
- `lib/github/*.ts` – Octokit + webhook utilities for installation tokens and signature validation
- `lib/ai/gemini.ts` – thin Vertex AI wrapper for Gemini Pro 3 prompts
- `lib/env.ts` – type-safe environment loader used across server modules

Before deploying to Vercel, confirm `/api/health` returns `status: ok` and that Redis credentials are wired so queue jobs can be created when webhooks arrive.
