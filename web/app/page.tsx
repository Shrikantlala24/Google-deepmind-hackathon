import { env } from "@/lib/env";

const DOCS_BASE_URL =
  "https://github.com/Shrikantlala24/README/tree/main/Google-deepmind-hackathon/Research%20Documentation";

const serviceChecklist = [
  {
    name: "GitHub App Webhook",
    description: "Required to verify X-Hub-Signature-256 and enqueue PR jobs.",
    ready: Boolean(env.GITHUB_WEBHOOK_SECRET),
    doc: `${DOCS_BASE_URL}/service_setup_guide.md`,
  },
  {
    name: "Gemini Pro 3 Credentials",
    description: "Needed for Vertex AI access when diff chunks are analyzed.",
    ready:
      Boolean(env.GOOGLE_CLOUD_PROJECT_ID) &&
      Boolean(env.GOOGLE_APPLICATION_CREDENTIALS_JSON),
    doc: `${DOCS_BASE_URL}/technical_specs.md`,
  },
  {
    name: "Redis + Bull Queue",
    description: "Stores pull-request jobs for async processing.",
    ready: Boolean(env.REDIS_URL),
    doc: `${DOCS_BASE_URL}/service_setup_guide.md#5.-UPSTASH-REDIS-SETUP-(Cache-&-Queue)`,
  },
  {
    name: "Clerk Publishable Key",
    description: "Enables secure dashboard auth + GitHub identity linkage.",
    ready: Boolean(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY),
    doc: `${DOCS_BASE_URL}/service_setup_guide.md#1.-CLERK.COM-SETUP-(Authentication)`,
  },
];

const buildPlan = [
  {
    title: "01 · Wire the webhooks",
    detail: "Set secrets, point GitHub App at /api/webhooks/github, and confirm health pings.",
  },
  {
    title: "02 · Queue & analyze",
    detail: "Fetch PR diffs, chunk payloads, call Gemini, and persist structured feedback.",
  },
  {
    title: "03 · Ship the dashboard",
    detail: "Expose review history, rule success metrics, and Stripe-powered upgrades.",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-slate-100">
      <div className="mx-auto flex max-w-5xl flex-col gap-10">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-10 shadow-2xl shadow-slate-900/40 backdrop-blur">
          <p className="text-sm uppercase tracking-[0.35em] text-slate-400">
            Gemini Pro 3 • BullMQ • Clerk
          </p>
          <h1 className="mt-6 text-4xl font-semibold leading-tight text-white sm:text-5xl">
            Ship the AI code reviewer faster than a manual spec could.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-slate-200">
            All five reference documents already live in the repo. Plug secrets into your
            <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[0.85em]">.env.local</code>
            file, let Gemini scaffold the remaining modules, and keep this dashboard open as the control tower.
          </p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {buildPlan.map((item) => (
              <div key={item.title} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  {item.title}
                </p>
                <p className="mt-2 text-sm text-slate-200">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-slate-900/40 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-400">Foundational services</p>
              <h2 className="mt-2 text-2xl font-semibold text-white">Environment checklist</h2>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-4 py-1 text-xs font-semibold tracking-wide text-emerald-200">
              {serviceChecklist.filter((service) => service.ready).length}/{serviceChecklist.length} ready
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {serviceChecklist.map((service) => (
              <article
                key={service.name}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:border-white/30"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{service.name}</h3>
                    <p className="text-sm text-slate-300">{service.description}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      service.ready
                        ? "border border-emerald-300/40 bg-emerald-400/10 text-emerald-200"
                        : "border border-amber-300/40 bg-amber-400/10 text-amber-100"
                    }`}
                  >
                    {service.ready ? "Configured" : "Pending"}
                  </span>
                </div>
                <div className="mt-4 text-sm">
                  <a
                    href={service.doc}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-sky-200 underline-offset-4 hover:underline"
                  >
                    Open documentation ↗
                  </a>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-3xl border border-white/5 bg-slate-900/60 p-8">
          <h2 className="text-2xl font-semibold text-white">Next actions</h2>
          <ol className="mt-6 space-y-4 text-slate-200">
            <li>
              <span className="font-semibold text-white">1.</span> Duplicate
              <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[0.85em]">.env.example</code>
              → <code className="rounded bg-white/10 px-1 py-0.5 text-[0.85em]">.env.local</code> and paste credentials from the service setup guide.
            </li>
            <li>
              <span className="font-semibold text-white">2.</span> Run the Gemini prompt from
              <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[0.85em]">technical_specs.md</code> to scaffold the analysis worker + Prisma models.
            </li>
            <li>
              <span className="font-semibold text-white">3.</span> Start Vercel dev server with
              <code className="mx-1 rounded bg-white/10 px-1 py-0.5 text-[0.85em]">npm run dev</code>
              and create a test PR to watch the webhook logs stream in.
            </li>
          </ol>
        </section>
      </div>
    </main>
  );
}
